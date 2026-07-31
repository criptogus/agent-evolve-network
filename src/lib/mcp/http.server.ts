import { createMcpServer } from "mcp-tanstack-start";
import {
  overviewTool,
  listPackagesTool,
  getPackageTool,
  searchRegistryTool,
  requestPrimitiveTool,
  uploadPackagesTool,
  reportExecutionTool,
  reportOutcomeTool,
  getUpliftTool,
  getTrustTool,
  getMethodologyTool,
  reviewSkillTool,
  reviewSkillsBatchTool,
  submitFeedbackTool,
} from "@/lib/mcp/tools/skills";
import {
  cloudSkillsListTool,
  cloudSkillsGetTool,
  cloudSkillsSaveTool,
  cloudSkillsDeleteTool,
  cloudSkillsExportTool,
  cloudSkillsImportTool,
} from "@/lib/mcp/tools/cloud-skills";
import {
  listAgentsTool,
  installAgentTool,
  createAgentTool,
  listMyAgentsTool,
  getMyAgentTool,
  installMyAgentTool,
} from "@/lib/mcp/tools/agents";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { ORIGIN, sha256, CORS_HEADERS } from "@/lib/oauth/mcp-oauth.server";
import { verifyBearerDetailed } from "@/lib/auth/bearer.server";

/**
 * Diagnostic identity status echoed via the X-MCP-Auth header on every
 * response. Lets a host MCP client tell at a glance why it ended up in the
 * anonymous quota bucket — the #1 production support question for this
 * endpoint. Stable string values, safe to log on the client side.
 */
type AuthStatus =
  | "none"               // no Authorization header at all
  | "malformed"          // header present but not `Bearer <token>`
  | "oauth"              // verified via mcp_oauth_tokens
  | "pat"                // verified via mcp_tokens
  | "rejected:oauth"     // OAuth-shaped bearer that did not verify
  | "rejected:pat"       // PAT-shaped bearer that did not verify
  | "rejected:refresh-or-code" // caller sent refresh-token / auth code
  | "rejected:unsupported";    // unknown bearer shape

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
    "## 4. CLOUD SKILL MANAGER (paid subscribers only)",
    "Save, sync and reuse your skills across projects, CLIs and devices. Agent Pass or Enterprise subscription required.",
    "  - `cloud_skills_save` to push a local skill to your cloud library (creates or updates by slug).",
    "  - `cloud_skills_list` to browse your saved skills (filter by category, tag, or query).",
    "  - `cloud_skills_get` to fetch the full content of a saved skill by slug.",
    "  - `cloud_skills_export` to export a skill as SKILL.md (Markdown + YAML frontmatter) ready to paste.",
    "  - `cloud_skills_import` to import a SKILL.md file into your cloud library.",
    "  - `cloud_skills_delete` to remove a skill from your library.",
    "",
    "## 5. AGENT STORE (paid subscribers only)",
    "Ready-to-use agents bundling a soul + skills + playbooks: CEO, COO, CTO, CMO, HR Director, Agent Architect, Corporate Finance, Board Meetings, Google Ads, Meta Ads, Newsletter, LinkedIn, X.",
    "  - `list_agents` to browse the catalog (free, anonymous).",
    "  - `install_agent` to get the full bundle as files to write into the user's repo (default `.agents/<slug>/`), or as a single system prompt.",
    "",
    "## Auth",
    "Read-only tools (overview, get_methodology, review_skill, review_skills_batch, list/search/get/trust) work anonymously. Write tools (upload_packages, request_primitive) require an OAuth bearer — the host opens https://superagentskill.com/oauth/authorize automatically. Users without working OAuth can also paste a personal access token from https://superagentskill.com/account/tokens. TIP: call upload_packages / request_primitive with dry_run:true to validate the flow anonymously (no persistence, no OAuth) before connecting.",
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
    reviewSkillsBatchTool,
    searchRegistryTool,
    listPackagesTool,
    getPackageTool,
    getTrustTool,
    uploadPackagesTool,
    requestPrimitiveTool,
    reportExecutionTool,
    reportOutcomeTool,
    getUpliftTool,
    submitFeedbackTool,
    cloudSkillsListTool,
    cloudSkillsGetTool,
    cloudSkillsSaveTool,
    cloudSkillsDeleteTool,
    cloudSkillsExportTool,
    cloudSkillsImportTool,
    listAgentsTool,
    installAgentTool,
    createAgentTool,
    listMyAgentsTool,
    getMyAgentTool,
    installMyAgentTool,
  ],
});

