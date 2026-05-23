/**
 * @superagentskill/sdk — typed client for the Super Agent Skill MCP server.
 *
 *   import { SuperAgentSkill } from "@superagentskill/sdk";
 *
 *   const sas = new SuperAgentSkill({ token: process.env.SAS_TOKEN });
 *   const out = await sas.call("search_registry", { query: "cardiology" });
 *   //   ^? typed as SearchRegistryOutput
 *
 * Why a thin SDK and not a giant framework? Because the MCP endpoint is
 * already JSON-RPC over HTTP and the friction is in three things:
 *   1. Headers (`Accept: application/json, text/event-stream` — a 406
 *      footgun every new caller hits at least once).
 *   2. Auth (Bearer header + the unauthorized hint payload format).
 *   3. Retries (network blips + 429s with Retry-After, plus the
 *      idempotency_key contract for write tools so retries don't
 *      double-upload).
 *
 * This SDK handles all three, plus parses the rate-limit headers into
 * an object you can read after every call (`sas.lastRateLimit`).
 */
import {
  MCPError,
  MCPRateLimitedError,
  MCPUnauthorizedError,
  ToolInput,
  ToolName,
  ToolOutput,
  type RateLimitInfo,
} from "./types.js";

export * from "./types.js";

export type SuperAgentSkillOptions = {
  /** Bearer token (personal access token or OAuth access token). Required for write tools. */
  token?: string;
  /** Override the endpoint. Defaults to the public hosted server. */
  endpoint?: string;
  /** Custom fetch (e.g. for tests or for environments without global fetch). */
  fetch?: typeof fetch;
  /**
   * Max retry attempts on 5xx / 429 / network errors. Each retry waits
   * `Retry-After` if present, otherwise exponential backoff.
   * Default: 3. Set to 0 to disable.
   */
  maxRetries?: number;
  /** Initial backoff in ms (doubled each retry). Default 500. */
  backoffMs?: number;
  /** User-Agent suffix. Default reports SDK version. */
  userAgentSuffix?: string;
};

const DEFAULT_ENDPOINT = "https://superagentskill.com/api/mcp";
const VERSION = "0.1.0";

export class SuperAgentSkill {
  private readonly endpoint: string;
  private readonly token: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly userAgent: string;
  /** Populated after every successful call. */
  public lastRateLimit: RateLimitInfo = {};

