import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export type AuthKind = "oauth2" | "api_key" | "bearer" | "basic" | "none";
export type SideEffect = "read" | "write" | "destructive";

export interface IntegrationAction {
  id: string;
  name: string;
  description?: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  base_url?: string;
  path: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  side_effect?: SideEffect;
}

export interface Integration {
  slug: string;
  name: string;
  type: "integration";
  version: string;
  provider: string;
  description: string;
  homepage?: string;
  auth: {
    kind: AuthKind;
    oauth2?: { authorize_url: string; token_url: string; scopes?: string[]; pkce?: boolean };
    api_key?: { header?: string; query_param?: string; env_hint?: string };
  };
  actions: IntegrationAction[];
  events?: Array<{ id: string; name: string; webhook_path?: string }>;
  required_scopes?: string[];
  tags?: string[];
  license: string;
  authors: string[];
}

// Lazily resolve the content dir. `new URL(..., import.meta.url)` throws
// "Invalid URL string." inside the bundled Cloudflare Worker because
// import.meta.url is not a usable base there. Resolving it eagerly at module
// init would crash SSR for every request that imports this file.
function resolveDefaultDir(): string {
  try {
    return new URL("../../../content/integrations/", import.meta.url).pathname;
  } catch {
    return "";
  }
}

let cache: Map<string, Integration> | null = null;

export function loadIntegrations(dir?: string): Map<string, Integration> {
  dir = dir ?? resolveDefaultDir();
  if (cache) return cache;
  const out = new Map<string, Integration>();
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { /* no dir yet */ }
  for (const entry of entries) {
    if (!/\.ya?ml$/i.test(entry) || entry.startsWith("_")) continue;
    const full = join(dir, entry);
    if (!statSync(full).isFile()) continue;
    const integ = parseYaml(readFileSync(full, "utf8")) as Integration;
    if (!integ || integ.type !== "integration") continue;
    out.set(integ.slug, integ);
  }
  cache = out;
  return out;
}

export function getIntegration(slug: string): Integration | undefined {
  return loadIntegrations().get(slug);
}

export function getAction(slug: string, actionId: string): IntegrationAction | undefined {
  return getIntegration(slug)?.actions.find((a) => a.id === actionId);
}

export interface InstalledIntegration {
  workspace_id: string;
  integration_slug: string;
  credentials: { access_token?: string; api_key?: string; refresh_token?: string };
  granted_scopes?: string[];
}

export interface ExecuteOptions {
  /** Skip destructive actions unless explicitly allowed. Default true. */
  protectDestructive?: boolean;
  /** Workspace-anonymized hash for telemetry. */
  workspaceHash?: string;
  /** Optional fetch implementation (for tests). */
  fetchImpl?: typeof fetch;
}

export class IntegrationError extends Error {
  code: string;
  details?: unknown;
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function executeAction(args: {
  install: InstalledIntegration;
  action_id: string;
  inputs: Record<string, unknown>;
  options?: ExecuteOptions;
}): Promise<{ status: number; body: unknown; side_effect: SideEffect }> {
  const integ = getIntegration(args.install.integration_slug);
  if (!integ) throw new IntegrationError(`integration not found: ${args.install.integration_slug}`, "NOT_FOUND");
  const action = integ.actions.find((a) => a.id === args.action_id);
  if (!action) throw new IntegrationError(`action not found: ${args.action_id}`, "NOT_FOUND");

  const opts: Required<Pick<ExecuteOptions, "protectDestructive">> = {
    protectDestructive: args.options?.protectDestructive ?? true,
  };
  const side_effect = action.side_effect ?? "read";
  if (side_effect === "destructive" && opts.protectDestructive) {
    throw new IntegrationError(
      `destructive action "${args.action_id}" requires explicit confirmation (set protectDestructive=false)`,
      "DESTRUCTIVE_BLOCKED",
    );
  }

  // Required-scope check (best effort — only enforced for OAuth installs).
  if (integ.auth.kind === "oauth2") {
    const granted = new Set(args.install.granted_scopes ?? []);
    for (const s of integ.required_scopes ?? []) {
      if (!granted.has(s)) {
        throw new IntegrationError(`missing OAuth scope: ${s}`, "MISSING_SCOPE", { scope: s });
      }
    }
  }

  const base = action.base_url ?? "";
  const url = base + interpolatePath(action.path, args.inputs);
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };

  if (integ.auth.kind === "oauth2" || integ.auth.kind === "bearer") {
    const tok = args.install.credentials.access_token;
    if (!tok) throw new IntegrationError("missing access_token", "MISSING_CREDENTIALS");
    headers["authorization"] = `Bearer ${tok}`;
  } else if (integ.auth.kind === "api_key") {
    const key = args.install.credentials.api_key;
    if (!key) throw new IntegrationError("missing api_key", "MISSING_CREDENTIALS");
    const headerName = integ.auth.api_key?.header ?? "X-API-Key";
    headers[headerName.toLowerCase()] = key;
  }

  const f = args.options?.fetchImpl ?? fetch;
  const init: RequestInit = { method: action.method, headers };
  if (action.method !== "GET" && action.method !== "DELETE") {
    init.body = JSON.stringify(stripPathInputs(args.inputs, action.path));
  }

  const res = await f(url, init);
  let body: unknown;
  try { body = await res.json(); } catch { body = await res.text(); }
  if (!res.ok) {
    throw new IntegrationError(`HTTP ${res.status} from ${args.install.integration_slug}.${args.action_id}`,
      "HTTP_ERROR", { status: res.status, body });
  }
  return { status: res.status, body, side_effect };
}

function interpolatePath(path: string, inputs: Record<string, unknown>): string {
  return path.replace(/\{([^}]+)\}/g, (_, k) => {
    const v = inputs[k];
    if (v === undefined || v === null) throw new IntegrationError(`missing path param: ${k}`, "MISSING_PARAM");
    return encodeURIComponent(String(v));
  });
}

function stripPathInputs(inputs: Record<string, unknown>, path: string): Record<string, unknown> {
  const used = new Set<string>();
  path.replace(/\{([^}]+)\}/g, (_, k) => { used.add(k); return _; });
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(inputs)) if (!used.has(k)) out[k] = v;
  return out;
}

// Helper to wire integrations into the playbook runtime (Phase 3).
export function buildToolInvoker(
  resolveInstall: (slug: string) => Promise<InstalledIntegration | null>,
  options?: ExecuteOptions,
) {
  return async ({ name, inputs }: { name: string; inputs: Record<string, unknown> }) => {
    // tool:<integration_slug>.<action_id>
    const [slug, actionId] = name.split(".");
    if (!slug || !actionId) throw new IntegrationError(`bad tool ref: ${name}`, "BAD_REF");
    const install = await resolveInstall(slug);
    if (!install) throw new IntegrationError(`integration ${slug} not installed`, "NOT_INSTALLED");
    return executeAction({ install, action_id: actionId, inputs, options });
  };
}