// Canonical RFC 9728 location at the origin root. Clients (Claude, Codex, …)
// read this URL from the WWW-Authenticate header to start the OAuth dance.
const RESOURCE_METADATA_URL = `${ORIGIN}/.well-known/oauth-protected-resource/api/public/mcp`;

/** Attach CORS headers to any Response without dropping its existing headers. */
function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** Stamp the auth-diagnostic header so the client can see why it was bucketed. */
function withAuthStatus(res: Response, status: AuthStatus): Response {
  const headers = new Headers(res.headers);
  headers.set("X-MCP-Auth", status);
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

function unauthorized(reason: string, rpcId: string | number | null = null, authStatus: AuthStatus = "rejected:unsupported") {
  // Return BOTH a JSON-RPC error (so MCP clients that surface error.data.hint
  // in chat can render the recovery action inline) and the canonical
  // WWW-Authenticate header (so OAuth-aware clients trigger discovery).
  // The recovery hint is tailored to the specific rejection reason so a
  // client sending the wrong artefact (e.g. refresh token) gets a directly
  // actionable message instead of a generic "Authorize at …" prompt.
  const hint =
    authStatus === "rejected:refresh-or-code"
      ? `That looks like a refresh token or auth code, not an access token. Complete the OAuth flow at ${ORIGIN}/oauth/authorize and use the resulting access token in the Authorization header.`
      : authStatus === "rejected:oauth"
        ? `OAuth access token did not verify (revoked, expired, or issued in a different environment). Re-authorize at ${ORIGIN}/oauth/authorize or paste a personal access token from ${ORIGIN}/account/tokens.`
        : authStatus === "rejected:pat"
          ? `Personal access token not recognised. Issue a new one at ${ORIGIN}/account/tokens.`
          : `Authorize at ${ORIGIN}/oauth/authorize or run \`npx -y super-agent login\`. You can also paste a personal access token from ${ORIGIN}/account/tokens.`;
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: rpcId,
      error: {
        code: -32001,
        message: `Unauthorized: ${reason}`,
        data: {
          reason,
          auth_status: authStatus,
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
        "X-MCP-Auth": authStatus,
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
const FREE_TOOLS = new Set(["overview", "get_methodology", "report_execution", "list_agents"]);

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
  let isDryRun = false;
  try {
    const cloned = request.clone();
    const body = (await cloned.json().catch(() => null)) as
      | { id?: string | number | null; method?: string; params?: { name?: string; arguments?: { dry_run?: boolean } } }
      | null;
    if (body) {
      rpcId = body.id ?? null;
      if (body.method === "tools/call") {
        isToolsCall = true;
        toolName = body.params?.name ?? "";
        isDryRun = body.params?.arguments?.dry_run === true;
      }
    }
  } catch {
    /* fall through */
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const hasAuthHeader = authHeader.length > 0;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  let userId: string | null = null;
  let authSource: "oauth" | "pat" | null = null;
  let authStatus: AuthStatus = hasAuthHeader
    ? token
      ? "rejected:unsupported"
      : "malformed"
    : "none";
  if (token) {
    const result = await verifyBearerDetailed(token);
    if (result.ok) {
      userId = result.auth.user_id;
      authSource = result.auth.source;
      authStatus = result.auth.source === "oauth" ? "oauth" : "pat";
    } else {
      authStatus = `rejected:${result.reason === "refresh-or-code" ? "refresh-or-code" : result.reason === "oauth-rejected" ? "oauth" : result.reason === "pat-rejected" ? "pat" : "unsupported"}` as AuthStatus;
      return withAuthStatus(withCors(unauthorized("token rejected", rpcId, authStatus)), authStatus);
    }
  }

  // Auth gate for write tools (anonymous users blocked entirely). Exception:
  // a `dry_run` call is a validation-only preview — it neither persists nor
  // spends model budget — so it's allowed anonymously to let agents test the
  // publish flow before connecting OAuth.
  if (isToolsCall && !userId && WRITE_TOOLS.has(toolName) && !isDryRun) {
    return withAuthStatus(withCors(unauthorized(`tool "${toolName}" requires authentication`, rpcId, authStatus)), authStatus);
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
      return withAuthStatus(withRateLimitHeaders(rateLimited(quota, rpcId), quota), authStatus);
    }
  }

  // Funnel telemetry: fire-and-forget record of the first successful
  // tools/call this caller has made. The RPC itself dedupes on event +
  // (user_id | anon_hash) so we don't need to check here.
  if (isToolsCall) {
    const identity = quotaIdentity(userId, request);
    const anonHash = userId ? null : identity.replace(/^ip:/, "");
    const ua = request.headers.get("user-agent") ?? "";
    const { classifyUserAgent } = await import("@/lib/telemetry/bot-detect");
    const cls = classifyUserAgent(ua);
    void supabaseAdmin
      .rpc("record_mcp_funnel_event", {
        _event: WRITE_TOOLS.has(toolName) ? "mcp_first_write" : "mcp_first_call",
        _client_id: null,
        _client_name: null,
        _anon_hash: anonHash,
        _props: {
          tool: toolName,
          auth_source: authSource,
          is_bot: cls.isBot,
          ua_family: cls.family,
          ua: ua.slice(0, 300),
        },
      } as never)
      .then(() => {}, () => {});
  }

  const handled =
    userId && authSource
      ? await mcp.handleRequest(request, {
          auth: { token, claims: { user_id: userId, source: authSource } },
        })
      : await mcp.handleRequest(request);
  return withAuthStatus(withRateLimitHeaders(withCors(handled), lastQuota), authStatus);
}
/**
 * Public entry point shared by BOTH the canonical `/api/public/mcp` and the legacy
 * `/api/public/mcp`. Some customer runtimes (Vercel, Replit, HuggingFace
 * Spaces, corporate egress ranges) get their IP/UA blocked by the edge WAF on
 * the default path; `/api/public/*` is left open by the platform gate, so the
 * mirror gives those clients an identical, fully-featured MCP endpoint.
 */
export async function handleMcpHttp(request: Request): Promise<Response> {
  return handle(request);
}

/** Friendly GET sniff response, parameterised by the mounted endpoint path. */
export function mcpInfoResponse(endpoint: string): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      name: "superagentskill",
      transport: "streamable-http",
      endpoint,
      usage: "POST JSON-RPC 2.0 payloads to this URL. Set Accept: application/json, text/event-stream.",
      mirror: endpoint === "/api/public/mcp" ? `${ORIGIN}/api/mcp` : `${ORIGIN}/api/public/mcp`,
      mirror_hint:
        "If this URL is blocked by an edge firewall from your runtime (403 / connection reset), retry the identical JSON-RPC calls against the `mirror` URL.",
      // Plain-JSON door for clients that don't want to parse SSE frames.
      json_review_endpoint: `${ORIGIN}/api/public/review`,
      json_review_hint:
        "No MCP client? POST {name, content, type?} as plain JSON to `json_review_endpoint` and get the same score payload back as plain JSON — no JSON-RPC, no SSE, no auth.",
      json_batch_review_endpoint: `${ORIGIN}/api/public/review/batch`,
      json_batch_review_hint:
        "Many files at once: POST {items:[{name, content}, …]} as plain JSON to `json_batch_review_endpoint` with `Authorization: Bearer <token>`. Same per-item payload plus a batch summary. Requires an Agent Pass / Enterprise subscription; GET the URL for the full contract.",
      docs: `${ORIGIN}/docs/mcp`,
      probe: `${ORIGIN}/api/public/mcp/probe`,

      ts: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS_HEADERS },
    },
  );
}

export { CORS_HEADERS };