  constructor(opts: SuperAgentSkillOptions = {}) {
    this.endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
    this.token = opts.token;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error(
        "SuperAgentSkill: no fetch() available in this environment. Pass `fetch` in options.",
      );
    }
    this.maxRetries = opts.maxRetries ?? 3;
    this.backoffMs = opts.backoffMs ?? 500;
    this.userAgent =
      `@superagentskill/sdk/${VERSION}` +
      (opts.userAgentSuffix ? ` ${opts.userAgentSuffix}` : "");
  }

  /**
   * Call any MCP tool by name. Output is typed via the ToolMap.
   *
   *   await sas.call("search_registry", { query: "cold outreach" });
   */
  async call<T extends ToolName>(
    name: T,
    args: ToolInput<T>,
    init: { signal?: AbortSignal } = {},
  ): Promise<ToolOutput<T>> {
    const body = {
      jsonrpc: "2.0",
      id: cryptoId(),
      method: "tools/call",
      params: { name, arguments: args },
    };
    const raw = await this.rawRequest(body, init);
    // MCP tools/call results come back as `{ content: [{ type: "text", text: <json> }] }`
    const content = raw?.result?.content;
    if (Array.isArray(content) && content[0]?.type === "text") {
      const text = content[0].text as string;
      try {
        return JSON.parse(text) as ToolOutput<T>;
      } catch {
        return text as unknown as ToolOutput<T>;
      }
    }
    return raw?.result as ToolOutput<T>;
  }

  /** List every tool the server exposes (with JSON schemas). */
  async listTools(init: { signal?: AbortSignal } = {}): Promise<unknown> {
    const r = await this.rawRequest(
      { jsonrpc: "2.0", id: cryptoId(), method: "tools/list" },
      init,
    );
    return r?.result;
  }

  /** MCP `initialize` lifecycle call — exposes server `instructions` field. */
  async initialize(init: { signal?: AbortSignal } = {}): Promise<unknown> {
    const r = await this.rawRequest(
      {
        jsonrpc: "2.0",
        id: cryptoId(),
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "@superagentskill/sdk", version: VERSION },
        },
      },
      init,
    );
    return r?.result;
  }

  /** Hit the public health endpoint. Useful for status dashboards. */
  async health(init: { signal?: AbortSignal } = {}): Promise<unknown> {
    const url = this.endpoint.replace(/\/?$/, "") + "/health";
    const res = await this.fetchImpl(url, { method: "GET", signal: init.signal });
    return res.json();
  }

  // ------------------ Internals -----------------------------------------

  private async rawRequest(
    body: unknown,
    init: { signal?: AbortSignal },
  ): Promise<any> {
    let attempt = 0;
    let lastErr: unknown = null;
    while (attempt <= this.maxRetries) {
      try {
        const res = await this.fetchImpl(this.endpoint, {
          method: "POST",
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
          signal: init.signal,
        });
        this.absorbRateLimit(res);

        if (res.status === 401) {
          const data = await safeJson(res);
          throw new MCPUnauthorizedError(
            data?.error?.message ?? "Unauthorized",
            data?.error?.data,
          );
        }
        if (res.status === 429) {
          const retryAfter = parseRetryAfter(res);
          if (attempt < this.maxRetries) {
            await sleep(retryAfter * 1000);
            attempt++;
            continue;
          }
          const data = await safeJson(res);
          throw new MCPRateLimitedError(
            data?.error?.message ?? "Rate limited",
            retryAfter,
            data?.error?.data,
          );
        }
        if (res.status >= 500 && attempt < this.maxRetries) {
          await sleep(this.backoffMs * Math.pow(2, attempt));
          attempt++;
          continue;
        }
        const text = await res.text();
        const parsed = text ? tryParse(text) : null;
        if (!res.ok) {
          throw new MCPError(parsed?.error?.message ?? `HTTP ${res.status}`, {
            code: parsed?.error?.code ?? -32000,
            status: res.status,
            data: parsed?.error?.data,
          });
        }
        if (parsed?.error) {
          throw new MCPError(parsed.error.message ?? "tool_error", {
            code: parsed.error.code ?? -32000,
            status: 200,
            data: parsed.error.data,
          });
        }
        return parsed;
      } catch (e) {
        lastErr = e;
        // Retry only network-level errors. MCPError / MCPUnauthorizedError / MCPRateLimitedError
        // should bubble up.
        if (
          e instanceof MCPError ||
          e instanceof MCPUnauthorizedError ||
          e instanceof MCPRateLimitedError
        ) {
          throw e;
        }
        if (attempt >= this.maxRetries) throw e;
        await sleep(this.backoffMs * Math.pow(2, attempt));
        attempt++;
      }
    }
    throw lastErr ?? new Error("unknown error");
  }

  private buildHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": this.userAgent,
    };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  private absorbRateLimit(res: Response) {
    const limit = res.headers.get("X-RateLimit-Limit");
    const remaining = res.headers.get("X-RateLimit-Remaining");
    const reset = res.headers.get("X-RateLimit-Reset");
    const window_ = res.headers.get("X-RateLimit-Window");
    if (limit || remaining || reset) {
      this.lastRateLimit = {
        limit: limit != null ? Number(limit) : undefined,
        remaining: remaining != null ? Number(remaining) : undefined,
        resetAtUnix: reset != null ? Number(reset) : undefined,
        window: window_ ?? undefined,
      };
    }
  }
}

// ------------------ Helpers -------------------------------------------

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(res: Response): number {
  const ra = res.headers.get("Retry-After");
  if (!ra) return 1;
  const n = Number(ra);
  if (Number.isFinite(n)) return Math.max(0, n);
  const date = Date.parse(ra);
  if (!Number.isNaN(date)) return Math.max(0, Math.floor((date - Date.now()) / 1000));
  return 1;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function tryParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Convenience: generate a stable idempotency_key for a logical write
 * operation. Pass anything that uniquely identifies the action — a
 * file hash, a user-action UUID, the SHA of the local repo state, etc.
 *
 *   const key = idempotencyKey([filePath, sha256(content)]);
 *   await sas.call("upload_packages", { files: [...], idempotency_key: key });
 */
export function idempotencyKey(parts: ReadonlyArray<string | number>): string {
  const joined = parts.map((p) => String(p)).join(":");
  // 24-char prefix + djb2 hash → stable, short, no crypto dep needed.
  let hash = 5381;
  for (let i = 0; i < joined.length; i++) {
    hash = ((hash << 5) + hash + joined.charCodeAt(i)) | 0;
  }
  return `sas-idem-${joined.slice(0, 24).replace(/[^a-zA-Z0-9_-]/g, "_")}-${(hash >>> 0).toString(36)}`;
}
