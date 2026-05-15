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
    "  - `upload_packages` with the raw file content(s) → normalised by the SkillForge author pipeline, inserted as drafts owned by the token holder. Pass `publish: true` to publish immediately (subject to author permissions).",
    "  - `request_primitive` if the user wants SuperAgentSkill to AUTHOR a brand-new primitive from scratch via the forge pipeline.",
    "",
    "## Auth",
    "Read-only tools (overview, get_methodology, review_skill, list/search/get/trust) work anonymously. Write tools (upload_packages, request_primitive, report_execution) require an OAuth bearer — the host opens https://superagentskill.com/oauth/authorize automatically.",
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

function unauthorized(reason: string) {
  return new Response(JSON.stringify({ error: "unauthorized", reason }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer realm="MCP", resource_metadata="${RESOURCE_METADATA_URL}", error="invalid_token", error_description="${reason}"`,
      ...CORS_HEADERS,
    },
  });
}

const WRITE_TOOLS = new Set(["upload_packages", "report_execution", "request_primitive"]);
// Tools that are SO cheap / discovery-oriented they don't count against quota.
const FREE_TOOLS = new Set(["overview", "get_methodology"]);

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
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  let userId: string | null = null;
  let authSource: "oauth" | "pat" | null = null;
  if (token) {
    const auth = await verifyBearer(token);
    if (!auth) return unauthorized("token rejected");
    userId = auth.user_id;
    authSource = auth.source;
  }

  // Inspect the JSON-RPC body to decide:
  //  - whether it's a tools/call (only those count against quota)
  //  - whether anonymous callers are allowed to invoke this specific tool
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

  // Auth gate for write tools (anonymous users blocked entirely).
  if (isToolsCall && !userId && WRITE_TOOLS.has(toolName)) {
    return unauthorized("authentication required for this tool");
  }

  // Quota gate. Skip discovery / lifecycle methods (initialize, tools/list, ping…)
  // and ultra-cheap tools, since they're needed just to bootstrap the session.
  if (isToolsCall && !FREE_TOOLS.has(toolName)) {
    const identity = quotaIdentity(userId, request);
    const isWrite = WRITE_TOOLS.has(toolName);
    const { data: quota, error: quotaErr } = await supabaseAdmin.rpc("mcp_check_and_log_call", {
      _user_id: userId,
      _identity: identity,
      _tool_name: toolName,
      _is_write: isWrite,
    } as never);
    if (!quotaErr && quota && quota.allowed === false) {
      return rateLimited(quota, rpcId);
    }
  }

  if (userId && authSource) {
    return withCors(
      await mcp.handleRequest(request, {
        auth: { token, claims: { user_id: userId, source: authSource } },
      }),
    );
  }
  return withCors(await mcp.handleRequest(request));
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
