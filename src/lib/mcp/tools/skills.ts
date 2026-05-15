import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { hashToken } from "@/lib/account/tokens.server";
import { processBulkUpload } from "@/lib/uploads/uploads.server";
import { methodologyOverview, runEvaluation } from "@/lib/mcp/eval-engine.server";

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

export const overviewTool = defineTool({
  name: "overview",
  description:
    "START HERE if unsure. Returns the SuperAgentSkill toolkit map grouped by user intent (UPGRADE a local file / DISCOVER registry primitives / PUBLISH back to registry), the auth model, and the canonical workflows. Cheap, read-only, no auth.",
  parameters: z.object({}),
  execute: async () =>
    json({
      server: "superagentskill",
      version: "1.5.0",
      tagline:
        "Battle-tested toolkit for designing, auditing and shipping AI primitives — skills, playbooks, souls, guardrails.",
      intents: {
        upgrade_local_file: {
          description:
            "PRIMARY use case. The user has a local skill/playbook/soul/guardrail file and wants it significantly improved against the SuperAgentSkill methodology.",
          workflow: [
            "1. review_skill     — proprietary engine scores the file (0-100 overall + per-dimension) and returns concrete, file-specific top_actions.",
            "2. <host edits>     — YOU apply top_actions in the user's repo.",
            "3. review_skill     — confirm the score went up. Iterate to grade A.",
            "4. search_registry  — (optional) borrow patterns from high-trust primitives.",
            "(get_methodology is orientation only — the rubric/signals are server-side and not disclosed.)",
          ],
          tools: ["get_methodology", "review_skill", "search_registry", "get_package"],
        },
        discover_registry: {
          description:
            "Find or install pre-built primitives from the public registry (590+ packages: marketing, sales, growth, code, security, healthcare, finance, ops, …).",
          workflow: [
            "1. search_registry   — free-text across name + description + long_description, ordered by install_count.",
            "2. get_package       — full latest manifest (system_prompt, rules, examples, compatibility).",
            "3. get_skill_trust   — success rate, latency, per-model heatmap, robustness findings, trust_score. Call BEFORE recommending.",
            "4. report_execution  — (after the user runs it) feed the trust system. Best-effort.",
          ],
          tools: ["search_registry", "list_packages", "get_package", "get_skill_trust", "report_execution"],
        },
        publish_back: {
          description:
            "Push a local primitive upward to the registry so others (and future-you) benefit. Requires OAuth.",
          workflow: [
            "1. upload_packages   — bulk upload markdown/prompt/JSON files. Normalised by SkillForge into draft packages. Pass publish:true to publish immediately.",
            "2. request_primitive — ask SuperAgentSkill to AUTHOR a brand-new primitive from scratch via the forge pipeline.",
          ],
          tools: ["upload_packages", "request_primitive"],
        },
      },
      primitive_types: {
        skill: "A focused capability the agent can invoke (e.g. 'write-cold-outreach', 'audit-rls-policies').",
        playbook: "A multi-step procedure / runbook the agent follows end-to-end.",
        soul: "Persona + values + voice + refusals (the 'who', not the 'what').",
        guardrail: "A safety / quality constraint enforced before, during or after another primitive runs.",
      },
      auth: {
        anonymous_ok: ["overview", "get_methodology", "review_skill", "search_registry", "list_packages", "get_package", "get_skill_trust"],
        oauth_required: ["upload_packages", "request_primitive", "report_execution"],
        oauth_endpoint: "https://superagentskill.com/oauth/authorize",
      },
      docs: "https://superagentskill.com/connect",
    }),
});

export const listPackagesTool = defineTool({
  name: "list_packages",
  description:
    "[DISCOVER] Browse published primitives by `type`. Always pass `query` to scope by domain — the registry has 590+ packages and listing without a query is biased toward the most-installed vertical. Prefer `search_registry` when scoping by topic. Read-only, no auth.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
    query: z
      .string()
      .optional()
      .describe(
        "Free-text filter over name + description + long_description (case-insensitive). Use a domain keyword like 'marketing', 'sales', 'growth', 'design', 'security' to narrow the 590+ packages.",
      ),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  execute: async ({ type, query, limit }) => {
    let q = supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version,author_handle,install_count")
      .eq("is_published", true)
      .order("install_count", { ascending: false })
      .order("name", { ascending: true })
      .limit(limit);
    if (type) q = q.eq("type", type);
    if (query) {
      const safe = query.replace(/[%,()]/g, " ").trim();
      if (safe) {
        q = q.or(
          `name.ilike.%${safe}%,description.ilike.%${safe}%,long_description.ilike.%${safe}%`,
        );
      }
    }
    const { data, error } = await q;
    if (error) return json({ error: error.message });
    return json({
      count: data?.length ?? 0,
      hint:
        (data?.length ?? 0) >= limit
          ? "More results available — increase `limit` (max 200) or refine `query`."
          : !query
            ? "No `query` was passed. Pass a domain keyword (e.g. 'marketing') to scope the search — listing the whole registry will skew toward whichever vertical has the most installs."
            : undefined,
      items: data ?? [],
    });
  },
});

