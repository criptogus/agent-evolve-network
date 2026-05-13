import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { hashToken } from "@/lib/account/tokens.server";
import { processBulkUpload } from "@/lib/uploads/uploads.server";

const json = (v: unknown) => JSON.stringify(v, null, 2);

async function resolveUserFromToken(token: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("mcp_tokens")
    .select("user_id,id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return null;
  // best-effort touch last_used_at
  await supabaseAdmin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data.user_id;
}

export const listPackagesTool = defineTool({
  name: "list_packages",
  description:
    "List published primitives (skills, playbooks, souls, guardrails) from the Super Agent Skill registry. Optional type filter and search query.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
    query: z.string().optional().describe("Free-text search over name/description"),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  execute: async ({ type, query, limit }) => {
    let q = supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version,author_handle")
      .eq("is_published", true)
      .limit(limit);
    if (type) q = q.eq("type", type);
    if (query) q = q.ilike("name", `%${query}%`);
    const { data, error } = await q;
    if (error) return json({ error: error.message });
    return json({ count: data?.length ?? 0, items: data ?? [] });
  },
});

export const getPackageTool = defineTool({
  name: "get_package",
  description:
    "Fetch the full latest-version manifest of a primitive by slug: system prompt, rules, examples, and compatibility.",
  parameters: z.object({
    slug: z.string().describe("Package slug (e.g. cardiology-soul)"),
  }),
  execute: async ({ slug }) => {
    const { data: pkg, error } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,type,description,long_description,latest_version,author_handle")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) return json({ error: error.message });
    if (!pkg) return json({ error: "not_found" });
    const { data: ver } = await supabaseAdmin
      .from("package_versions")
      .select("version,status,system_prompt,rules,examples,compatibility,notes")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return json({ package: pkg, version: ver });
  },
});

export const searchRegistryTool = defineTool({
  name: "search_registry",
  description:
    "Search across the entire registry (name + description + long description). Use when the agent does not know an exact slug.",
  parameters: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  execute: async ({ query, limit }) => {
    const { data, error } = await supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version")
      .eq("is_published", true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,long_description.ilike.%${query}%`)
      .limit(limit);
    if (error) return json({ error: error.message });
    return json({ query, count: data?.length ?? 0, items: data ?? [] });
  },
});

export const requestPrimitiveTool = defineTool({
  name: "request_primitive",
  description:
    "Submit a request for a primitive that does not yet exist. Super Agent Skill will research and auto-create it via the proprietary forge pipeline.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]),
    brief: z.string().min(20).max(2000).describe("What the primitive should do, with industry/context"),
    industry: z.string().max(80).optional(),
  }),
  execute: async ({ type, brief, industry }) => {
    const { data, error } = await supabaseAdmin
      .from("package_requests")
      .insert({ kind: type, brief, industry: industry ?? null, status: "queued" })
      .select("id,status")
      .single();
    if (error) return json({ error: error.message });
    return json({
      request_id: data.id,
      status: data.status,
      note: "Queued for the Super Agent Skill forge pipeline.",
    });
  },
});

export const reportExecutionTool = defineTool({
  name: "report_execution",
  description:
    "Report an execution of a Super Agent Skill primitive (skill/playbook/soul/guardrail) so it gets a public trust score, model heatmap and battle-tested badge. Anonymous calls are accepted: pass an opaque agent_fp (e.g. sha256 of your install id) to enable per-agent rate limiting without revealing identity. Use this whenever you finish using a primitive in production — call it best-effort and ignore failures.",
  parameters: z.object({
    slug: z.string().min(1),
    success: z.boolean(),
    model: z.string().max(80).optional().describe("e.g. claude-sonnet-4-5, gpt-5, gemini-2.5-pro"),
    version: z.string().max(40).optional(),
    latency_ms: z.number().int().min(0).max(10 * 60 * 1000).optional(),
    tokens_in: z.number().int().min(0).max(2_000_000).optional(),
    tokens_out: z.number().int().min(0).max(2_000_000).optional(),
    error_kind: z.string().max(80).optional().describe("Short tag like timeout, refusal, hallucination, tool_error"),
    agent_fp: z.string().max(128).optional().describe("Opaque per-agent fingerprint hash for rate limiting"),
  }),
  execute: async (input) => {
    const { data, error } = await supabaseAdmin.rpc("report_skill_execution", {
      _slug: input.slug,
      _success: input.success,
      _model: input.model,
      _version: input.version,
      _latency_ms: input.latency_ms,
      _tokens_in: input.tokens_in,
      _tokens_out: input.tokens_out,
      _error_kind: input.error_kind,
      _agent_fp: input.agent_fp,
    } as any);
    if (error) return json({ ok: false, error: error.message });
    return json({ ok: true, execution_id: data });
  },
});

export const getTrustTool = defineTool({
  name: "get_skill_trust",
  description:
    "Get the public Trust Report for a primitive: lifetime / 30d / 7d success rate, p50/p95 latency, per-model heatmap, public robustness findings (CVE-style) and the composite trust_score (0-100). Use this before recommending or installing a skill so the user knows it is battle-tested.",
  parameters: z.object({ slug: z.string().min(1) }),
  execute: async ({ slug }) => {
    const { data, error } = await supabaseAdmin.rpc("get_skill_trust", { _slug: slug });
    if (error) return json({ error: error.message });
    if (!data) return json({ error: "not_found" });
    const { data: findings } = await supabaseAdmin
      .from("skill_robustness_findings")
      .select("code,severity,category,summary,fixed_in_version,published_at")
      .eq("package_slug", slug)
      .eq("status", "public")
      .order("published_at", { ascending: false })
      .limit(20);
    return json({ trust: data, findings: findings ?? [] });
  },
});

export const uploadPackagesTool = defineTool({
  name: "upload_packages",
  description:
    "Bulk-upload skill/playbook/soul/guardrail definitions (markdown, prompt or JSON text). Each file is normalised by the SkillForge author pipeline and inserted as a draft package owned by the token holder. Drafts are unpublished by default; admins or the author can publish later. Requires a personal MCP token (see /account/tokens). Mirrors the /upload UI 1:1.",
  parameters: z.object({
    auth_token: z.string().min(8).describe("Personal MCP token. Mint one at /account/tokens."),
    files: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          content: z.string().min(20).max(120_000),
          type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
        })
      )
      .min(1)
      .max(10),
    publish: z.boolean().optional().default(false),
  }),
  execute: async ({ auth_token, files, publish }) => {
    const userId = await resolveUserFromToken(auth_token);
    if (!userId) return json({ error: "invalid_token", hint: "Mint a token at /account/tokens" });
    try {
      const results = await processBulkUpload(supabaseAdmin as any, userId, files, { publish });
      const ok = results.filter((r) => r.ok).length;
      return json({ uploaded: ok, failed: results.length - ok, results });
    } catch (e: any) {
      return json({ error: e?.message ?? "upload_failed" });
    }
  },
});
