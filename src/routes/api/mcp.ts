import { createFileRoute } from "@tanstack/react-router";
import { createMcpServer } from "mcp-tanstack-start";
import {
  overviewTool,
  listPackagesTool,
  getPackageTool,
  searchRegistryTool,
  requestPrimitiveTool,
  uploadPackagesTool,
  reportExecutionTool,
  getTrustTool,
  getMethodologyTool,
  reviewSkillTool,
  submitFeedbackTool,
} from "@/lib/mcp/tools/skills";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { ORIGIN, sha256, CORS_HEADERS } from "@/lib/oauth/mcp-oauth.server";
import { hashToken } from "@/lib/account/tokens.server";

const mcp = createMcpServer({
  name: "superagentskill",
  version: "1.5.0",
  instructions: [
    "# SuperAgentSkill MCP",
    "Battle-tested toolkit for designing, auditing and shipping AI primitives (skills, playbooks, souls, guardrails). Use it for THREE distinct intents:",
    "",
    "## 1. UPGRADE a local file (PRIMARY use case)",
    "When the user says 'improve / refine / harden / audit / score / level up' a local skill, playbook, soul or guardrail file:",
    "  a. `review_skill` with the file's raw content → proprietary engine returns overall_score (0-100), per-dimension scores and concrete, file-specific `top_actions`. (The rubric/signals/thresholds are server-side and intentionally NOT disclosed — `get_methodology` is orientation only.)",
    "  b. YOU (the host agent) edit the user's local file in their repo applying the top_actions. This MCP does not write to disk.",
    "  c. `review_skill` again → confirm the score went up. Iterate until grade A.",
    "  d. Optional: `search_registry` to borrow patterns from high-trust primitives of the same type.",
    "",
    "## 2. DISCOVER primitives in the public registry",
    "When the user wants to find or install something pre-built (590+ packages across marketing, sales, growth, code, security, healthcare, finance, ops, …):",
    "  - `search_registry` with a domain keyword ('marketing', 'rls hardening', 'cold outreach') → ordered by install_count.",
    "  - `list_packages` to browse a single `type` (skill | playbook | soul | guardrail). ALWAYS pass a `query` — listing without one biases toward the most-installed vertical.",
    "  - `get_package` for the full latest manifest (system_prompt, rules, examples, compatibility) by slug.",
    "  - `get_skill_trust` BEFORE recommending → success rate, p50/p95 latency, per-model heatmap, robustness findings, composite trust_score.",
    "  - After the user runs a primitive in production, call `report_execution` (best-effort, ignore failures) to feed the trust system.",
    "",
    "## 3. PUBLISH new primitives back to the registry",
    "When the user wants to contribute a local skill upward so others (and future versions of themselves) benefit:",
    "  - `upload_packages` with the raw file content(s) → normalised by the SkillForge author pipeline, inserted as PRIVATE drafts owned by the token holder. Drafts are never auto-published: listing on the public marketplace requires the author to submit for review and an admin to approve (this is what keeps the registry adversarially vetted and the `author_verified` badge meaningful).",
    "  - `request_primitive` if the user wants SuperAgentSkill to AUTHOR a brand-new primitive from scratch via the forge pipeline.",
    "",
    "## Auth",
    "Read-only tools (overview, get_methodology, review_skill, list/search/get/trust) work anonymously. Write tools (upload_packages, request_primitive) require an OAuth bearer — the host opens https://superagentskill.com/oauth/authorize automatically. Users without working OAuth can also paste a personal access token from https://superagentskill.com/account/tokens.",
    "",
    "## Welcome",
    "If this is the user's first call this session, suggest running `overview` once to see the full intent → tool map, and mention that one-click install pages live at https://superagentskill.com/connect/{client}.",
    "",
    "TIP: Call `overview` first if you're unsure which tool fits the user's request — it returns the intent → tool map.",
  ].join("\n"),
  tools: [
    overviewTool,
    getMethodologyTool,
    reviewSkillTool,
    searchRegistryTool,
    listPackagesTool,
    getPackageTool,
    getTrustTool,
    uploadPackagesTool,
    requestPrimitiveTool,
    reportExecutionTool,
    submitFeedbackTool,
  ],
});