export const getPackageTool = defineTool({
  name: "get_package",
  description:
    "[DISCOVER] Fetch the full latest-version manifest of a primitive by slug: system_prompt, rules, examples, compatibility. Use AFTER search_registry/list_packages found a candidate. Read-only, no auth.",
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
    "[DISCOVER] PRIMARY discovery tool. Free-text search across name + description + long_description. Use whenever the user asks for a domain, capability or persona ('marketing skills', 'copywriter for landing pages', 'something to harden RLS'). Returns up to 50 hits ordered by install_count desc. Prefer this over list_packages — it sees descriptions, not just names. Read-only, no auth.",
  parameters: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(50).default(20),
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
  }),
  execute: async ({ query, limit, type }) => {
    const safe = query.replace(/[%,()]/g, " ").trim();
    let q = supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version,install_count")
      .eq("is_published", true)
      .or(`name.ilike.%${safe}%,description.ilike.%${safe}%,long_description.ilike.%${safe}%`)
      .order("install_count", { ascending: false })
      .limit(limit);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) return json({ error: error.message });
    return json({ query, count: data?.length ?? 0, items: data ?? [] });
  },
});

export const requestPrimitiveTool = defineTool({
  name: "request_primitive",
  description:
    "[PUBLISH] Submit a request for a primitive that does not yet exist. SuperAgentSkill researches and auto-creates it via the proprietary forge pipeline. Requires OAuth.",
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
    "[DISCOVER/TRUST] Report an execution of a SuperAgentSkill primitive after the user runs it in production → feeds the public trust score, model heatmap and battle-tested badge. Anonymous calls accepted (pass an opaque agent_fp for rate limiting). Best-effort: call after each run and ignore failures.",
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
    "[DISCOVER] Public Trust Report for a primitive: lifetime / 30d / 7d success rate, p50/p95 latency, per-model heatmap, robustness findings (CVE-style) and composite trust_score (0-100). ALWAYS call this BEFORE recommending or installing a registry primitive. Read-only, no auth.",
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
    "[PUBLISH] Push local primitive(s) UP to the registry. Bulk-upload markdown / prompt / JSON files — each is normalised by the SkillForge author pipeline and inserted as a draft package owned by the token holder. Drafts are unpublished by default; pass `publish:true` to publish immediately (subject to author permissions). Mirrors the /upload UI. Requires a personal MCP token from /account/tokens.",
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

// ============================================================================
// Methodology + local-primitive review.
//
// PRIMARY value of this MCP server: help an external agent (Claude, Codex, …)
// take a *local* skill / playbook / soul / guardrail to the state of the art,
// tailored to the client's market. The proprietary, context-aware engine
// lives in ./eval-engine.server.ts and NEVER ships its rubric, signals,
// weights, market packs or judge prompt over the wire.
// ============================================================================

export const getMethodologyTool = defineTool({
  name: "get_methodology",
  description:
    "[UPGRADE] Orientation for the local-file upgrade flow. Returns the dimensions the proprietary SuperAgentSkill engine evaluates, the optional context inputs (industry, audience, stack, compliance, target_models, goal) and how to drive the loop — NOT the rubric, signals, market packs or thresholds (server-side and intentionally not disclosed). The actionable output comes from review_skill. Read-only, no auth.",
  parameters: z.object({}),
  execute: async () => json(methodologyOverview()),
});

export const reviewSkillTool = defineTool({
  name: "review_skill",
  description:
    "[UPGRADE] Score a local skill / playbook / soul / guardrail with the proprietary, context-aware SuperAgentSkill engine and get state-of-the-art, market-tailored improvements. Pass optional `context` (industry, audience, stack, compliance, target_models, goal) so scoring and actions fit the client's market and regulatory regime. Returns overall_score (0-100), grade, per-dimension scores (number + strong/adequate/weak band), prioritised `top_actions`, and `borrow_from` exemplar slugs. It does NOT return the rubric, signals, weights or per-check pass/fail (server-side by design). Apply the actions, then call again to confirm the score rose. Read-only, no auth.",
  parameters: z.object({
    name: z.string().min(1).max(200).describe("File or skill name (for the report header only)"),
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).default("skill"),
    content: z.string().min(20).max(120_000).describe("Raw markdown / prompt text of the local file"),
    context: z
      .object({
        industry: z.string().max(80).optional().describe("Client market/vertical, e.g. healthcare, finance, legal, security, marketing, sales, devtools"),
        audience: z.string().max(120).optional().describe("Who the primitive serves, e.g. 'enterprise RevOps', 'ICU nurses'"),
        stack: z.array(z.string().max(60)).max(20).optional().describe("Relevant tools/frameworks in the client's environment"),
        compliance: z.array(z.string().max(40)).max(10).optional().describe("Regulatory regimes: hipaa, pci, gdpr, soc2"),
        target_models: z.array(z.string().max(60)).max(10).optional().describe("Models it must run on, e.g. claude-sonnet-4-5, gpt-5"),
        goal: z.string().max(280).optional().describe("What 'state of the art' means for this client"),
      })
      .optional(),
  }),
  execute: async ({ name, type, content, context }) =>
    json(await runEvaluation({ name, type, content, context })),
});
