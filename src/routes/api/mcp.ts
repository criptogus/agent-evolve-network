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
import { ORIGIN, sha256 } from "@/lib/oauth/mcp-oauth.server";
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
    "  a. `get_methodology` → load the 7-pillar rubric (Identity, Scope, Procedure, Examples, Guardrails, Trust, Portability).",
    "  b. `review_skill` with the file's raw content → 0-100 score per pillar + concrete `top_actions` to apply.",
    "  c. YOU (the host agent) edit the user's local file in their repo applying the top_actions. This MCP does not write to disk.",
    "  d. `review_skill` again → confirm the score went up. Iterate until grade A.",
    "  e. Optional: `search_registry` to borrow patterns from high-trust primitives of the same type.",
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
const RESOURCE_METADATA_URL = `${ORIGIN}/.well-known/oauth-protected-resource`;

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
      "WWW-Authenticate": `Bearer realm="MCP", resource_metadata="${RESOURCE_METADATA_URL}", error="invalid_token"`,
    },
  });
}

async function handle(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (token) {
    const auth = await verifyBearer(token);
    if (!auth) return unauthorized("token rejected");
    return mcp.handleRequest(request, {
      auth: { token, claims: { user_id: auth.user_id, source: auth.source } },
    });
  }

  // No token: allow read-only tools (list/search/get/trust). MCP discovery (initialize,
  // tools/list, ping, etc.) is also allowed so clients can browse before auth.
  try {
    const cloned = request.clone();
    const body = (await cloned.json().catch(() => null)) as { method?: string; params?: { name?: string } } | null;
    if (body && body.method === "tools/call") {
      const toolName = body.params?.name ?? "";
      const writeTools = new Set(["upload_packages", "report_execution", "request_primitive"]);
      if (writeTools.has(toolName)) return unauthorized("authentication required for this tool");
    }
  } catch {
    /* fall through */
  }
  return mcp.handleRequest(request);
}

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
      DELETE: async ({ request }) => handle(request),
    },
  },
});