// Canonical RFC 9728 location at the origin root. Clients (Claude, Codex, …)
// read this URL from the WWW-Authenticate header to start the OAuth dance.
const RESOURCE_METADATA_URL = `${ORIGIN}/.well-known/oauth-protected-resource/api/mcp`;

/** Attach CORS headers to any Response without dropping its existing headers. */
function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/**
 * Standard rate-limit headers (RFC 6585 + de-facto X-RateLimit-*). We emit
 * these on every quota-bearing response — including 200s — so well-behaved
 * clients can self-regulate and surface "X calls remaining" without having
 * to wait for a 429.
 */
function withRateLimitHeaders(
  res: Response,
  quota: { limit?: number; used?: number; remaining?: number; reset_at?: string; window?: string } | null,
): Response {
  if (!quota) return res;
  const headers = new Headers(res.headers);
  if (typeof quota.limit === "number") headers.set("X-RateLimit-Limit", String(quota.limit));
  const remaining =
    typeof quota.remaining === "number"
      ? quota.remaining
      : typeof quota.limit === "number" && typeof quota.used === "number"
        ? Math.max(0, quota.limit - quota.used)
        : null;
  if (remaining != null) headers.set("X-RateLimit-Remaining", String(remaining));
  if (quota.reset_at) {
    const epoch = Math.floor(new Date(quota.reset_at).getTime() / 1000);
    if (!Number.isNaN(epoch)) headers.set("X-RateLimit-Reset", String(epoch));
  }
  if (quota.window) headers.set("X-RateLimit-Window", quota.window);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** Try OAuth tokens first, then fall back to legacy MCP personal tokens. */
async function verifyBearer(token: string): Promise<{ user_id: string; source: "oauth" | "pat" } | null> {
  // OAuth access token
  const { data: oauth } = await supabaseAdmin.rpc("mcp_oauth_verify_access", {
    _token_hash: sha256(token),
  } as never);
  const oauthRow = oauth as { user_id?: string } | null;
  if (oauthRow?.user_id) return { user_id: oauthRow.user_id, source: "oauth" };

  // Legacy personal access token (sas_...)
  if (token.startsWith("sas_") && !token.startsWith("sas_at_") && !token.startsWith("sas_rt_") && !token.startsWith("sas_code_")) {
    const { data } = await supabaseAdmin
      .from("mcp_tokens")
      .select("user_id,id")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    if (data?.user_id) {
      await supabaseAdmin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
      return { user_id: data.user_id, source: "pat" };
    }
  }
  return null;
}

function unauthorized(reason: string, rpcId: string | number | null = null) {
  // Return BOTH a JSON-RPC error (so MCP clients that surface error.data.hint
  // in chat can render the recovery action inline) and the canonical
  // WWW-Authenticate header (so OAuth-aware clients trigger discovery).
  const hint = `Authorize at ${ORIGIN}/oauth/authorize or run \`npx -y super-agent login\`. You can also paste a personal access token from ${ORIGIN}/account/tokens.`;
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: rpcId,
      error: {
        code: -32001,
        message: `Unauthorized: ${reason}`,
        data: {
          reason,
          hint,
          authorization_url: `${ORIGIN}/oauth/authorize`,
          tokens_url: `${ORIGIN}/account/tokens`,
          connect_url: `${ORIGIN}/connect`,
          resource_metadata: RESOURCE_METADATA_URL,
        },
      },
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer realm="MCP", resource_metadata="${RESOURCE_METADATA_URL}", error="invalid_token", error_description="${reason}"`,
        ...CORS_HEADERS,
      },
    },
  );
}

// Tools that mutate user-owned state and require an OAuth bearer.
// `report_execution` is intentionally NOT here: it's a best-effort telemetry
// ping the host agent fires after every run. Treating it as a write would
// burn the trial 5/day write quota in minutes. The underlying
// `report_skill_execution` RPC already rate-limits by `agent_fp` (60/min),
// so it's safe to count it as a cheap read.
const WRITE_TOOLS = new Set(["upload_packages", "request_primitive"]);
// Tools that are SO cheap / discovery-oriented they don't count against quota.
// `report_execution` is included so post-run telemetry is truly best-effort
// and never blocks a user's flow on quota.
const FREE_TOOLS = new Set(["overview", "get_methodology", "report_execution"]);

/** Stable, hashed identity for quota bucketing. */
function quotaIdentity(userId: string | null, request: Request): string {
  if (userId) return `u:${userId}`;
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || request.headers.get("cf-connecting-ip") || "unknown";
  return `ip:${sha256(ip).slice(0, 32)}`;
}

function rateLimited(quota: any, id: string | number | null) {
  const tier = quota?.tier ?? "trial";
  const reason = quota?.reason ?? "rate_limited";
  const win = quota?.window === "hour" ? "this hour" : "today";
  const upgradeHint =
    tier === "trial"
      ? " Upgrade your plan at https://superagentskill.com/pricing for higher MCP limits."
      : tier === "anonymous"
        ? " Sign in and connect via OAuth (https://superagentskill.com/connect) for higher limits."
        : "";
  const message = `MCP quota reached for ${win} (${tier} tier: ${quota?.used}/${quota?.limit}).${upgradeHint}`;
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32029, message, data: quota },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": quota?.window === "hour" ? "3600" : "86400",
        ...CORS_HEADERS,
      },
    },
  );
}

async function handle(request: Request): Promise<Response> {
  // Inspect the JSON-RPC body up-front so unauthorized() can return a
  // properly-framed JSON-RPC error (matched id, so clients can surface
  // error.data.hint inline in chat).
  let toolName = "";
  let rpcId: string | number | null = null;
  let isToolsCall = false;
  try {
    const cloned = request.clone();
    const body = (await cloned.json().catch(() => null)) as
      | { id?: string | number | null; method?: string; params?: { name?: string } }
      | null;
    if (body) {
      rpcId = body.id ?? null;
      if (body.method === "tools/call") {
        isToolsCall = true;
        toolName = body.params?.name ?? "";
      }
    }
  } catch {
    /* fall through */
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  let userId: string | null = null;
  let authSource: "oauth" | "pat" | null = null;
  if (token) {
    const auth = await verifyBearer(token);
    if (!auth) return unauthorized("token rejected", rpcId);
    userId = auth.user_id;
    authSource = auth.source;
  }

  // Auth gate for write tools (anonymous users blocked entirely).
  if (isToolsCall && !userId && WRITE_TOOLS.has(toolName)) {
    return unauthorized(`tool "${toolName}" requires authentication`, rpcId);
  }

  // Quota gate. Skip discovery / lifecycle methods (initialize, tools/list, ping…)
  // and ultra-cheap tools, since they're needed just to bootstrap the session.
  let lastQuota: any = null;
  if (isToolsCall && !FREE_TOOLS.has(toolName)) {
    const identity = quotaIdentity(userId, request);
    const isWrite = WRITE_TOOLS.has(toolName);
    const { data: quota, error: quotaErr } = await supabaseAdmin.rpc("mcp_check_and_log_call", {
      _user_id: userId,
      _identity: identity,
      _tool_name: toolName,
      _is_write: isWrite,
    } as never);
    if (!quotaErr) lastQuota = quota ?? null;
    if (!quotaErr && quota && quota.allowed === false) {
      return withRateLimitHeaders(rateLimited(quota, rpcId), quota);
    }
  }

  // Funnel telemetry: fire-and-forget record of the first successful
  // tools/call this caller has made. The RPC itself dedupes on event +
  // (user_id | anon_hash) so we don't need to check here.
  if (isToolsCall) {
    const identity = quotaIdentity(userId, request);
    const anonHash = userId ? null : identity.replace(/^ip:/, "");
    void supabaseAdmin
      .rpc("record_mcp_funnel_event", {
        _event: WRITE_TOOLS.has(toolName) ? "mcp_first_write" : "mcp_first_call",
        _client_id: null,
        _client_name: null,
        _anon_hash: anonHash,
        _props: { tool: toolName, auth_source: authSource },
      } as never)
      .then(() => {}, () => {});
  }

  const handled =
    userId && authSource
      ? await mcp.handleRequest(request, {
          auth: { token, claims: { user_id: userId, source: authSource } },
        })
      : await mcp.handleRequest(request);
  return withRateLimitHeaders(withCors(handled), lastQuota);
}

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
      DELETE: async ({ request }) => handle(request),
    },
  },
});
