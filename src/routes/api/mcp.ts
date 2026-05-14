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
  name: "super-agent-skill",
  version: "1.4.0",
  instructions: [
    "Super Agent Skill MCP — PRIMARY purpose: significantly upgrade the user's LOCAL skill, playbook, soul or guardrail file using the Super Agent Skill methodology (a battle-tested 7-pillar rubric: Identity, Scope, Procedure, Examples, Guardrails, Trust, Portability).",
    "",
    "DEFAULT WORKFLOW when the user asks to improve / refine / harden / audit / score / 'level up' a local skill or playbook file:",
    "  1. Call get_methodology to load the rubric.",
    "  2. Call review_skill with the file's raw content → returns a 0-100 score per pillar plus concrete edit recommendations.",
    "  3. Edit the user's local file in their repo applying the top_actions (YOU, the host agent, do the editing — this MCP does not write to their disk).",
    "  4. Call review_skill again to confirm the score improved.",
    "  5. Optionally call search_registry / get_package to borrow patterns from high-trust primitives of the same type.",
    "",
    "SECONDARY capability — registry: list_packages, search_registry, get_package, get_skill_trust let the user discover battle-tested primitives published by the community. Treat as a reference library, not as the main goal.",
    "",
    "TRUST: always call get_skill_trust BEFORE recommending a registry primitive, and report_execution AFTER the user runs one.",
    "",
    "AUTH: read-only tools (get_methodology, review_skill, list/search/get/trust) work without auth. Write tools (upload_packages, request_primitive) require an OAuth bearer — the host opens a browser to https://superagentskill.com/oauth/authorize automatically.",
  ].join("\n"),
  tools: [
    getMethodologyTool,
    reviewSkillTool,
    listPackagesTool,
    getPackageTool,
    searchRegistryTool,
    getTrustTool,
    requestPrimitiveTool,
    uploadPackagesTool,
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
