import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { hashToken } from "@/lib/account/tokens.server";
import { processBulkUpload, previewUpload } from "@/lib/uploads/uploads.server";
import { getGatewayModel } from "@/lib/ai-gateway";
import { getIdempotent, putIdempotent } from "@/lib/mcp/idempotency";
import { twoProportionUplift } from "@/lib/experiments/uplift";
import { projectImpact, projectionToText } from "@/lib/skills/impact-projection";

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
          tools: ["get_methodology", "review_skill", "review_skills_batch", "search_registry", "get_package"],
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
            "1. upload_packages   — bulk upload markdown/prompt/JSON files. Normalised by SkillForge into PRIVATE draft packages. Never auto-published; public listing requires author submit + admin review/approval.",
            "2. request_primitive — ask SuperAgentSkill to AUTHOR a brand-new primitive from scratch via the forge pipeline.",
          ],
          tools: ["upload_packages", "request_primitive"],
        },
        cloud_skill_manager: {
          description:
            "Save, sync and reuse YOUR skills across projects, CLIs and devices. Your personal cloud library. Requires OAuth + paid subscription (Agent Pass or Enterprise).",
          workflow: [
            "1. cloud_skills_save   — push a local skill to the cloud (creates or updates by slug).",
            "2. cloud_skills_list   — browse your saved skills (filter by category, tag, query).",
            "3. cloud_skills_get    — fetch the full content of a saved skill by slug.",
            "4. cloud_skills_export — export as SKILL.md ready to paste into any project.",
            "5. cloud_skills_import — import a SKILL.md file into your cloud library.",
            "6. cloud_skills_delete — remove a skill from your library.",
          ],
          tools: ["cloud_skills_list", "cloud_skills_get", "cloud_skills_save", "cloud_skills_delete", "cloud_skills_export", "cloud_skills_import"],
        },
      },
      primitive_types: {
        skill: "A focused capability the agent can invoke (e.g. 'write-cold-outreach', 'audit-rls-policies').",
        playbook: "A multi-step procedure / runbook the agent follows end-to-end.",
        soul: "Persona + values + voice + refusals (the 'who', not the 'what').",
        guardrail: "A safety / quality constraint enforced before, during or after another primitive runs.",
      },
      auth: {
        anonymous_ok: ["overview", "get_methodology", "review_skill", "review_skills_batch", "search_registry", "list_packages", "get_package", "get_skill_trust"],
        oauth_required: ["upload_packages", "request_primitive", "report_execution", "cloud_skills_*"],
        paid_subscription_required: ["cloud_skills_list", "cloud_skills_get", "cloud_skills_save", "cloud_skills_delete", "cloud_skills_export", "cloud_skills_import"],
        anonymous_dry_run: ["upload_packages", "request_primitive"],
        anonymous_dry_run_note: "Pass dry_run:true to upload_packages / request_primitive to validate the flow anonymously — no persistence, no model budget, no OAuth.",
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
      .eq("review_status", "approved")
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
      .eq("review_status", "approved")
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
      .eq("review_status", "approved")
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
    "[PUBLISH] Submit a request for a primitive that does not yet exist. SuperAgentSkill researches and auto-creates it via the proprietary forge pipeline. Requires OAuth. Pass an `idempotency_key` (any opaque string you generate once per request) and retries return the original `request_id` instead of creating duplicates.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]),
    brief: z.string().min(20).max(2000).describe("What the primitive should do, with industry/context"),
    industry: z.string().max(80).optional(),
    idempotency_key: z
      .string()
      .min(8)
      .max(200)
      .optional()
      .describe("Opaque string generated once per logical request. Repeats within 24h return the original response."),
    dry_run: z
      .boolean()
      .default(false)
      .describe("Preview the request WITHOUT authenticating or persisting: validates the brief and echoes the would-be queued payload so an agent can test the flow before connecting OAuth. Nothing is enqueued."),
  }),
  execute: async ({ type, brief, industry, idempotency_key, dry_run }, ctx) => {
    if (dry_run) {
      return json({
        dry_run: true,
        would_create: { kind: type, brief, industry: industry ?? null, status: "queued" },
        next_step:
          "Validation-only preview — nothing was enqueued. Call request_primitive again with dry_run omitted while connected via OAuth to actually submit it to the forge pipeline.",
      });
    }
    const userId = (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
    if (userId && idempotency_key) {
      const cached = await getIdempotent(userId, "request_primitive", idempotency_key);
      if (cached) return json({ ...(cached as object), replayed: true });
    }
    const { data, error } = await supabaseAdmin
      .from("package_requests")
      .insert({ kind: type, brief, industry: industry ?? null, status: "queued" })
      .select("id,status")
      .single();
    if (error) return json({ error: error.message });
    const response = {
      request_id: data.id,
      status: data.status,
      note: "Queued for the Super Agent Skill forge pipeline.",
    };
    if (userId && idempotency_key) {
      await putIdempotent(userId, "request_primitive", idempotency_key, response);
    }
    return json(response);
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
    // ---- Outcome instrumentation (proves customer value, not just execution)
    task_completed: z.boolean().optional().describe("Did the user's task actually get done?"),
    human_intervention: z.boolean().optional().describe("Did a human have to step in to finish/fix it?"),
    user_rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional().describe("End-user signal: 1 up, -1 down"),
    baseline_latency_ms: z.number().int().min(0).max(10 * 60 * 1000).optional().describe("Latency without the skill (or previous version)"),
    baseline_tokens: z.number().int().min(0).max(2_000_000).optional().describe("Tokens without the skill (or previous version)"),
    // ---- Counterfactual A/B attribution
    arm: z.enum(["control", "treatment"]).optional().describe("control = skill off / previous version"),
    experiment_key: z.string().max(96).optional().describe("Experiment id, e.g. code-reviewer:on-vs-off"),
    workspace_hash: z.string().max(64).optional().describe("Opaque workspace id for per-customer ROI"),
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
      _arm: input.arm ?? null,
      _experiment_key: input.experiment_key ?? null,
      _task_completed: input.task_completed ?? null,
      _human_intervention: input.human_intervention ?? null,
      _user_rating: input.user_rating ?? null,
      _baseline_latency_ms: input.baseline_latency_ms ?? null,
      _baseline_tokens: input.baseline_tokens ?? null,
      _workspace_hash: input.workspace_hash ?? null,
    } as any);
    if (error) return json({ ok: false, error: error.message });
    return json({ ok: true, execution_id: data });
  },
});

export const reportOutcomeTool = defineTool({
  name: "report_skill_outcome",
  description:
    "[TRUST] Attach the OUTCOME of a previously reported execution (task completed, human intervention needed, thumbs up/down) once you know it. Feeds the customer-value/uplift reports. Pass the execution_id returned by report_skill_execution.",
  parameters: z.object({
    execution_id: z.string().uuid(),
    task_completed: z.boolean().optional(),
    human_intervention: z.boolean().optional(),
    user_rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
    agent_fp: z.string().max(128).optional().describe("Same fingerprint used when reporting the execution"),
  }),
  execute: async (input) => {
    const { data, error } = await supabaseAdmin.rpc("attach_execution_outcome", {
      _execution_id: input.execution_id,
      _task_completed: input.task_completed ?? null,
      _human_intervention: input.human_intervention ?? null,
      _user_rating: input.user_rating ?? null,
      _agent_fp: input.agent_fp ?? null,
    } as any);
    if (error) return json({ ok: false, error: error.message });
    return json({ ok: true, updated: data === true });
  },
});

export const getUpliftTool = defineTool({
  name: "get_skill_uplift",
  description:
    "[DISCOVER/TRUST] Counterfactual 'skill on vs. off' result for a primitive: completion rate per arm, absolute/relative uplift and whether the difference is statistically significant. Use it to justify installing a skill with numbers, not vibes.",
  parameters: z.object({
    slug: z.string().min(1),
    days: z.number().int().min(1).max(365).optional(),
  }),
  execute: async ({ slug, days }) => {
    const { data, error } = await supabaseAdmin.rpc("get_skill_uplift", {
      _slug: slug,
      _days: days ?? 30,
    } as any);
    if (error) return json({ ok: false, error: error.message });
    const arms = ((data as any)?.arms ?? {}) as Record<string, any>;
    const c = arms.control ?? { n: 0, completed: 0 };
    const t = arms.treatment ?? { n: 0, completed: 0 };
    const stats = twoProportionUplift(
      { n: Number(c.n ?? 0), completed: Number(c.completed ?? 0) },
      { n: Number(t.n ?? 0), completed: Number(t.completed ?? 0) },
    );
    return json({ ok: true, slug, window_days: days ?? 30, arms, uplift: stats });
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
    "[PRIVATE UPLOAD] Push local primitive(s) into the author's PRIVATE workspace. Files are normalised by the SkillForge author pipeline and stored as private drafts owned by the token holder — NOT visible in the public marketplace, search, or trust leaderboard. To list a draft for sale on the marketplace, the author must submit it for admin review from the website UI (/account/packages). This MCP tool intentionally has no `publish` parameter so agents cannot expose a user's skill publicly without their consent. Authenticates via the OAuth bearer of the active MCP session — no extra personal token needed. Pass an `idempotency_key` (any opaque string you generate once per upload) so retries on network failures don't create duplicates. Batching: the first file is processed inline; any additional files are queued and normalised by a background worker (drained roughly once per minute) — the response includes `queued: [{id, filename}]` so the caller can poll progress at /account/packages.",
  parameters: z.object({
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
    auth_token: z
      .string()
      .min(8)
      .optional()
      .describe("Deprecated. Ignored when the request already carries an OAuth bearer; only used as a fallback for legacy personal MCP tokens."),
    idempotency_key: z
      .string()
      .min(8)
      .max(200)
      .optional()
      .describe("Opaque string generated once per logical upload. Repeats within 24h return the original response and DO NOT re-process the files."),
    dry_run: z
      .boolean()
      .default(false)
      .describe("Validate the files WITHOUT authenticating or persisting anything: returns per-file inferred type + prompt-injection guard verdict so an agent can confirm a file would be accepted before connecting OAuth. No drafts are created, no model budget spent."),
  }),
  execute: async ({ auth_token, files, idempotency_key, dry_run }, ctx) => {
    // Dry-run preview is anonymous, side-effect-free, and zero-cost — it never
    // touches the DB or the LLM, so it needs no auth. Lets agents test the flow.
    if (dry_run) {
      const preview = previewUpload(files);
      const acceptable = preview.filter((p) => p.accepted).length;
      return json({
        dry_run: true,
        files: preview.length,
        acceptable,
        rejected: preview.length - acceptable,
        preview,
        next_step:
          "This was a validation-only preview — nothing was uploaded. To persist these as PRIVATE drafts, call upload_packages again with dry_run omitted while connected via OAuth.",
      });
    }
    const sessionUserId = (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
    const userId = sessionUserId ?? (auth_token ? await resolveUserFromToken(auth_token) : null);
    if (!userId)
      return json({
        error: "unauthorized",
        hint: "Connect via OAuth (the host opens https://superagentskill.com/oauth/authorize automatically) — no personal token needed.",
      });
    if (idempotency_key) {
      const cached = await getIdempotent(userId, "upload_packages", idempotency_key);
      if (cached) return json({ ...(cached as object), replayed: true });
    }
    try {
      // Always private. Marketplace listing requires an explicit user action in the UI.
      // Hard wall-clock cap: the accept path is queue-only (no model calls),
      // so anything slower than this is a stuck dependency, not real work.
      // Returning a schema-valid payload beats letting the host time out at 35s.
      const TOOL_BUDGET_MS = 20_000;
      const { results, queued } = await Promise.race([
        processBulkUpload(supabaseAdmin as any, userId, files),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("accept_timeout: upload queue did not respond in 20s")), TOOL_BUDGET_MS),
        ),
      ]);
      const done = results.filter((r) => r.status === "done").length;
      const queuedCount = results.filter((r) => r.status === "queued").length;
      const failed = results.filter((r) => r.status === "failed").length;
      const errorMessages = results
        .filter((r) => r.status === "failed")
        .map((r) => `${r.name}: ${r.error ?? "unknown"}`);
      // STRICT response shape — every key below is always present, and
      // `results` always carries exactly one row per input file with an
      // explicit `status`. Clients (and our SDK types) can validate this
      // without conditionals.
      const response = {
        accepted: done + queuedCount,
        uploaded: done,
        queued_count: queuedCount,
        failed,
        visibility: "private_draft" as const,
        results: results.map((r) => ({
          name: r.name,
          status: r.status,
          ok: r.ok,
          type: r.type ?? null,
          slug: r.slug ?? null,
          package_id: r.package_id ?? null,
          job_id: r.job_id ?? null,
          forge_report_url: r.forge_report_url ?? null,
          error: r.error ?? null,
        })),
        queued: queued.map((j) => ({ id: j.id, filename: j.filename, inferred_type: j.inferred_type })),
        error_summary: errorMessages.length > 0 ? errorMessages.slice(0, 3).join(" · ") : null,
        next_step:
          queuedCount > 0
            ? `${queuedCount} file(s) accepted and queued. The background worker normalises them within ~1 minute — open https://superagentskill.com/account/packages to watch them appear.`
            : done > 0
              ? "Open https://superagentskill.com/account/packages to submit a draft for admin review."
              : "No file was accepted. See `error_summary` for the cause and retry.",
      };
      if (idempotency_key && response.accepted > 0) {
        // Only cache runs that accepted at least one file so a transient
        // failure doesn't poison the idempotency key for 24h.
        await putIdempotent(userId, "upload_packages", idempotency_key, response);
      }
      return json(response);
    } catch (e: any) {
      const msg = e?.message ?? "upload_failed";
      console.error(`[mcp.upload_packages] user=${userId} unexpected:`, e);
      // Keep the failure inside the same shape so hosts that validate the
      // tool output don't report "response did not match schema".
      return json({
        accepted: 0,
        uploaded: 0,
        queued_count: 0,
        failed: files.length,
        visibility: "private_draft" as const,
        results: files.map((f) => ({
          name: f.name,
          status: "failed" as const,
          ok: false,
          type: f.type ?? null,
          slug: null,
          package_id: null,
          job_id: null,
          forge_report_url: null,
          error: msg,
        })),
        queued: [],
        error_summary: msg,
        next_step: "Upload failed before anything was persisted. Retry with the same idempotency_key.",
      });
    }
  },
});

// ============================================================================
// Methodology + local-skill review
// ----------------------------------------------------------------------------
// PRIMARY value of this MCP server: help an external agent (Claude, Codex, …)
// significantly upgrade a *local* skill / playbook / soul / guardrail using
// the Super Agent Skill methodology. Discovery / download is secondary.
// ============================================================================

// ----------------------------------------------------------------------------
// SECRET SAUCE — proprietary evaluation engine.
//
// Design rule: this module NEVER ships its rubric, its detection signals, its
// weights, or per-check pass/fail booleans over the wire. Exposing those once
// would let any model internalise the evaluator and stop coming back. The MCP
// surface returns only: a number, a band, and outcome-level directives that
// describe WHAT to improve for THIS file — never HOW we measured it.
//
// Everything between this banner and the tool exports is server-private.
// ----------------------------------------------------------------------------

const ENGINE = "sas-eval/5";

type PillarId =
  | "identity"
  | "scope"
  | "procedure"
  | "examples"
  | "guardrails"
  | "trust"
  | "portability";

const PILLAR_TITLE: Record<PillarId, string> = {
  identity: "Identity",
  scope: "Scope & Triggers",
  procedure: "Procedure",
  examples: "Examples",
  guardrails: "Guardrails",
  trust: "Trust hooks",
  portability: "Portability",
};

const TYPE_WEIGHTS: Record<string, Partial<Record<PillarId, number>>> = {
  skill: { identity: 1, scope: 1.2, procedure: 1.3, examples: 1.3, guardrails: 1.1, trust: 1, portability: 0.9 },
  playbook: { identity: 0.8, scope: 1.1, procedure: 1.8, examples: 1.2, guardrails: 1.1, trust: 1, portability: 0.8 },
  soul: { identity: 2, scope: 0.8, procedure: 0.6, examples: 0.9, guardrails: 1.2, trust: 0.9, portability: 0.9 },
  guardrail: { identity: 0.7, scope: 1, procedure: 1, examples: 1, guardrails: 2, trust: 1.1, portability: 0.9 },
};

// ----------------------------------------------------------------------------
// Doc class — declared by the caller or inferred from the content shape. Drives
// expected_ceiling and the structural/content axis split, so a long-form
// governance doc isn't graded on the same scale as a kebab-case SKILL.md.
// This is the single most-requested fix from real-world iteration: stop
// rewarding format-chasing and stop hiding the realistic ceiling from the
// operator until they've burned 5 retries discovering it empirically.
// ----------------------------------------------------------------------------
type DocClass = "skill" | "governance" | "playbook-ops" | "guardrail-ops";
type DocClassInput = DocClass | "auto";

const DOC_CLASS_CEILING: Record<DocClass, number> = {
  skill: 95,
  "playbook-ops": 92,
  "guardrail-ops": 90,
  governance: 82,
};

const DOC_CLASS_RATIONALE: Record<DocClass, string> = {
  skill: "Calibrated for kebab-case SKILL.md with named sections and worked input/output. Grade A is realistically reachable.",
  "playbook-ops": "Multi-step ops procedures. Heavier weight on the procedure axis; A reachable with explicit branches + stop condition.",
  "guardrail-ops": "Policy/guardrail doc. A reachable when enforcement is described as deterministic (gate + exit code + tests), not just prose.",
  governance: "Long-form governance/policy prose. Realistic ceiling is around B — the engine's structural signals are calibrated for skill files, so content quality matters more than format here. Actions targeting structural format above this ceiling are cosmetic.",
};

function inferDocClass(text: string, type: string): DocClass {
  if (type === "playbook") return "playbook-ops";
  if (type === "guardrail") return "guardrail-ops";
  if (type === "soul") return "governance";
  // Heuristic for skill type: long paragraphs + few bullets/headings = governance prose.
  const lines = text.split("\n");
  const bulletLines = lines.filter((l) => /^\s*([-*]|\d+[.)])\s/.test(l)).length;
  const headingLines = lines.filter((l) => /^#{1,6}\s/.test(l)).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const avgParaLen = paragraphs.length
    ? paragraphs.reduce((a, p) => a + p.length, 0) / paragraphs.length
    : 0;
  const bulletRatio = lines.length ? bulletLines / Math.max(1, lines.length) : 0;
  if (avgParaLen > 320 && bulletRatio < 0.08 && headingLines < 6) return "governance";
  return "skill";
}

// Signals that measure *format/structure* rather than substantive content.
// Indices match the SIGNALS arrays below. Used to split overall_score into
// structural vs content_quality_score so the verdict isn't dominated by format.
const STRUCTURAL_SIGNAL_INDEX: Record<PillarId, ReadonlyArray<number>> = {
  identity: [],
  scope: [],
  procedure: [0, 1], // numbered/bulleted list pattern, input/output keyword block
  examples: [],
  guardrails: [],
  trust: [2], // output schema / structured result keywords
  portability: [2, 3, 5], // long file penalty, proprietary frontmatter penalty, plain-markdown declaration
};

function isStructural(id: PillarId, idx: number): boolean {
  return STRUCTURAL_SIGNAL_INDEX[id].includes(idx);
}

// Fast non-crypto hash so callers can pass `previous_hash` from the last run
// and get a delta without us keeping any server state. fnv-1a 32-bit.
function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// Pre-score sanity check. The engine penalises summaries (rightly — it can't
// score what it can't see), but the operator deserves to know BEFORE the score
// arrives that the input looks truncated, not after reading a misleading "F".
function inputWarning(text: string): "short_input" | "summary_markers" | "outline_only" | null {
  const t = text.trim();
  if (t.length < 400) return "short_input";
  // Strip fenced code blocks and inline code BEFORE scanning for truncation
  // markers. A `...` inside a code fence or inline backticks is almost always
  // a Python spread, an ellipsis in a template, or a placeholder in an
  // example — NOT a signal that the document was truncated. Scanning the raw
  // text was producing false-positive `summary_markers` warnings that killed
  // the semantic pass on otherwise valid skills.
  // Also strip YAML frontmatter: `description: "algo — condensado"` is normal
  // metadata prose, not evidence that the body was cut. Em dashes and inline
  // ellipses are never markers on their own.
  const prose = t
    .replace(/^---\n[\s\S]*?\n---/, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ");
  // Only bracketed / explicit elision phrases count. Bare words like
  // "condensed", "resumido" or "abbreviated" appear constantly in legitimate
  // prose ("a condensed deal memo"), so they no longer trip the warning.
  if (
    /(\[truncated\]|\[\.\.\.\]|\[…\]|\[snip\]|\[omitted\]|\[resumido\]|\[truncado\]|truncated for brevity|omitted for brevity|rest omitted|remainder omitted|resto omitido|omitido por brevidade|abgeschnitten für kürze|tronqué par souci de brièveté)/i.test(
      prose,
    )
  ) {
    return "summary_markers";
  }
  // A bare `...` only counts as a truncation marker when it stands alone on
  // its own line (or line-end) — that's the classic "…rest omitted…" pattern.
  // Prose ellipses in the middle of a sentence don't qualify.
  if (/(^|\n)\s*(\.{3,}|…)\s*($|\n)/.test(prose)) {
    return "summary_markers";
  }

  const lines = t.split("\n");
  const headings = lines.filter((l) => /^#{1,6}\s/.test(l)).length;
  // Content lines include bullets and numbered list items — skills are
  // legitimately bullet/step dense, so those ARE the body, not absence of it.
  // Only flag an outline when headings dominate and there's almost no content
  // of ANY kind underneath them (true skeleton). This avoids the false
  // positive where a substantive, well-structured SKILL.md (lots of lists
  // under named sections) was misread as "headings without body".
  const contentLines = lines.filter(
    (l) => l.trim().length > 0 && !/^#{1,6}\s/.test(l)
  ).length;
  if (headings >= 6 && contentLines < headings) return "outline_only";
  return null;
}


// Each signal is bilingual (EN + PT-BR alternates) so non-English docs are not
// silently zeroed. `kind`: "positive" = presence improves score; "negative" =
// presence is a penalty (e.g. vendor lock-in for portability).
type Signal = {
  w: number;
  kind: "positive" | "negative";
  primary: RegExp;
  secondary?: RegExp;
};

// Multilingual signals: EN + PT + ES + FR + DE + IT alternates so non-English
// docs are not silently zeroed. Add new languages by appending alternates here.
const SIGNALS: Record<PillarId, Signal[]> = {
  identity: [
    { w: 1, kind: "positive", primary: /\b(you are|role:|persona:|act as|você é|papel:|atue como|eres|tú eres|actúa como|rol:|tu es|agis comme|rôle:|du bist|handle als|rolle:|sei un|agisci come|ruolo:)\b/i, secondary: /\b(assistant|agent that|assistente|agente que|asistente|agente que|assistant|agent qui|assistent|agent der|assistente|agente che)\b/i },
    { w: 1, kind: "positive", primary: /\b(values?:|principles?:|cares? about|believe|valores?:|princípios?:|acredita|valores:|principios:|cree|valeurs:|principes:|croit|werte:|prinzipien:|glaubt|valori:|principi:|crede)\b/i, secondary: /\b(prioriti[sz]e|stands? for|prioriza|prioriza|prioritiser|priorisier|prioritizz)/i },
    { w: 0.8, kind: "positive", primary: /\b(voice|tone|writing style|voz|tom|estilo de escrita|voz|tono|estilo|voix|ton|style|stimme|tonfall|stil|voce|tono|stile)\b/i, secondary: /\b(concise|formal|friendly|conciso|amigável|conciso|amistoso|concis|amical|prägnant|freundlich|conciso|amichevole)/i },
    { w: 1, kind: "positive", primary: /\b(non-goals?|will not|won't|out of scope|não-objetivos?|não fará|fora de escopo|no-objetivos|fuera de alcance|hors[- ]périmètre|nicht[- ]ziele|außerhalb|fuori ambito|non[- ]obiettivi)\b/i, secondary: /\b(never|avoid|nunca|evita|nunca|evitar|jamais|éviter|niemals|vermeiden|mai|evitare)/i },
    { w: 1, kind: "positive", primary: /\b(refus|decline|cannot help|won't assist|recus|negar|não pode ajudar|rechaz|negar|no puede ayudar|refus|décline|ne peut aider|verweiger|ablehn|kann nicht helfen|rifiut|declin|non può aiutare)/i, secondary: /\b(escalate|hand off|escala|encaminha|escalar|derivar|escalader|transmettre|eskalier|weiterleiten|inoltr|trasferi)/i },
  ],
  scope: [
    { w: 1.2, kind: "positive", primary: /\b(use when|use this when|job:|purpose:|when to use|use quando|propósito:|quando usar|usar cuando|propósito:|cuándo usar|utiliser quand|but:|quand utiliser|verwenden wenn|zweck:|wann verwenden|usare quando|scopo:|quando usare)\b/i, secondary: /\b(applies to|aplica-se a|aplica a|s'applique à|gilt für|si applica a)/i },
    { w: 1, kind: "positive", primary: /\b(trigger|invoke|activate when|gatilho|acionar|ativar quando|disparar quando|quando disparar|quando invocar|quando chamar|disparador|activar cuando|déclencheur|activer quand|auslöser|aktivieren wenn|trigger|attivare quando)\b/i, secondary: /\b(when the user|quando o usuário|quando o agente|cuando el usuario|quand l'utilisateur|wenn der nutzer|quando l'utente)/i },
    { w: 1, kind: "positive", primary: /\b(anti-trigger|do not use|skip when|not for|anti-gatilho|não usar|quando não usar|não use quando|não se aplica|pular quando|não para|no usar|saltar cuando|ne pas utiliser|sauter quand|nicht verwenden|überspringen wenn|non usare|saltare quando)\b/i, secondary: /\b(unless|except when|a menos que|exceto quando|salvo|a menos que|excepto cuando|sauf si|à moins que|es sei denn|außer wenn|a meno che|tranne quando)/i },
    { w: 0.8, kind: "positive", primary: /\b(target user|audience|intended for|público-alvo|audiência|destinado a|usuario objetivo|audiencia|destinado a|utilisateur cible|public|destiné à|zielgruppe|nutzer|bestimmt für|utente target|pubblico|destinato a)/i, secondary: /\b(role of the user|papel do usuário|rol del usuario|rôle de l'utilisateur|rolle des nutzers|ruolo dell'utente)/i },
  ],
  procedure: [
    { w: 1.4, kind: "positive", primary: /^\s*\d+[.)]/m, secondary: /^\s*[-*] /m },
    { w: 1.1, kind: "positive", primary: /\b(input:|output:|success:|done when|entrada:|saída:|recebe:|retorna:|devolve:|sucesso:|pronto quando|entrada:|salida:|éxito:|hecho cuando|entrée:|sortie:|succès:|terminé quand|eingabe:|ausgabe:|erfolg:|fertig wenn|ingresso:|uscita:|successo:|fatto quando)|✓/i, secondary: /\b(returns?:|produces?:|retorna:|produz:|devuelve:|retourne:|gibt zurück:|restituisce:)/i },
    { w: 1, kind: "positive", primary: /\b(if .*(then|→)|otherwise|else if|branch|fork|se .*(então|→)|caso contrário|senão|si .*(entonces|→)|de lo contrario|si .*(alors|→)|sinon|wenn .*(dann|→)|sonst|se .*(allora|→)|altrimenti)/i, secondary: /\b(case|depending on|caso|dependendo|caso|dependiendo|cas|selon|fall|abhängig|caso|a seconda)/i },
    { w: 1, kind: "positive", primary: /\b(stop when|definition of done|finish when|terminate|parar quando|definição de pronto|finalizar quando|parar cuando|definición de hecho|terminar cuando|arrêter quand|définition de terminé|finir quand|stoppen wenn|definition fertig|beenden wenn|fermare quando|definizione di fatto|finire quando)/i, secondary: /\b(until|até|hasta|jusqu'à|bis|finché)/i },
  ],
  examples: [
    { w: 1.3, kind: "positive", primary: /\b(example|sample|worked|walkthrough|exemplo|amostra|passo[- ]a[- ]passo|ejemplo|muestra|paso a paso|exemple|échantillon|pas à pas|beispiel|muster|schritt für schritt|esempio|campione|passo passo)/i, secondary: /\b(e\.g\.|for instance|por exemplo|tipo assim|como por exemplo|por ejemplo|par exemple|zum beispiel|z\.b\.|ad esempio)/i },
    { w: 1.2, kind: "positive", primary: /\b(bad example|anti-example|wrong:|fails when|counter-?example|exemplo ruim|mau exemplo|exemplo negativo|não faça|errado:|não recomendado|falha quando|contra-?exemplo|mal ejemplo|incorrecto:|falla cuando|contra-?ejemplo|mauvais exemple|incorrect:|échoue quand|contre-?exemple|schlechtes beispiel|falsch:|scheitert wenn|gegenbeispiel|esempio sbagliato|errato:|fallisce quando|controesempio)|❌/i, secondary: /\b(pitfall|mistake|armadilha|erro comum|pegadinha|trampa|error común|piège|erreur|fallstrick|fehler|insidia|errore)/i },
    { w: 1, kind: "positive", primary: /\b(messy|edge case|ambiguous|partial input|real-world|caso extremo|ambíguo|caso real|mundo real|caso límite|ambiguo|entrada parcial|caso real|cas limite|ambigu|entrée partielle|monde réel|grenzfall|mehrdeutig|teileingabe|reale welt|caso limite|ambiguo|input parziale|mondo reale)/i, secondary: /\b(unhappy path|corner case|caminho infeliz|caso de canto|caso de esquina|cas extrême|sonderfall|caso d'angolo)/i },
  ],
  guardrails: [
    { w: 1.2, kind: "positive", primary: /\b(failure mode|known issue|risk:|pitfall|threat model|modo de falha|falhas conhecidas|pontos? de falha|problema conhecido|risco:|riscos:|armadilha|modelo de ameaça|modo de fallo|problema conocido|riesgo:|modelo de amenaza|mode d'échec|problème connu|risque:|modèle de menace|fehlermodus|bekanntes problem|risiko:|bedrohungsmodell|modalità di guasto|problema noto|rischio:|modello di minaccia)/i, secondary: /\b(can go wrong|caveat|pode dar errado|pode falhar|ressalva|puede fallar|salvedad|peut échouer|mise en garde|kann schiefgehen|vorbehalt|può andare male|avvertenza)/i },
    { w: 1.2, kind: "positive", primary: /\b(mitigat|prevent|guard against|defen[sc]e|countermeasure|mitiga|preven[ir]|proteger contra|defesa|contramedida|mitigar|prevenir|proteger contra|defensa|contramedida|atténu|prévenir|défense|contre[- ]mesure|abmilder|verhindern|verteidigung|gegenmaßnahme|mitigare|prevenire|difesa|contromisura)/i, secondary: /\b(to avoid|para evitar|para evitar|pour éviter|um zu vermeiden|per evitare)/i },
    { w: 1.3, kind: "positive", primary: /\b(prompt injection|untrusted|treat .* as data|ignore instructions|injeção de prompt|não-confiável|tratar .* como dados|ignorar instruções|inyección de prompt|no confiable|tratar .* como datos|ignorar instrucciones|injection de prompt|non fiable|traiter .* comme des données|ignorer les instructions|prompt[- ]injektion|nicht vertrauenswürdig|als daten behandeln|anweisungen ignorieren|iniezione di prompt|non affidabile|trattare .* come dati|ignorare istruzioni)/i, secondary: /\b(sanitiz|do not follow instructions|sanitiza|não seguir instruções|saniti[zs]ar|no seguir instrucciones|assainir|ne pas suivre les instructions|bereinigen|anweisungen nicht befolgen|sanific|non seguire istruzioni)/i },
    { w: 1, kind: "positive", primary: /\b(pii|secret|redact|do not log|citation|cite sources|lgpd|gdpr|dados pessoais|segredo|redigir|não registrar|citação|citar fontes|datos personales|secreto|redactar|no registrar|cita|citar fuentes|données personnelles|secret|caviarder|ne pas journaliser|citation|citer les sources|personenbezogene daten|geheim|schwärzen|nicht protokollieren|zitat|quellen zitieren|dati personali|segreto|oscurare|non registrare|citazione|citare fonti)\b/i, secondary: /\b(confidential|sensitive data|confidencial|dados sensíveis|confidencial|datos sensibles|confidentiel|données sensibles|vertraulich|sensible daten|confidenziale|dati sensibili)/i },
    // Enforcement strength: deterministic gates / regression suites / fail-closed
    { w: 1.4, kind: "positive", primary: /\b(deterministic gate|exit code|regression suite|policy engine|opa\b|cedar\b|fail[- ]closed|automated test|external enforcement|gate determinístico|código de saída|suíte de regressão|motor de política|falha[- ]segura|teste automatizado|aplicación externa|puerta determinista|código de salida|suite de regresión|motor de políticas|fallo[- ]seguro|prueba automatizada|porte déterministe|code de sortie|suite de régression|moteur de politique|test automatisé|deterministisches gate|exit-code|regressionssuite|richtlinien-engine|fehlersicher|automatisierter test|gate deterministico|codice di uscita|suite di regressione|motore di policy|fail-safe|test automatizzato)/i, secondary: /\b(regex check|ast check|signed (release|bundle)|verificação por regex|verificação de ast|release assinado|verificación regex|verificación ast|release firmado|vérification regex|version signée|signierter release|controllo regex|release firmato)/i },
  ],
  trust: [
    { w: 1, kind: "positive", primary: /\b(validated on|tested on|claude|gpt-|gemini|llama|validado em|testado em|avaliado em|verificado em|homologado em|validado en|probado en|validé sur|testé sur|validiert auf|getestet auf|validato su|testato su)/i, secondary: /\b(model:|benchmarked|modelo:|avaliado em|modelo:|evaluado|modèle:|évalué|modell:|bewertet|modello:|valutato)/i },
    { w: 1.1, kind: "positive", primary: /\b(acceptance criteri|success criter|self-eval|self check|critério de aceitação|critérios de aceitação|critério de sucesso|auto-avaliação|autoavaliação|criterio de aceptación|criterio de éxito|autoevaluación|critère d'acceptation|critère de succès|auto-évaluation|akzeptanzkriteri|erfolgskriteri|selbstbewertung|criterio di accettazione|criterio di successo|auto-valutazione)/i, secondary: /\b(pass if|must satisfy|aprova se|passa se|deve satisfazer|precisa satisfazer|aprueba si|debe satisfacer|réussit si|doit satisfaire|besteht wenn|muss erfüllen|passa se|deve soddisfare)/i },
    { w: 1.1, kind: "positive", primary: /\b(output schema|return json|structured (output|result)|esquema de saída|schema de saída|retornar json|devolver json|saída estruturada|output estruturado|resultado estruturado|esquema de salida|devolver json|salida estructurada|schéma de sortie|retourner json|sortie structurée|ausgabeschema|json zurückgeben|strukturierte ausgabe|schema di output|restituire json|output strutturato)/i, secondary: /\b(named sections|format:|seções nomeadas|formato:|secciones nombradas|formato:|sections nommées|format:|benannte abschnitte|format:|sezioni nominate|formato:)/i },
    { w: 0.9, kind: "positive", primary: /\b(report_execution|telemetry|emit metrics|telemetria|emitir métricas|telemetría|emitir métricas|télémétrie|émettre des métriques|telemetrie|metriken senden|telemetria|emettere metriche)/i, secondary: /\b(track success|rastrear sucesso|rastrear éxito|suivre le succès|erfolg verfolgen|tracciare successo)/i },
  ],
  portability: [
    // Vendor lock-in (negative)
    { w: 1, kind: "negative", primary: /\b(only works on|requires claude|requires gpt|requires gemini|claude-only|funciona apenas em|requer claude|requer gpt|requer gemini|funciona solo en|requiere claude|requiere gpt|fonctionne uniquement sur|nécessite claude|nécessite gpt|funktioniert nur auf|benötigt claude|benötigt gpt|funziona solo su|richiede claude|richiede gpt)/i, secondary: /\bvendor-specific\b|específico de fornecedor|específico del proveedor|spécifique au fournisseur|anbieterspezifisch|specifico del fornitore/i },
    { w: 1, kind: "negative", primary: /\b(anthropic sdk|openai sdk|google ai sdk|tool_use block)\b/i },
    { w: 0.6, kind: "negative", primary: /.{32001,}/s },
    { w: 0.6, kind: "negative", primary: /^---[\s\S]*?(lovable:|proprietary:|internal:)/m },
    // Cross-runtime evidence (positive)
    { w: 1.1, kind: "positive", primary: /\b(model[- ]agnostic|runtime[- ]independent|works on (claude|gpt|gemini).*and.*(claude|gpt|gemini)|cross[- ]runtime|agnóstico (de|a) modelo|independente de runtime|agnóstico de modelo|independiente de runtime|agnostique au modèle|indépendant du runtime|modellunabhängig|laufzeitunabhängig|agnostico al modello|indipendente dal runtime)/i, secondary: /\b(portable across|portátil entre|portable entre|portable entre|portabel zwischen|portabile tra)/i },
    { w: 0.9, kind: "positive", primary: /\b(plain markdown|standard skill\.md|skill\.md format|markdown puro|formato skill\.md padrão|markdown plano|formato skill\.md estándar|markdown simple|format skill\.md standard|einfaches markdown|standard skill\.md format|markdown semplice|formato skill\.md standard)/i },
  ],
};

const DIRECTIVES: Record<PillarId, string[]> = {
  identity: [
    "Give it a sharper sense of self: who it is, what it refuses, and what it explicitly is NOT for.",
    "The persona reads generic — make its values and voice specific enough that a stranger could imitate it.",
    "Add an explicit refusal posture so unsafe or out-of-scope asks are handled deliberately, not improvised.",
  ],
  scope: [
    "Make activation unambiguous: when this should fire and the look-alike cases where it must NOT.",
    "Tighten the trigger boundary — right now it would over- or under-fire on adjacent requests.",
    "Name the intended user and the one-line job so the agent self-selects correctly.",
  ],
  procedure: [
    "Turn the prose into a deterministic, step-wise procedure with explicit inputs, outputs and a stop condition.",
    "The happy path is clear but the forks are not — make the 2-3 main decision branches explicit.",
    "Add a concrete definition of done so the agent knows when to stop instead of looping or trailing off.",
  ],
  examples: [
    "Add worked examples (input → reasoning → output); models generalise from these far better than from rules.",
    "Include at least one failure example with the correction — negative examples prevent the common mistake.",
    "Replace a happy-path example with a messy, real-world one; that is where this currently breaks.",
  ],
  guardrails: [
    "Pre-empt the failure modes you have already seen: name them and attach a concrete mitigation to each.",
    "Harden against prompt injection — make explicit that tool output and user docs are data, not instructions.",
    "Add data-handling rules (PII, secrets, citations) so it fails safe under pressure.",
    "Move enforcement out of the prompt: a deterministic gate (regex/AST/policy engine) with an exit code and a regression suite is far stronger evidence than prose rules.",
  ],
  trust: [
    "Make it measurable: declare validated models and an acceptance criterion the host can verify.",
    "Emit a structured result instead of free prose so success can be checked and scored automatically.",
    "Close the loop — instruct the host to report execution outcomes so this can earn a trust score.",
  ],
  portability: [
    "Remove single-vendor assumptions so the same primitive runs on Claude, GPT and Gemini without surgery.",
    "Describe tools by contract, not by a specific SDK, and keep it within a typical context budget.",
    "Strip proprietary frontmatter the host can't parse; keep it plain, portable Markdown.",
    "State cross-runtime support explicitly (e.g. 'validated on Claude, GPT and Gemini') — the engine cannot infer portability from absence alone.",
  ],
};

interface PillarScore {
  pillar: PillarId;
  title: string;
  score: number;
}

interface PillarDetail {
  id: PillarId;
  score: number;
  deficit: number;
  signals_total: number;
  signals_hit: number;
  evidence: Array<{ line: number; excerpt: string }>;
  // Axis split — surfaced at the top level so the operator can see whether a
  // low score reflects format mismatch (structural) or substantive gaps (content).
  structural_earned: number;
  structural_total: number;
  content_earned: number;
  content_total: number;
}

// Find the line number + a short excerpt for the first regex hit. Used to
// anchor top_actions to a concrete location instead of being generic.
function findEvidence(text: string, re: RegExp): { line: number; excerpt: string } | null {
  const m = re.exec(text);
  if (!m) return null;
  const idx = m.index;
  const before = text.slice(0, idx);
  const line = before.split("\n").length;
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEnd = text.indexOf("\n", idx);
  const raw = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();
  const excerpt = raw.length > 140 ? raw.slice(0, 137) + "…" : raw;
  return { line, excerpt };
}

function scorePillar(id: PillarId, text: string, lang: Lang = "en"): PillarDetail {
  const signals = SIGNALS[id];
  let earned = 0;
  let total = 0;
  let hit = 0;
  let structEarned = 0;
  let structTotal = 0;
  let contEarned = 0;
  let contTotal = 0;
  const evidence: PillarDetail["evidence"] = [];

  signals.forEach((s, idx) => {
    total += s.w;
    const primaryHit = s.primary.test(text);
    const secondaryHit = s.secondary ? s.secondary.test(text) : false;
    let frac = primaryHit ? 1 : secondaryHit ? 0.5 : 0;
    if (s.kind === "negative") frac = 1 - frac;
    const earnedHere = frac * s.w;
    earned += earnedHere;
    if (isStructural(id, idx)) {
      structTotal += s.w;
      structEarned += earnedHere;
    } else {
      contTotal += s.w;
      contEarned += earnedHere;
    }
    if (primaryHit || secondaryHit) {
      hit += 1;
      const ev = findEvidence(text, primaryHit ? s.primary : (s.secondary as RegExp));
      if (ev) evidence.push(ev);
    }
  });

  let score = total > 0 ? Math.round((earned / total) * 100) : 0;
  const positiveSignals = signals.filter((s) => s.kind === "positive").length;
  const positiveHits = signals.filter(
    (s) => s.kind === "positive" && (s.primary.test(text) || (s.secondary && s.secondary.test(text)))
  ).length;
  const negativeHits = signals.filter(
    (s) => s.kind === "negative" && (s.primary.test(text) || (s.secondary && s.secondary.test(text)))
  ).length;
  // Portability is mostly penalty-driven (vendor lock-in). When there are no
  // positive declarations AND no lock-in detected, the artifact is "portable
  // by construction" — that's a soft pass, not a gap. Pinning it to a flat 60
  // (the generic no-positive cap) made it look permanently broken/neutral and
  // robbed it of diagnostic range. Give it a clear baseline so the dimension
  // actually moves: lock-in pulls it down, an explicit cross-runtime
  // declaration lifts it into "strong".
  if (id === "portability" && positiveHits === 0 && negativeHits === 0) {
    score = 68;
  } else if (positiveSignals > 0 && positiveHits === 0) {
    // Language-fairness: the "no positive signals" cap sits at 60 for EN docs,
    // where the detector has the richest vocabulary coverage. For PT/ES/FR/DE/IT
    // the detector has narrower coverage by construction, so a native-language
    // skill can miss keyword hits even when the content is present. Raise the
    // cap slightly for non-EN docs to close the structural gap; the semantic
    // pass (see computeReview) then does the substantive re-scoring.
    const nonEnCap = lang !== "en" && lang !== "other" ? 68 : 60;
    score = Math.min(score, nonEnCap);
  }
  score = Math.max(0, Math.min(100, score));

  return {
    id,
    score,
    deficit: 100 - score,
    signals_total: signals.length,
    signals_hit: hit,
    evidence,
    structural_earned: structEarned,
    structural_total: structTotal,
    content_earned: contEarned,
    content_total: contTotal,
  };
}

function gradeBand(n: number): string {
  if (n >= 90) return "A — battle-ready";
  if (n >= 78) return "B — solid, minor gaps";
  if (n >= 62) return "C — usable, real gaps";
  if (n >= 45) return "D — needs work";
  return "F — rewrite recommended";
}

function statusBand(n: number): "strong" | "adequate" | "weak" {
  return n >= 78 ? "strong" : n >= 55 ? "adequate" : "weak";
}

// Cheap heuristic — counts function-words across major Latin-script languages.
// Used to emit a `language` hint, choose localized messages, and decide a
// low-confidence caveat. Does NOT alter scoring.
//
// Fairness note: PT/ES/FR/DE/IT docs often mix in English technical jargon
// ("input", "output", "trigger", code blocks), which used to flip detection
// to "en" — dragging the writer into the EN-only signal path and unfairly
// depressing their score. Diacritics are language-specific and effectively
// impossible to fake, so we weight each diacritic hit ×2 and we strip the
// most generic English function words that also appear verbatim in Latinate
// languages (`use`, `with`, `from`, `that`, `this`). We also lower the
// confidence divisor so a well-signed PT/ES/FR doc doesn't get flagged
// "low-confidence" and pushed toward the EN fallback.
type Lang = "en" | "pt" | "es" | "fr" | "de" | "it" | "other";
function detectLanguage(text: string): { lang: Lang; confidence: number } {
  const sample = text.slice(0, 8000).toLowerCase();
  const wordMatch = (re: RegExp) => (sample.match(re) ?? []).length;
  const diaMatch = (re: RegExp) => (sample.match(re) ?? []).length;
  const counts: Record<Exclude<Lang, "other">, number> = {
    en: wordMatch(/\b(the|and|when|trigger|example|input|output|scope|values|user|must|should|never)\b/g),
    pt: wordMatch(/\b(não|você|são|também|então|porque|usuário|exemplo|gatilho|fora|valores|critério|saída|entrada|para|está|isso|quando|deve|pode|será|seja|tem|têm)\b/g) + 2 * diaMatch(/[ãõçáéíóúâêô]/g),
    es: wordMatch(/\b(no|usted|son|también|entonces|porque|usuario|ejemplo|disparador|fuera|valores|criterio|salida|entrada|para|está|esto|cuando|debe)\b/g) + 2 * diaMatch(/[ñáéíóúü¿¡]/g),
    fr: wordMatch(/\b(le|la|les|et|ne|pas|vous|êtes|aussi|alors|parce|utilisateur|exemple|déclencheur|valeurs|critère|sortie|entrée|pour|avec|est|cela|quand|doit)\b/g) + 2 * diaMatch(/[àâçéèêëîïôûùüÿœ]/g),
    de: wordMatch(/\b(der|die|das|und|nicht|sie|sind|auch|dann|weil|nutzer|beispiel|auslöser|werte|kriterium|ausgabe|eingabe|für|mit|ist|dies|wenn|muss)\b/g) + 2 * diaMatch(/[äöüß]/g),
    it: wordMatch(/\b(il|la|le|non|lei|sei|sono|anche|allora|perché|utente|esempio|trigger|valori|criterio|uscita|ingresso|per|con|questo|quando|deve)\b/g) + 2 * diaMatch(/[àèéìíîòóù]/g),
  };
  // Language-exclusive orthography. These characters essentially never appear
  // in the other candidates, so their presence is a hard tiebreaker: a PT doc
  // full of English jargon still gets classified PT instead of falling into
  // "other" (which used to skip the semantic pass and zero native pillars).
  const EXCLUSIVE: Array<[Exclude<Lang, "other">, RegExp]> = [
    ["pt", /(ção|ções|ãos?|õe|nh[aeiou]|ç[aou])/g],
    ["es", /(ñ|¿|¡|ción\b)/g],
    ["fr", /(œ|ç|qu'|d'un|l'utilisateur|ê)/g],
    ["de", /(ß|ä|ö|ü)/g],
    ["it", /(gli\b|zione\b|perché)/g],
  ];
  const exclusive = EXCLUSIVE.map(([l, re]) => [l, (sample.match(re) ?? []).length] as const)
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1]);

  const entries = Object.entries(counts) as Array<[Exclude<Lang, "other">, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  const [topLang, topHits] = entries[0];
  const [secondLang, secondHits] = entries[1];

  // Confidence divisor lowered from 40 → 22: 22 function-word hits in an 8k
  // sample is already a decisive signal, and the old divisor kept legitimate
  // PT/ES docs permanently under the 0.5 "low confidence" caveat.
  const conf = (hits: number) => Math.min(1, Math.max(0.55, hits / 22));

  if (exclusive.length) {
    const [excLang, excHits] = exclusive[0];
    // Orthography wins unless the function-word count for the same language is
    // literally zero (i.e. a stray accent in an otherwise English doc).
    if (counts[excLang] >= 2 || excHits >= 8) {
      return { lang: excLang, confidence: conf(Math.max(counts[excLang], excHits)) };
    }
  }
  if (topHits < 4) return { lang: "other", confidence: 0.3 };
  // Near-tie: prefer the non-English candidate rather than bailing to "other".
  // "other" is the worst outcome for the writer (no localized feedback, weaker
  // semantic hint), so we only use it when nothing at all resembles a language.
  if (topHits < secondHits * 1.15) {
    const pick = topLang === "en" ? secondLang : topLang;
    return { lang: pick, confidence: 0.55 };
  }
  return { lang: topLang, confidence: conf(topHits) };

}


// Localized message bundle. EN is the canonical fallback; other languages
// override only what's needed. Keys cover everything user-visible from the
// review_skill response: pillar titles, directives, diagnostics, captions.
type MsgBundle = {
  pillar_title: Record<PillarId, string>;
  directives: Record<PillarId, string[]>;
  diag_zero: string;
  diag_no_positive: string;
  caveat_other: string;
  caveat_low_conf: string;
  caveat_default: string;
  next_grade_a: string;
  next_apply: string;
  next_rerun: string;
  next_diagnostic: string;
  no_signals_prefix: (title: string) => string;
  near_line_prefix: (line: number, excerpt: string) => string;
  signals_summary: (hit: number, total: number) => string;
};

const MESSAGES: Record<Exclude<Lang, "other">, MsgBundle> = {
  en: {
    pillar_title: PILLAR_TITLE,
    directives: DIRECTIVES,
    diag_zero: "Pillar scored 0 — the engine found no recognised pattern for this dimension. Rephrase using conventional vocabulary so detectors catch it.",
    diag_no_positive: "No positive signals matched, but the pillar avoided 0 via penalty-absence. Add explicit content for this dimension.",
    caveat_other: "The engine could not confidently detect a supported language. Detection covers EN/PT/ES/FR/DE/IT — translate or duplicate key cues into one of these for a fair score.",
    caveat_low_conf: "Low-confidence language detection. Make sure conventional terms (trigger, example, failure mode, mitigation, acceptance criterion, output schema) appear verbatim.",
    caveat_default: "The engine is calibrated for Markdown skill files with named sections + worked input/output examples. Pure governance prose may underscore even when content is strong — that's a format mismatch, not a quality verdict.",
    next_grade_a: "Grade A — no high-impact gaps detected. Re-run after any substantive edit.",
    next_apply: "Apply the top_actions in the user's local file — each action carries a line number and an excerpt when the engine could anchor evidence.",
    next_rerun: "Re-run review_skill with the updated content to confirm the score rose.",
    next_diagnostic: "If a pillar shows `diagnostic`, address that first — those are blind spots, not quality misses.",
    no_signals_prefix: (t) => `No content recognised for "${t}" — `,
    near_line_prefix: (l, e) => `Near line ${l} ("${e}"): `,
    signals_summary: (h, t) => `${h}/${t} signals matched`,
  },
  pt: {
    pillar_title: { identity: "Identidade", scope: "Escopo", procedure: "Procedimento", examples: "Exemplos", guardrails: "Salvaguardas", trust: "Pontos de confiança", portability: "Portabilidade" },
    directives: {
      identity: [
        "Dê a ele um senso de identidade mais nítido: quem é, o que recusa e o que NÃO faz.",
        "A persona soa genérica — torne os valores e a voz específicos o bastante para um estranho imitar.",
        "Adicione uma postura explícita de recusa para que pedidos inseguros ou fora do escopo sejam tratados deliberadamente.",
      ],
      scope: [
        "Torne a ativação inequívoca: quando deve disparar e os casos parecidos onde NÃO deve.",
        "Aperte a fronteira do gatilho — hoje ele dispararia em excesso ou de menos em pedidos adjacentes.",
        "Nomeie o usuário-alvo e a tarefa em uma linha para que o agente se autosselecione corretamente.",
      ],
      procedure: [
        "Transforme a prosa num procedimento determinístico, passo-a-passo, com entradas, saídas e condição de parada.",
        "O caminho feliz está claro, mas as bifurcações não — explicite as 2-3 ramificações principais.",
        "Adicione uma definição concreta de pronto para o agente saber quando parar em vez de divagar.",
      ],
      examples: [
        "Inclua exemplos resolvidos (entrada → raciocínio → saída); modelos generalizam disso melhor que de regras.",
        "Inclua ao menos um exemplo de falha com a correção — exemplos negativos previnem o erro comum.",
        "Substitua um exemplo do caminho feliz por um caso real e bagunçado; é onde o skill quebra.",
      ],
      guardrails: [
        "Antecipe os modos de falha que você já viu: nomeie cada um e anexe uma mitigação concreta.",
        "Endureça contra prompt injection — deixe explícito que saídas de ferramentas e docs do usuário são dados, não instruções.",
        "Adicione regras de manuseio de dados (PII, segredos, citações) para falhar de forma segura sob pressão.",
        "Tire a aplicação do prompt: um gate determinístico (regex/AST/policy engine) com código de saída e suíte de regressão é evidência muito mais forte que regras em prosa.",
      ],
      trust: [
        "Torne mensurável: declare modelos validados e um critério de aceitação que o host possa verificar.",
        "Emita resultado estruturado em vez de prosa livre para que o sucesso seja checado e pontuado automaticamente.",
        "Feche o ciclo — instrua o host a reportar resultados de execução para ganhar um trust_score.",
      ],
      portability: [
        "Remova suposições de fornecedor único para o mesmo primitivo rodar em Claude, GPT e Gemini sem cirurgia.",
        "Descreva ferramentas por contrato, não por SDK específico, e mantenha dentro de um orçamento de contexto típico.",
        "Tire frontmatter proprietário que o host não consegue parsear; mantenha Markdown portátil e simples.",
        "Declare suporte multi-runtime explicitamente (ex: 'validado em Claude, GPT e Gemini') — o motor não infere portabilidade pela ausência.",
      ],
    },
    diag_zero: "Pilar zerou — o motor não encontrou padrão reconhecido para esta dimensão. Reescreva com vocabulário convencional para os detectores capturarem.",
    diag_no_positive: "Nenhum sinal positivo bateu, mas o pilar evitou o zero por ausência de penalidade. Adicione conteúdo explícito para esta dimensão.",
    caveat_other: "O motor não detectou um idioma suportado com confiança. A detecção cobre EN/PT/ES/FR/DE/IT — traduza ou duplique pistas-chave em um desses idiomas para uma pontuação justa.",
    caveat_low_conf: "Detecção de idioma com baixa confiança. Garanta que termos convencionais (gatilho, exemplo, modo de falha, mitigação, critério de aceitação, esquema de saída) apareçam textualmente.",
    caveat_default: "O motor é calibrado para arquivos Markdown com seções nomeadas e exemplos resolvidos de entrada/saída. Prosa de governança pura pode pontuar abaixo mesmo com conteúdo forte — é descompasso de formato, não veredicto de qualidade.",
    next_grade_a: "Grau A — nenhuma lacuna de alto impacto detectada. Reexecute após qualquer edição substancial.",
    next_apply: "Aplique as top_actions no arquivo local — cada ação carrega número de linha e trecho quando o motor conseguiu ancorar evidência.",
    next_rerun: "Rode review_skill de novo com o conteúdo atualizado para confirmar que o score subiu.",
    next_diagnostic: "Se um pilar mostrar `diagnostic`, atenda isso primeiro — são pontos cegos, não falhas de qualidade.",
    no_signals_prefix: (t) => `Nenhum conteúdo reconhecido para "${t}" — `,
    near_line_prefix: (l, e) => `Próximo à linha ${l} ("${e}"): `,
    signals_summary: (h, t) => `${h}/${t} sinais reconhecidos`,
  },
  es: {
    pillar_title: { identity: "Identidad", scope: "Alcance", procedure: "Procedimiento", examples: "Ejemplos", guardrails: "Salvaguardas", trust: "Puntos de confianza", portability: "Portabilidad" },
    directives: {
      identity: [
        "Dale un sentido de sí más nítido: quién es, qué rechaza y qué NO hace.",
        "La persona se lee genérica — haz que los valores y la voz sean específicos.",
        "Añade una postura explícita de rechazo para manejar deliberadamente pedidos inseguros o fuera de alcance.",
      ],
      scope: [
        "Hace inequívoca la activación: cuándo debe dispararse y los casos parecidos donde NO debe.",
        "Aprieta la frontera del trigger — hoy se dispararía de más o de menos en pedidos adyacentes.",
        "Nombra al usuario objetivo y la tarea en una línea para que el agente se autoseleccione correctamente.",
      ],
      procedure: [
        "Convierte la prosa en un procedimiento determinista paso a paso, con entradas, salidas y condición de parada.",
        "El camino feliz está claro pero las bifurcaciones no — explicita las 2-3 ramificaciones principales.",
        "Añade una definición concreta de hecho para que el agente sepa cuándo parar.",
      ],
      examples: [
        "Añade ejemplos trabajados (entrada → razonamiento → salida); los modelos generalizan mejor de eso que de reglas.",
        "Incluye al menos un ejemplo de fallo con la corrección — los ejemplos negativos previenen el error común.",
        "Sustituye un ejemplo del camino feliz por un caso real y desordenado; ahí es donde rompe.",
      ],
      guardrails: [
        "Anticipa los modos de fallo que ya viste: nómbralos y adjunta una mitigación concreta a cada uno.",
        "Endurece contra prompt injection — deja explícito que salidas de herramientas y docs del usuario son datos, no instrucciones.",
        "Añade reglas de manejo de datos (PII, secretos, citas) para fallar de forma segura bajo presión.",
        "Saca la aplicación del prompt: una puerta determinista (regex/AST/policy engine) con código de salida y suite de regresión es evidencia mucho más fuerte que reglas en prosa.",
      ],
      trust: [
        "Hazlo medible: declara modelos validados y un criterio de aceptación que el host pueda verificar.",
        "Emite un resultado estructurado en lugar de prosa libre para que el éxito se verifique automáticamente.",
        "Cierra el ciclo — instruye al host a reportar resultados de ejecución para ganar un trust_score.",
      ],
      portability: [
        "Elimina supuestos de un solo proveedor para que el mismo primitivo corra en Claude, GPT y Gemini sin cirugía.",
        "Describe herramientas por contrato, no por SDK específico, y mantente dentro de un presupuesto de contexto típico.",
        "Quita frontmatter propietario que el host no puede parsear; mantén Markdown portátil y plano.",
        "Declara soporte multi-runtime explícitamente (ej: 'validado en Claude, GPT y Gemini') — el motor no infiere portabilidad por ausencia.",
      ],
    },
    diag_zero: "Pilar en 0 — el motor no encontró patrón reconocido para esta dimensión. Reescribe con vocabulario convencional para que los detectores lo capturen.",
    diag_no_positive: "Ningún sinal positivo coincidió, pero el pilar evitó el 0 por ausencia de penalización. Añade contenido explícito.",
    caveat_other: "El motor no detectó con confianza un idioma soportado. La detección cubre EN/PT/ES/FR/DE/IT — traduce o duplica las pistas clave en uno de estos idiomas para una puntuación justa.",
    caveat_low_conf: "Detección de idioma con baja confianza. Asegúrate de que términos convencionales (disparador, ejemplo, modo de fallo, mitigación, criterio de aceptación, esquema de salida) aparezcan textualmente.",
    caveat_default: "El motor está calibrado para archivos Markdown con secciones nombradas y ejemplos trabajados de entrada/salida. La prosa de gobernanza puede puntuar bajo aunque el contenido sea fuerte — es desajuste de formato, no veredicto de calidad.",
    next_grade_a: "Grado A — sin brechas de alto impacto detectadas. Vuelve a ejecutar tras cualquier edición sustancial.",
    next_apply: "Aplica las top_actions en el archivo local — cada acción lleva número de línea y extracto cuando el motor pudo anclar evidencia.",
    next_rerun: "Vuelve a ejecutar review_skill con el contenido actualizado para confirmar que el score subió.",
    next_diagnostic: "Si un pilar muestra `diagnostic`, atiéndelo primero — son puntos ciegos, no fallas de calidad.",
    no_signals_prefix: (t) => `Sin contenido reconocido para "${t}" — `,
    near_line_prefix: (l, e) => `Cerca de la línea ${l} ("${e}"): `,
    signals_summary: (h, t) => `${h}/${t} señales coincidieron`,
  },
  fr: {
    pillar_title: { identity: "Identité", scope: "Périmètre", procedure: "Procédure", examples: "Exemples", guardrails: "Garde-fous", trust: "Points de confiance", portability: "Portabilité" },
    directives: {
      identity: [
        "Donne-lui un sens de soi plus net : qui il est, ce qu'il refuse, ce qu'il n'est PAS.",
        "La persona reste générique — rends les valeurs et la voix assez spécifiques pour être imitées.",
        "Ajoute une posture de refus explicite pour traiter délibérément les demandes hors-périmètre ou risquées.",
      ],
      scope: [
        "Rends l'activation sans ambiguïté : quand déclencher et les cas voisins où il ne FAUT PAS.",
        "Resserre la frontière du déclencheur — il déclencherait en excès ou en défaut sur des demandes adjacentes.",
        "Nomme l'utilisateur cible et la tâche en une ligne pour que l'agent s'auto-sélectionne correctement.",
      ],
      procedure: [
        "Convertis la prose en procédure déterministe étape par étape, avec entrées, sorties et condition d'arrêt.",
        "Le chemin heureux est clair, pas les bifurcations — explicite les 2-3 branches principales.",
        "Ajoute une définition concrète de terminé pour que l'agent sache quand s'arrêter.",
      ],
      examples: [
        "Ajoute des exemples travaillés (entrée → raisonnement → sortie) ; les modèles généralisent mieux à partir de là.",
        "Inclus au moins un exemple d'échec avec la correction — les exemples négatifs préviennent l'erreur courante.",
        "Remplace un exemple du chemin heureux par un cas réel et désordonné ; c'est là que ça casse.",
      ],
      guardrails: [
        "Anticipe les modes d'échec déjà vus : nomme-les et attache une atténuation concrète à chacun.",
        "Durcis contre l'injection de prompt — explicite que sorties d'outils et docs utilisateur sont des données, pas des instructions.",
        "Ajoute des règles de manipulation de données (PII, secrets, citations) pour échouer en sécurité sous pression.",
        "Sors l'application du prompt : une porte déterministe (regex/AST/moteur de politique) avec code de sortie et suite de régression est une preuve bien plus forte que des règles en prose.",
      ],
      trust: [
        "Rends-le mesurable : déclare les modèles validés et un critère d'acceptation vérifiable par l'hôte.",
        "Émets un résultat structuré au lieu de prose libre pour que le succès soit vérifié automatiquement.",
        "Boucle la boucle — instruis l'hôte de remonter les résultats d'exécution pour gagner un trust_score.",
      ],
      portability: [
        "Retire les hypothèses mono-fournisseur pour que le même primitive tourne sur Claude, GPT et Gemini sans chirurgie.",
        "Décris les outils par contrat, pas par SDK spécifique, et reste dans un budget de contexte typique.",
        "Retire le frontmatter propriétaire que l'hôte ne sait pas parser ; reste en Markdown simple et portable.",
        "Déclare le support multi-runtime explicitement (ex : 'validé sur Claude, GPT et Gemini') — le moteur n'infère pas la portabilité de l'absence.",
      ],
    },
    diag_zero: "Pilier à 0 — le moteur n'a trouvé aucun motif reconnu pour cette dimension. Reformule avec du vocabulaire conventionnel pour que les détecteurs l'attrapent.",
    diag_no_positive: "Aucun signal positif n'a matché, mais le pilier a évité 0 par absence de pénalité. Ajoute du contenu explicite.",
    caveat_other: "Le moteur n'a pas détecté avec confiance une langue prise en charge. La détection couvre EN/PT/ES/FR/DE/IT — traduis ou duplique les indices clés dans une de ces langues pour un score juste.",
    caveat_low_conf: "Détection de langue à faible confiance. Assure-toi que les termes conventionnels (déclencheur, exemple, mode d'échec, atténuation, critère d'acceptation, schéma de sortie) apparaissent textuellement.",
    caveat_default: "Le moteur est calibré pour des fichiers Markdown avec sections nommées et exemples travaillés entrée/sortie. La prose de gouvernance pure peut sous-noter même avec un contenu fort — c'est un décalage de format, pas un verdict de qualité.",
    next_grade_a: "Grade A — aucune lacune à fort impact détectée. Relance après toute édition substantielle.",
    next_apply: "Applique les top_actions dans le fichier local — chaque action porte un numéro de ligne et un extrait quand le moteur a pu ancrer la preuve.",
    next_rerun: "Relance review_skill avec le contenu mis à jour pour confirmer que le score a monté.",
    next_diagnostic: "Si un pilier montre `diagnostic`, traite-le d'abord — ce sont des angles morts, pas des manques de qualité.",
    no_signals_prefix: (t) => `Aucun contenu reconnu pour « ${t} » — `,
    near_line_prefix: (l, e) => `Près de la ligne ${l} (« ${e} ») : `,
    signals_summary: (h, t) => `${h}/${t} signaux reconnus`,
  },
  de: {
    pillar_title: { identity: "Identität", scope: "Geltungsbereich", procedure: "Verfahren", examples: "Beispiele", guardrails: "Schutzmechanismen", trust: "Vertrauenshaken", portability: "Portabilität" },
    directives: {
      identity: [
        "Gib ihm ein schärferes Selbstverständnis: wer er ist, was er ablehnt und was er ausdrücklich NICHT tut.",
        "Die Persona wirkt generisch — mache Werte und Stimme spezifisch genug zum Imitieren.",
        "Füge eine explizite Ablehnungshaltung hinzu, damit unsichere oder bereichsfremde Anfragen bewusst behandelt werden.",
      ],
      scope: [
        "Mache die Aktivierung eindeutig: wann sie auslösen soll und ähnliche Fälle, in denen sie NICHT darf.",
        "Verschärfe die Auslösergrenze — derzeit würde sie bei benachbarten Anfragen über- oder unterauslösen.",
        "Benenne Zielnutzer und Aufgabe in einer Zeile, damit der Agent sich selbst korrekt auswählt.",
      ],
      procedure: [
        "Wandle die Prosa in ein deterministisches Schritt-für-Schritt-Verfahren mit Eingaben, Ausgaben und Stoppbedingung um.",
        "Der Happy Path ist klar, die Verzweigungen nicht — mache die 2-3 Hauptverzweigungen explizit.",
        "Füge eine konkrete Definition von Fertig hinzu, damit der Agent weiß, wann er stoppen soll.",
      ],
      examples: [
        "Füge ausgearbeitete Beispiele hinzu (Eingabe → Reasoning → Ausgabe); Modelle generalisieren daraus besser als aus Regeln.",
        "Füge mindestens ein Fehlerbeispiel mit Korrektur hinzu — negative Beispiele verhindern den häufigen Fehler.",
        "Ersetze ein Happy-Path-Beispiel durch einen unordentlichen Realfall; dort bricht es heute.",
      ],
      guardrails: [
        "Antizipiere die bereits gesehenen Fehlermodi: benenne sie und hänge an jeden eine konkrete Abmilderung.",
        "Härte gegen Prompt-Injektion — mache explizit, dass Tool-Ausgaben und Nutzerdokumente Daten sind, keine Anweisungen.",
        "Füge Datenhandhabungsregeln (PII, Geheimnisse, Zitationen) hinzu, um unter Druck sicher zu scheitern.",
        "Verlagere die Durchsetzung aus dem Prompt: ein deterministisches Gate (Regex/AST/Policy-Engine) mit Exit-Code und Regressionssuite ist viel stärkerer Beleg als Prosa-Regeln.",
      ],
      trust: [
        "Mache es messbar: deklariere validierte Modelle und ein für den Host überprüfbares Akzeptanzkriterium.",
        "Gib ein strukturiertes Ergebnis statt freier Prosa aus, damit Erfolg automatisch geprüft werden kann.",
        "Schließe die Schleife — weise den Host an, Ausführungsergebnisse zu melden, um einen Trust-Score zu verdienen.",
      ],
      portability: [
        "Entferne Single-Vendor-Annahmen, damit dasselbe Primitive auf Claude, GPT und Gemini ohne Operation läuft.",
        "Beschreibe Tools per Vertrag, nicht per spezifischem SDK, und bleibe in einem typischen Kontextbudget.",
        "Entferne proprietäres Frontmatter, das der Host nicht parsen kann; bleib bei einfachem, portablem Markdown.",
        "Erkläre Multi-Runtime-Unterstützung explizit (z.B. 'validiert auf Claude, GPT und Gemini') — die Engine kann Portabilität nicht aus Abwesenheit ableiten.",
      ],
    },
    diag_zero: "Pillar bei 0 — die Engine fand kein erkanntes Muster für diese Dimension. Formuliere mit konventionellem Vokabular um.",
    diag_no_positive: "Kein positives Signal traf, aber der Pillar vermied 0 durch Strafabwesenheit. Füge expliziten Inhalt hinzu.",
    caveat_other: "Die Engine konnte keine unterstützte Sprache mit Konfidenz erkennen. Erkennung deckt EN/PT/ES/FR/DE/IT ab — übersetze oder dupliziere Schlüsselhinweise in eine davon für eine faire Bewertung.",
    caveat_low_conf: "Spracherkennung mit niedriger Konfidenz. Stelle sicher, dass konventionelle Begriffe (Auslöser, Beispiel, Fehlermodus, Abmilderung, Akzeptanzkriterium, Ausgabeschema) wörtlich vorkommen.",
    caveat_default: "Die Engine ist auf Markdown-Skill-Dateien mit benannten Abschnitten und ausgearbeiteten Eingabe/Ausgabe-Beispielen kalibriert. Reine Governance-Prosa kann unterscoren, auch wenn der Inhalt stark ist — das ist ein Format-Mismatch, kein Qualitätsurteil.",
    next_grade_a: "Note A — keine kritischen Lücken erkannt. Nach jeder substantiellen Bearbeitung erneut ausführen.",
    next_apply: "Wende die top_actions in der lokalen Datei an — jede Aktion trägt eine Zeilennummer und einen Auszug, wenn die Engine Belege verankern konnte.",
    next_rerun: "Führe review_skill mit dem aktualisierten Inhalt erneut aus, um zu bestätigen, dass der Score gestiegen ist.",
    next_diagnostic: "Wenn ein Pillar `diagnostic` zeigt, behandle das zuerst — das sind blinde Flecken, keine Qualitätsmängel.",
    no_signals_prefix: (t) => `Kein Inhalt erkannt für „${t}" — `,
    near_line_prefix: (l, e) => `Nahe Zeile ${l} („${e}"): `,
    signals_summary: (h, t) => `${h}/${t} Signale erkannt`,
  },
  it: {
    pillar_title: { identity: "Identità", scope: "Ambito", procedure: "Procedura", examples: "Esempi", guardrails: "Salvaguardie", trust: "Punti di fiducia", portability: "Portabilità" },
    directives: {
      identity: [
        "Dagli un senso di sé più nitido: chi è, cosa rifiuta e cosa NON è.",
        "La persona suona generica — rendi valori e voce abbastanza specifici da imitare.",
        "Aggiungi una postura di rifiuto esplicita per gestire deliberatamente richieste fuori ambito o rischiose.",
      ],
      scope: [
        "Rendi l'attivazione inequivocabile: quando deve scattare e i casi simili in cui NON deve.",
        "Stringi il confine del trigger — oggi scatterebbe troppo o troppo poco su richieste adiacenti.",
        "Nomina l'utente target e il compito in una riga perché l'agente si autoselezioni correttamente.",
      ],
      procedure: [
        "Trasforma la prosa in una procedura deterministica passo-passo, con ingressi, uscite e condizione di stop.",
        "Il percorso felice è chiaro ma le biforcazioni no — esplicita le 2-3 ramificazioni principali.",
        "Aggiungi una definizione concreta di fatto perché l'agente sappia quando fermarsi.",
      ],
      examples: [
        "Aggiungi esempi lavorati (input → ragionamento → output); i modelli generalizzano meglio da quelli che dalle regole.",
        "Includi almeno un esempio di fallimento con la correzione — gli esempi negativi prevengono l'errore comune.",
        "Sostituisci un esempio del percorso felice con un caso reale e disordinato; è lì che si rompe.",
      ],
      guardrails: [
        "Anticipa i modi di fallimento già visti: nominali e attacca una mitigazione concreta a ciascuno.",
        "Indurisci contro prompt injection — esplicita che output di tool e doc utente sono dati, non istruzioni.",
        "Aggiungi regole di gestione dati (PII, segreti, citazioni) per fallire in sicurezza sotto pressione.",
        "Togli l'enforcement dal prompt: un gate deterministico (regex/AST/policy engine) con codice di uscita e suite di regressione è prova molto più forte di regole in prosa.",
      ],
      trust: [
        "Rendi misurabile: dichiara modelli validati e un criterio di accettazione verificabile dall'host.",
        "Emetti risultato strutturato invece di prosa libera così il successo si verifica automaticamente.",
        "Chiudi il cerchio — istruisci l'host a riportare risultati di esecuzione per guadagnare un trust_score.",
      ],
      portability: [
        "Rimuovi assunzioni single-vendor così lo stesso primitivo gira su Claude, GPT e Gemini senza chirurgia.",
        "Descrivi i tool per contratto, non per SDK specifico, e resta in un budget di contesto tipico.",
        "Togli frontmatter proprietario che l'host non sa parsare; resta su Markdown semplice e portabile.",
        "Dichiara supporto multi-runtime esplicitamente (es: 'validato su Claude, GPT e Gemini') — il motore non inferisce portabilità dall'assenza.",
      ],
    },
    diag_zero: "Pilastro a 0 — il motore non ha trovato pattern riconosciuti per questa dimensione. Riformula con vocabolario convenzionale.",
    diag_no_positive: "Nessun segnale positivo combaciato, ma il pilastro ha evitato lo 0 per assenza di penalità. Aggiungi contenuto esplicito.",
    caveat_other: "Il motore non ha rilevato con sicurezza una lingua supportata. Il rilevamento copre EN/PT/ES/FR/DE/IT — traduci o duplica gli indizi chiave in una di queste lingue per un punteggio equo.",
    caveat_low_conf: "Rilevamento lingua a bassa confidenza. Assicurati che termini convenzionali (trigger, esempio, modalità di guasto, mitigazione, criterio di accettazione, schema di output) appaiano testualmente.",
    caveat_default: "Il motore è calibrato per file Markdown con sezioni nominate ed esempi lavorati input/output. La prosa di governance pura può sottoscoreare anche con contenuto forte — è disallineamento di formato, non verdetto di qualità.",
    next_grade_a: "Voto A — nessuna lacuna ad alto impatto rilevata. Riesegui dopo ogni modifica sostanziale.",
    next_apply: "Applica le top_actions nel file locale — ogni azione porta numero di riga ed estratto quando il motore ha potuto ancorare evidenza.",
    next_rerun: "Riesegui review_skill con il contenuto aggiornato per confermare che lo score è salito.",
    next_diagnostic: "Se un pilastro mostra `diagnostic`, affrontalo per primo — sono punti ciechi, non mancanze di qualità.",
    no_signals_prefix: (t) => `Nessun contenuto riconosciuto per "${t}" — `,
    near_line_prefix: (l, e) => `Vicino alla riga ${l} ("${e}"): `,
    signals_summary: (h, t) => `${h}/${t} segnali combaciati`,
  },
};

function bundleFor(lang: Lang): MsgBundle {
  if (lang === "other") return MESSAGES.en;
  return MESSAGES[lang];
}

function pickDirective(id: PillarId, content: string, salt: number, bundle: MsgBundle): string {
  const pool = bundle.directives[id];
  let h = salt;
  for (let i = 0; i < content.length; i += 97) h = (h * 31 + content.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

// Anchor a directive to concrete file evidence when we have it. All
// user-visible strings come from the localized bundle so non-English authors
// get feedback in their own language.
function buildAction(detail: PillarDetail, content: string, priority: number, bundle: MsgBundle): {
  area: string;
  priority: number;
  action: string;
  evidence: { line: number; excerpt: string } | null;
  evidence_anchored: boolean;
  signal_summary: string;
} {
  const directive = pickDirective(detail.id, content, priority, bundle);
  const title = bundle.pillar_title[detail.id];
  const ev = detail.evidence[0] ?? null;
  // Honesty flag: when the pillar scored by ABSENCE of signals, we have no
  // file location to point at — emit `evidence_anchored: false` so the host
  // doesn't quote a random line as if it were the problem.
  const anchored = ev !== null && detail.signals_hit > 0;
  let action: string;
  if (anchored && ev) {
    action = bundle.near_line_prefix(ev.line, ev.excerpt) + directive;
  } else if (detail.signals_hit === 0) {
    action = bundle.no_signals_prefix(title) + directive;
  } else {
    action = directive;
  }
  return {
    area: title,
    priority,
    action,
    evidence: anchored ? ev : null,
    evidence_anchored: anchored,
    signal_summary: bundle.signals_summary(detail.signals_hit, detail.signals_total),
  };
}

// Localised "extras" added after the v3 → v4 bump. Kept separate from the
// big MsgBundle so we don't have to retranslate every existing string. EN is
// the canonical fallback for any language not covered here.
type Extras = {
  ceiling_note: (ceiling: number, cls: DocClass, rationale: string) => string;
  warn_short: string;
  warn_summary: string;
  warn_outline: string;
  axis_caveat: string;
};

const EXTRAS: Partial<Record<Exclude<Lang, "other">, Extras>> = {
  en: {
    ceiling_note: (c, cls, r) =>
      `Realistic ceiling for doc_class="${cls}" is ~${c}/100. Actions targeting structural format above this point are cosmetic — focus on content_quality_score instead. ${r}`,
    warn_short: "Input is very short (<400 chars). Score is unreliable — pass the full file content, not a summary.",
    warn_summary: "Input contains summary/truncation markers (`...`, `[truncated]`, `condensed`, etc.). The engine cannot score what it can't see — pass verbatim content for a real score.",
    warn_outline: "Input looks like an outline (headings without body). Pass the full content; the engine scores prose, not structure alone.",
    axis_caveat: "Grade uses content_quality_score as the primary axis; structural_score is reported separately so format mismatch doesn't dominate the verdict.",
  },
  pt: {
    ceiling_note: (c, cls, r) =>
      `Teto realista para doc_class="${cls}" é ~${c}/100. Ações que perseguem formato estrutural acima desse ponto são cosméticas — foque em content_quality_score. ${r}`,
    warn_short: "Entrada muito curta (<400 caracteres). O score não é confiável — envie o conteúdo completo, não um resumo.",
    warn_summary: "A entrada contém marcadores de resumo/truncamento (`...`, `[truncado]`, `condensado`, etc.). O motor não pontua o que não vê — envie o conteúdo textual para uma medição real.",
    warn_outline: "A entrada parece um esqueleto (cabeçalhos sem corpo). Envie o conteúdo completo; o motor avalia prosa, não só estrutura.",
    axis_caveat: "O grade usa content_quality_score como eixo principal; structural_score é reportado separado para que desencontro de formato não domine o veredicto.",
  },
};

function extrasFor(lang: Lang): Extras {
  if (lang === "other") return EXTRAS.en!;
  return EXTRAS[lang] ?? EXTRAS.en!;
}

// ----------------------------------------------------------------------------
// Semantic pass (LLM-backed). Fixes the two deepest keyword-engine failure
// modes:
//   1. False zero — content covers the dimension semantically but with
//      non-conventional vocabulary, and no regex hits.
//   2. Displaced anchor — top_action quotes a line that is technically a hit
//      but not the most representative passage for the dimension.
// Uses a small/fast model on the Lovable AI gateway. Falls back silently to
// the pure keyword score if the gateway is unavailable, the call errors, or
// the response shape is malformed — the engine never degrades on outage.
// ----------------------------------------------------------------------------
type SubstanceExcerpt = { line: number | null; quote: string; verified: boolean };

type SemanticPillarVerdict = {
  pillar: PillarId;
  covered: boolean;
  confidence: number;
  evidence_line: number | null;
  evidence_quote: string | null;
  /** LLM-judged substance, 0-100, independent from the deterministic format signals. */
  substance_score: number;
  /** Plain-text justification, written in the document's language. */
  rationale: string;
  /** Passages from the file that sustain the judgement. */
  excerpts: SubstanceExcerpt[];
};

type SubstancePass = {
  verdicts: Map<PillarId, SemanticPillarVerdict>;
  /** Document-level justification, written in the document's language. */
  summary: string;
};

const SEMANTIC_MODEL = "google/gemini-3-flash-preview";

const PILLAR_BRIEF: Record<PillarId, string> = {
  identity: "Identity — who the agent is, voice/tone, values, refusal posture, non-goals.",
  scope: "Scope & Triggers — when to use, target user, applies-to conditions, edge cases.",
  procedure: "Procedure — step-by-step deterministic process, branches, stop condition, inputs/outputs.",
  examples: "Examples — worked input → reasoning → output samples, including failure cases.",
  guardrails: "Guardrails — failure modes named with mitigations, PII/data rules, prompt-injection defense, deterministic enforcement.",
  trust: "Trust hooks — measurable acceptance criteria, output schemas, validation suite, runtime telemetry hooks.",
  portability: "Portability — multi-runtime declaration (Claude/GPT/Gemini), vendor-neutral tool contracts, portable Markdown.",
};

// Rationales must be written in the reader's language, so the judge prompt
// names it explicitly instead of relying on the two-letter hint.
const LANG_NAME: Record<Lang, string> = {
  en: "English",
  pt: "Brazilian Portuguese",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  other: "the same language as the document",
};

async function semanticCheck(
  content: string,
  langHint: Lang,
): Promise<SubstancePass | null> {
  if (!process.env.LOVABLE_API_KEY) return null;
  // Numbered lines so the model can return a usable evidence_line.
  const lines = content.split("\n");
  const cap = Math.min(lines.length, 600);
  const numbered = lines
    .slice(0, cap)
    .map((l, i) => `${(i + 1).toString().padStart(4, " ")}  ${l}`)
    .join("\n")
    .slice(0, 16000);
  const pillarList = (Object.keys(PILLAR_BRIEF) as PillarId[])
    .map((id) => `- ${id}: ${PILLAR_BRIEF[id]}`)
    .join("\n");
  const langName = LANG_NAME[langHint] ?? "the document's language";
  const sys = `You are the SUBSTANCE judge of a skill/playbook/soul/guardrail evaluator. You score CONTENT QUALITY only — never format. IGNORE headings, section names, markdown structure, keyword presence and document length; another deterministic engine already scores format. Judge whether the document actually tells an agent something operationally useful and specific for each pillar. Reward unconventional vocabulary and non-English writing equally. Every judgement must be grounded: cite verbatim passages copied character-for-character from the document (max 140 chars each), and the line number must be the leading number printed on that line. Write every rationale in ${langName}, in 1-2 concrete sentences that name what the document does or fails to do — never generic filler.`;
  const user = `DOCUMENT LANGUAGE (hint): ${langHint}

PILLARS:
${pillarList}

DOCUMENT (line-numbered, may be truncated):
${numbered}

Return one verdict per pillar, plus a document-level summary.
- covered=true only if a reader would say the pillar is substantively addressed.
- confidence in [0,1].
- substance_score in [0,100]: 0-20 absent, 21-45 vague/generic mention, 46-70 useful but incomplete, 71-85 specific and actionable, 86-100 exemplary with concrete detail an agent can execute verbatim.
- excerpts: up to 2 passages that sustain your score. Use passages that show the GAP when the score is low. Empty array only when the document truly says nothing about the pillar.
- If covered=false, set evidence_line=null and evidence_quote=null.
- summary: 2-3 sentences on the document's substantive strengths and biggest content gap.`;

  const schema = z.object({
    summary: z.string(),
    verdicts: z
      .array(
        z.object({
          pillar: z.enum(["identity", "scope", "procedure", "examples", "guardrails", "trust", "portability"]),
          covered: z.boolean(),
          confidence: z.number(),
          substance_score: z.number(),
          rationale: z.string(),
          excerpts: z.array(z.object({ line: z.number().nullable(), quote: z.string() })),
          evidence_line: z.number().nullable(),
          evidence_quote: z.string().nullable(),
        }),
      )
      .length(7),
  });

  // The semantic pass is the highest-value feature for niche-jargon skills
  // and for non-English content, so a single transient gateway blip should
  // not silently drop it. Three attempts: primary model twice (short backoff),
  // then one final try on the flash fallback. Each attempt has its own
  // timeout so a slow upstream doesn't burn the whole budget.
  const SEMANTIC_FALLBACK_MODEL = "google/gemini-2.5-flash";
  let output: z.infer<typeof schema> | null = null;
  const attempts: Array<{ model: string; ms: number; error: string }> = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const modelId = attempt < 2 ? SEMANTIC_MODEL : SEMANTIC_FALLBACK_MODEL;
    const t0 = Date.now();
    try {
      const res = await generateText({
        model: getGatewayModel(modelId),
        system: sys,
        prompt: user,
        output: Output.object({ schema }),
        abortSignal: AbortSignal.timeout(20_000),
      });
      output = res.output;
      break;
    } catch (e: any) {
      attempts.push({ model: modelId, ms: Date.now() - t0, error: e?.message ?? String(e) });
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  if (!output) {
    console.warn(`[review.semantic] all ${attempts.length} attempts failed:`, attempts);
    return null;
  }

  // Anchor a model-supplied quote to a real line in the file. Returns the
  // resolved 1-based line (or null) and whether the quote exists verbatim —
  // an unverified quote is still shown, but flagged, so the operator never
  // takes a hallucinated passage as proof.
  const anchor = (rawLine: number | null, rawQuote: string): SubstanceExcerpt | null => {
    const quote = rawQuote.trim().slice(0, 140);
    if (!quote) return null;
    const needle = quote.slice(0, 40);
    let line = rawLine !== null && Number.isFinite(rawLine) ? Math.round(rawLine) : null;
    if (line !== null) {
      const idx = line - 1;
      if (idx >= 0 && idx < lines.length && lines[idx].includes(quote.slice(0, 24))) {
        return { line, quote, verified: true };
      }
    }
    const found = lines.findIndex((l) => l.includes(needle));
    if (found >= 0) return { line: found + 1, quote, verified: true };
    return { line: null, quote, verified: false };
  };

  try {
    const map = new Map<PillarId, SemanticPillarVerdict>();
    for (const v of output.verdicts) {
      const primary = v.evidence_quote ? anchor(v.evidence_line, v.evidence_quote) : null;
      const excerpts: SubstanceExcerpt[] = [];
      for (const e of (v.excerpts ?? []).slice(0, 2)) {
        const a = anchor(e.line, e.quote ?? "");
        if (a && !excerpts.some((x) => x.quote === a.quote)) excerpts.push(a);
      }
      if (primary && !excerpts.some((x) => x.quote === primary.quote)) excerpts.unshift(primary);
      map.set(v.pillar as PillarId, {
        pillar: v.pillar as PillarId,
        covered: v.covered,
        confidence: Math.max(0, Math.min(1, v.confidence)),
        // Only verified anchors feed the legacy evidence fields — those drive
        // top_actions, which must never quote a line that isn't in the file.
        evidence_line: primary?.verified ? primary.line : null,
        evidence_quote: primary?.verified ? primary.quote : null,
        substance_score: Math.max(0, Math.min(100, Math.round(v.substance_score))),
        rationale: (v.rationale ?? "").trim().slice(0, 400),
        excerpts: excerpts.slice(0, 2),
      });
    }
    return { verdicts: map, summary: (output.summary ?? "").trim().slice(0, 700) };
  } catch {
    return null;
  }
}


export const getMethodologyTool = defineTool({
  name: "get_methodology",
  description:
    "[UPGRADE] Orientation for the local-file upgrade flow. Returns the dimensions the engine evaluates, the doc classes it grades against, and how to drive the loop — NOT the rubric, signals or thresholds. Read-only, no auth.",
  parameters: z.object({}),
  execute: async () =>
    json({
      engine: ENGINE,
      name: "Super Agent Skill evaluation",
      proprietary: true,
      note:
        "Scoring is performed server-side. Engine v5 combines deterministic multilingual detectors with a fast LLM-backed semantic pass that catches pillars covered with non-conventional vocabulary and improves evidence anchors. The verdict is split into structural_score (format) and content_quality_score (substance) and an expected_ceiling per doc_class tells the operator the realistic top before chasing diminishing returns. Feedback localised to EN, PT-BR, ES, FR, DE, IT.",
      dimensions: (Object.keys(PILLAR_TITLE) as PillarId[]).map((id) => ({
        id,
        title: PILLAR_TITLE[id],
      })),
      doc_classes: (Object.keys(DOC_CLASS_CEILING) as DocClass[]).map((c) => ({
        id: c,
        expected_ceiling: DOC_CLASS_CEILING[c],
        rationale: DOC_CLASS_RATIONALE[c],
      })),
      how_to_use: [
        "1. review_skill — submit the file (declare `doc_class` if you know it; otherwise leave as `auto`). Read `input_warning`, `doc_class.expected_ceiling`, then `verdict_score` and `top_actions`.",
        "2. You (the host agent) apply the file-anchored actions in the user's repo. Skip actions whose `evidence_anchored: false` if you'd otherwise quote a misleading line.",
        "3. review_skill again with `previous_hash` + `previous_overall_score` from the prior response — you'll get a `delta_vs_previous`. Iterate until the verdict_score reaches the expected_ceiling; going beyond is cosmetic.",
      ],
    }),
});

// ----------------------------------------------------------------------------
// Core review computation — shared by review_skill (single) and
// review_skills_batch. Produces the full scored payload EXCEPT the per-call
// concerns (caller delta + feedback request + next_steps), which the tools add.
// ----------------------------------------------------------------------------
export type ReviewArgs = {
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  content: string;
  doc_class: DocClassInput;
  semantic_check: boolean;
  language?: Exclude<Lang, "other">;
};

// Best-effort in-process result cache keyed by content + options. Iterative
// review loops re-submit the same file repeatedly; a hit skips the
// deterministic scoring AND the LLM semantic pass, cutting ~15-30s to ~0.
// Ephemeral (per warm instance), TTL-bounded, size-capped (FIFO eviction).
const REVIEW_CACHE = new Map<string, { core: Record<string, unknown>; at: number }>();
const REVIEW_CACHE_MAX = 200;
const REVIEW_CACHE_TTL_MS = 10 * 60 * 1000;

function reviewCacheKey(a: ReviewArgs): string {
  return [a.type, a.doc_class, a.semantic_check ? "sem" : "nosem", a.language ?? "auto", fnv1aHex(a.content)].join("|");
}

// Exported so the public certification API (/api/public/certify) runs the
// exact same engine as the review_skill MCP tool — one scorer, two doors.
export async function computeReview(a: ReviewArgs): Promise<Record<string, unknown>> {
  const cacheKey = reviewCacheKey(a);
  const hit = REVIEW_CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < REVIEW_CACHE_TTL_MS) {
    return { ...hit.core, cached: true };
  }

  const { name, type, content, doc_class, semantic_check, language: languageOverride } = a;
  const ids = Object.keys(PILLAR_TITLE) as PillarId[];
  const weights = TYPE_WEIGHTS[type] ?? TYPE_WEIGHTS.skill;
  // Detect language BEFORE scoring so scorePillar can apply the language-fairness
  // cap (non-EN docs get a slightly higher no-positive-signals ceiling to offset
  // the regex detector's naturally narrower coverage outside English).
  // Caller override wins (confidence 1.0); otherwise fall back to detection.
  const detected = detectLanguage(content);
  const language = languageOverride
    ? { lang: languageOverride as Lang, confidence: 1 }
    : detected;
  const bundle = bundleFor(language.lang);
  const extras = extrasFor(language.lang);
  const details = ids.map((id) => scorePillar(id, content, language.lang));


  // Doc class — declared or inferred. Drives ceiling + grade axis.
  const docClass: DocClass = doc_class === "auto" ? inferDocClass(content, type) : doc_class;
  const ceiling = DOC_CLASS_CEILING[docClass];

  // Pre-score input sanity. Surface BEFORE the score so the operator doesn't
  // chase a misleading verdict on a summary.
  const warnKind = inputWarning(content);
  const inputWarn = warnKind
    ? warnKind === "short_input"
      ? extras.warn_short
      : warnKind === "summary_markers"
        ? extras.warn_summary
        : extras.warn_outline
    : null;

  // Semantic pass — run when enabled and content is substantive. Only HARD
  // truncation warnings (short_input / summary_markers) block it; an
  // `outline_only` hint is soft and is exactly where the pass adds most value.
  const blocksSemantic = warnKind === "short_input" || warnKind === "summary_markers";
  const substancePass =
    semantic_check && !blocksSemantic && content.length >= 400
      ? await semanticCheck(content, language.lang)
      : null;
  const semantic = substancePass?.verdicts ?? null;

  // Apply semantic uplift to pillar scores (never lowers a score).
  const semanticUplifts: Record<string, { from: number; to: number; confidence: number }> = {};
  if (semantic) {
    for (const r of details) {
      const v = semantic.get(r.id);
      if (!v || !v.covered) continue;
      const target = Math.round(40 + v.confidence * 45);
      if (target > r.score) {
        const from = r.score;
        // Semantic uplift ceiling: EN docs cap at 82 (the deterministic detectors
        // are richest in EN, so a keyword-blind semantic pass alone shouldn't push
        // an EN skill to A grade). For non-EN docs the ceiling rises to 90 —
        // the semantic pass is the primary way a well-written PT/ES/FR/DE/IT
        // skill demonstrates coverage the (naturally sparser) native-language
        // regexes miss, so it must be able to reach A on merit.
        const uplistCap = language.lang !== "en" && language.lang !== "other" ? 90 : 82;
        r.score = Math.min(uplistCap, target);

        r.deficit = 100 - r.score;
        const pillarTotal = r.structural_total + r.content_total;
        if (pillarTotal > 0) {
          const ratio = r.score / 100;
          r.structural_earned = r.structural_total * ratio;
          r.content_earned = r.content_total * ratio;
        }
        semanticUplifts[r.id] = { from, to: r.score, confidence: v.confidence };
      }
      if (v.evidence_line !== null && v.evidence_quote) {
        const quote = v.evidence_quote.length > 140 ? v.evidence_quote.slice(0, 137) + "…" : v.evidence_quote;
        r.evidence.unshift({ line: v.evidence_line, excerpt: quote });
        if (r.signals_hit === 0) r.signals_hit = 1;
      }
    }
  }

  // Per-pillar overall score (existing logic — kept for back-compat).
  let wSum = 0;
  let wTotal = 0;
  for (const r of details) {
    const w = weights[r.id] ?? 1;
    wSum += r.score * w;
    wTotal += w;
  }
  const overall = Math.round(wSum / wTotal);

  // Axis split, weighted by TYPE_WEIGHTS so axes share the overall scale.
  let sEarned = 0, sTotal = 0, cEarned = 0, cTotal = 0;
  for (const r of details) {
    const w = weights[r.id] ?? 1;
    sEarned += r.structural_earned * w;
    sTotal += r.structural_total * w;
    cEarned += r.content_earned * w;
    cTotal += r.content_total * w;
  }
  const structuralScore = sTotal > 0 ? Math.round((sEarned / sTotal) * 100) : null;
  const contentQualityScore = cTotal > 0 ? Math.round((cEarned / cTotal) * 100) : null;

  // ---- Substance axis (LLM-judged) -----------------------------------------
  // Deliberately independent from the deterministic axes: the judge never sees
  // the keyword hits and is instructed to ignore format entirely, so a
  // beautifully structured but hollow file and a plain-prose but deeply
  // operational file separate here instead of averaging out. `format_score` is
  // the deterministic structural axis under its operator-facing name.
  const formatScore = structuralScore;
  let substanceScore: number | null = null;
  const substancePillars = substancePass
    ? details.map((r) => {
        const v = substancePass.verdicts.get(r.id);
        return {
          pillar: r.id,
          title: bundle.pillar_title[r.id],
          score: v?.substance_score ?? null,
          status: v ? statusBand(v.substance_score) : null,
          covered: v?.covered ?? null,
          confidence: v ? Math.round(v.confidence * 100) / 100 : null,
          rationale: v?.rationale ?? null,
          // The passages the judgement is anchored to. `verified: false` means
          // the quote could not be found verbatim in the file — show it, but
          // never treat it as proof.
          evidence: (v?.excerpts ?? []).map((e) => ({
            line: e.line,
            quote: e.quote,
            verified: e.verified,
          })),
        };
      })
    : [];
  if (substancePass) {
    let subW = 0;
    let subT = 0;
    for (const r of details) {
      const v = substancePass.verdicts.get(r.id);
      if (!v) continue;
      const w = weights[r.id] ?? 1;
      subW += v.substance_score * w;
      subT += w;
    }
    if (subT > 0) substanceScore = Math.round(subW / subT);
  }

  const verdictScore =
    docClass === "governance" && contentQualityScore !== null ? contentQualityScore : overall;

  const pillars = details.map((r) => {
    // Portability's 0/N signals + score ~68 baseline is intentional (see
    // scorePillar: "portable by construction"). Expose that reasoning so the
    // score isn't perceived as arbitrary. Same for language-fairness caps.
    const baseline: string | null =
      r.id === "portability" && r.signals_hit === 0
        ? "portable_by_construction"
        : null;
    return {
      pillar: r.id,
      title: bundle.pillar_title[r.id],
      score: r.score,
      status: statusBand(r.score),
      signals_hit: r.signals_hit,
      signals_total: r.signals_total,
      semantic_uplift: semanticUplifts[r.id] ?? null,
      baseline,
      diagnostic:
        r.score === 0
          ? bundle.diag_zero
          : r.id === "portability" && r.signals_hit === 0
            ? (language.lang === "pt"
                ? "Portável por construção: nenhum lock-in de fornecedor detectado (baseline ~68). Para chegar a 'forte', declare suporte multi-runtime explicitamente (ex: 'validado em Claude, GPT e Gemini')."
                : "Portable by construction: no vendor lock-in detected (baseline ~68). To reach 'strong', declare multi-runtime support explicitly (e.g. 'validated on Claude, GPT and Gemini').")
            : r.signals_hit === 0
              ? bundle.diag_no_positive
              : null,
    };
  });


  const ranked = [...details]
    .map((r) => ({ ...r, impact: r.deficit * (weights[r.id] ?? 1) }))
    .filter((r) => {
      if (r.impact <= 0) return false;
      if (docClass === "governance" && r.structural_total > r.content_total && r.score >= ceiling) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 4);

  const topActions = ranked.map((r, i) => buildAction(r, content, i + 1, bundle));

  const formatCaveat =
    language.lang === "other"
      ? bundle.caveat_other
      : language.confidence < 0.5
        ? bundle.caveat_low_conf
        : null;

  const contentHash = fnv1aHex(content);

  const core: Record<string, unknown> = {
    file: name,
    type,
    engine: ENGINE,
    cached: false,
    input_warning: inputWarn,
    doc_class: {
      value: docClass,
      inferred: doc_class === "auto",
      expected_ceiling: ceiling,
      rationale: DOC_CLASS_RATIONALE[docClass],
      ceiling_note: extras.ceiling_note(ceiling, docClass, DOC_CLASS_RATIONALE[docClass]),
    },
    overall_score: overall,
    structural_score: structuralScore,
    format_score: formatScore,
    content_quality_score: contentQualityScore,
    substance_score: substanceScore,
    // Two independent axes, never averaged: `format` is deterministic
    // structure, `substance` is LLM-judged content with a written rationale
    // and file-anchored excerpts per pillar.
    substance: substancePass
      ? {
          judged: true,
          score: substanceScore,
          grade: substanceScore !== null ? gradeBand(substanceScore) : null,
          judged_by: SEMANTIC_MODEL,
          axis: "content_only_format_ignored",
          rationale: substancePass.summary || null,
          pillars: substancePillars,
          evidence_unverified: substancePillars.reduce(
            (n, p) => n + p.evidence.filter((e) => !e.verified).length,
            0,
          ),
        }
      : {
          judged: false,
          score: null,
          grade: null,
          judged_by: null,
          axis: "content_only_format_ignored",
          rationale: null,
          pillars: [],
          evidence_unverified: 0,
          skipped_reason: !semantic_check
            ? "disabled_by_caller"
            : blocksSemantic
              ? "input_warning"
              : content.length < 400
                ? "content_too_short"
                : "gateway_unavailable_or_errored",
        },
    verdict_score: verdictScore,
    grade: gradeBand(verdictScore),
    axis_note: extras.axis_caveat,
    semantic_pass: {
      ran: semantic !== null,
      model: semantic !== null ? SEMANTIC_MODEL : null,
      skipped_reason: semantic === null
        ? (!semantic_check ? "disabled_by_caller" : blocksSemantic ? "input_warning" : content.length < 400 ? "content_too_short" : "gateway_unavailable_or_errored")
        : null,
      uplifts: Object.entries(semanticUplifts).map(([pillar, u]) => ({ pillar, ...u })),
    },
    // Explicit plateau signal for non-English content when the semantic pass
    // couldn't run (gateway blip, disabled, etc.). Without it operators see a
    // C+ ceiling in PT/ES/FR/DE/IT and assume the engine is broken. This
    // tells them where the ceiling comes from and what to do next.
    plateau_reason:
      language.lang !== "en" && language.lang !== "other" && semantic === null && semantic_check
        ? {
            code: "non_english_semantic_pass_unavailable",
            note:
              language.lang === "pt"
                ? "O passe semântico não rodou (gateway indisponível). Em português a análise fica limitada aos detectores determinísticos, que têm cobertura mais estreita que em inglês — teto realista ~65 nessa passagem. Rode novamente em 30-60s para tentar de novo."
                : "Semantic pass did not run (gateway unavailable). In non-English content the analysis falls back to deterministic detectors, whose coverage is narrower than in English — realistic ceiling ~65 on this pass. Re-run in 30-60s to try again.",
          }
        : null,
    language: {
      detected: language.lang,
      confidence: Math.round(language.confidence * 100) / 100,
      supported: ["en", "pt", "es", "fr", "de", "it"],
    },
    format_caveat: formatCaveat ?? bundle.caveat_default,
    pillars,
    top_actions: topActions,
    content_hash: contentHash,
  };


  REVIEW_CACHE.set(cacheKey, { core, at: Date.now() });
  if (REVIEW_CACHE.size > REVIEW_CACHE_MAX) {
    const oldest = REVIEW_CACHE.keys().next().value;
    if (oldest !== undefined) REVIEW_CACHE.delete(oldest);
  }
  return core;
}

export const reviewSkillTool = defineTool({
  name: "review_skill",
  description:
    "[UPGRADE] Score a local skill / playbook / soul / guardrail with the proprietary SuperAgentSkill engine. Returns `overall_score` plus a split `structural_score` vs `content_quality_score` so format mismatch doesn't dominate the verdict; `expected_ceiling` per `doc_class` so the operator knows the realistic top before chasing diminishing returns; per-pillar scores (`signals_hit`/`signals_total`) and `top_actions` anchored to file evidence with an `evidence_anchored` honesty flag. A fast LLM-backed semantic pass runs alongside the deterministic detectors to fix false-zero pillars (content covered with unconventional vocabulary) and to relocate evidence anchors when the keyword match is misleading; set `semantic_check: false` to skip. Optional `doc_class` (skill | governance | playbook-ops | guardrail-ops | auto) and optional `previous_hash` + `previous_overall_score` produce a `delta` between runs. An `input_warning` is emitted BEFORE the score if the content looks truncated/summarised. Multilingual signal detection AND feedback (EN, PT-BR, ES, FR, DE, IT) — pass `language` to override auto-detection when the content mixes a base language with heavy English jargon. Read-only, no auth.",
  parameters: z.object({
    name: z.string().min(1).max(200).describe("File or skill name (for the report header only)"),
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).default("skill"),
    content: z.string().min(20).max(120_000).describe("Raw markdown / prompt text of the local file — pass verbatim, not summarised"),
    doc_class: z
      .enum(["skill", "governance", "playbook-ops", "guardrail-ops", "auto"])
      .default("auto")
      .describe("Declare the document class to set the realistic ceiling and weight the structural vs content axes. `auto` infers from `type` + content shape."),
    semantic_check: z
      .boolean()
      .default(true)
      .describe("Run the LLM-backed semantic pass to catch pillars covered with non-conventional vocabulary and to improve evidence anchors. Set false for offline/zero-cost runs."),
    language: z
      .enum(["en", "pt", "es", "fr", "de", "it"])
      .optional()
      .describe("Override the document language for localized feedback + semantic hint. Use this when the content mixes a base language with heavy English technical jargon (e.g. PT-BR fintech docs with `valuation`, `preferred stock`), where auto-detection can be low-confidence."),
    previous_hash: z.string().max(32).optional().describe("fnv1a hash from a previous run — enables delta_vs_previous in the response"),
    previous_overall_score: z.number().int().min(0).max(100).optional(),
  }),
  execute: async ({ name, type, content, doc_class, semantic_check, language: languageOverride, previous_hash, previous_overall_score }) => {
    const core = await computeReview({ name, type, content, doc_class, semantic_check, language: languageOverride });
    const overall = core.overall_score as number;
    const verdictScore = core.verdict_score as number;
    const docClassVal = (core.doc_class as { value: DocClass }).value;
    const contentHash = core.content_hash as string;
    const topActions = core.top_actions as unknown[];

    // Business-facing projection: what closing the gap to the realistic
    // ceiling is worth on the metrics we publish on the landing page.
    const ceiling = (core.doc_class as { expected_ceiling?: number }).expected_ceiling;
    const impact = projectImpact({
      score: verdictScore,
      targetScore: typeof ceiling === "number" ? ceiling : undefined,
      actionsCount: topActions.length,
      semanticPass: Boolean((core.semantic_pass as { ran?: boolean } | undefined)?.ran),
    });

    // Delta vs the caller's last run. Hash is non-crypto; client sends back
    // whatever we emitted previously and we compare overall + content hash.
    const delta =
      typeof previous_overall_score === "number"
        ? {
            previous_overall_score,
            current_overall_score: overall,
            change: overall - previous_overall_score,
            same_content: previous_hash === contentHash,
          }
        : null;

    // Create a feedback request so the host LLM can rate this review via the
    // `submit_feedback` MCP tool. Single-use, 30-day TTL, validated server-side.
    const { data: fbReq } = await supabaseAdmin
      .from("package_feedback_requests")
      .insert({
        kind: "review_skill",
        package_id: null,
        source: "mcp",
        context: { file: name, type, doc_class: docClassVal, score: verdictScore },
      })
      .select("id, expires_at")
      .single();

    return json({
      ...core,
      delta_vs_previous: delta,
      impact_projection: {
        ...impact,
        summary: projectionToText(impact),
        report_note:
          "Show this to the skill owner: current vs projected values on the public SAK outcome metrics if the top_actions are applied. Estimates interpolated from network anchors — not a guarantee.",
      },
      feedback_request: fbReq
        ? {
            id: fbReq.id,
            expires_at: fbReq.expires_at,
            prompt: "After applying top_actions, please rate this review (1-5) via the `submit_feedback` tool so the engine learns which signals helped.",
            tool: "submit_feedback",
            example: { request_id: fbReq.id, rating: 4, sentiment: "positive", comments: "Top actions were spot-on." },
          }
        : null,
      next_steps:
        topActions.length === 0
          ? [MESSAGES.en.next_grade_a]
          : [
              MESSAGES.en.next_apply,
              MESSAGES.en.next_rerun,
              MESSAGES.en.next_diagnostic,
              "Pass `previous_hash` + `previous_overall_score` from this response into the next call to get a `delta_vs_previous`.",
              "Honour `doc_class.expected_ceiling` — actions beyond that point are cosmetic, not quality wins.",
              "Read `substance.rationale` and `substance.pillars[].rationale` + `.evidence[]` — that is the LLM-judged content verdict, independent from `format_score`. A high format_score with a low substance_score means the file looks right and says little; fix substance first.",
              fbReq ? `When done iterating, call \`submit_feedback\` with request_id="${fbReq.id}" and a 1-5 rating.` : "",
            ].filter(Boolean),
    });
  },
});

export const reviewSkillsBatchTool = defineTool({
  name: "review_skills_batch",
  description:
    "[UPGRADE] Batch variant of `review_skill` — score up to 10 local files in ONE call, evaluated in parallel. Same proprietary engine, same per-file payload (overall_score, structural/content split, pillars, top_actions, content_hash, semantic_pass). Ideal for a skill-optimizer iterating over many files: far lower round-trip latency than N individual calls, and identical re-submissions are served from a short-lived result cache. Returns `results[]` aligned to the input order plus a single shared `feedback_request`. Read-only, no auth.",
  parameters: z.object({
    files: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          type: z.enum(["skill", "playbook", "soul", "guardrail"]).default("skill"),
          content: z.string().min(20).max(120_000),
          doc_class: z
            .enum(["skill", "governance", "playbook-ops", "guardrail-ops", "auto"])
            .default("auto"),
        })
      )
      .min(1)
      .max(10),
    semantic_check: z
      .boolean()
      .default(true)
      .describe("Run the LLM-backed semantic pass per file. Set false for a fast, zero-cost deterministic-only batch."),
    language: z
      .enum(["en", "pt", "es", "fr", "de", "it"])
      .optional()
      .describe("Override the document language for ALL files in the batch (localized feedback + semantic hint)."),
  }),
  execute: async ({ files, semantic_check, language }) => {
    const results = await Promise.all(
      files.map((f) =>
        computeReview({
          name: f.name,
          type: f.type,
          content: f.content,
          doc_class: f.doc_class,
          semantic_check,
          language,
        }).catch((e: any) => ({ file: f.name, error: e?.message ?? "review_failed" }))
      )
    );

    // One shared feedback request for the whole batch (cheaper than N inserts).
    const { data: fbReq } = await supabaseAdmin
      .from("package_feedback_requests")
      .insert({
        kind: "review_skill",
        package_id: null,
        source: "mcp",
        context: { batch: true, count: files.length },
      })
      .select("id, expires_at")
      .single();

    const scored = results.filter((r) => typeof (r as { overall_score?: number }).overall_score === "number");
    const avg =
      scored.length > 0
        ? Math.round(scored.reduce((s, r) => s + ((r as { verdict_score: number }).verdict_score ?? 0), 0) / scored.length)
        : null;

    return json({
      engine: ENGINE,
      count: files.length,
      scored: scored.length,
      avg_verdict_score: avg,
      results,
      feedback_request: fbReq
        ? {
            id: fbReq.id,
            expires_at: fbReq.expires_at,
            prompt: "After applying the actions, rate this batch review (1-5) via `submit_feedback`.",
            tool: "submit_feedback",
          }
        : null,
      next_steps: [
        "Apply each file's `top_actions` in the user's repo; results are aligned to your input order.",
        "Re-submit changed files (identical content is served from cache); compare `content_hash` to detect no-op edits.",
      ],
    });
  },
});

/* ============================================================
 * submit_feedback — host LLM (or human via CLI) sends rating + comment
 * after consuming a review_skill / request_primitive / upload_packages
 * result. Validated via SECURITY DEFINER `submit_package_feedback` RPC.
 * Anonymous OK; the rate-limit lives in the JSON-RPC layer (mcp.ts).
 * ============================================================ */
export const submitFeedbackTool = defineTool({
  name: "submit_feedback",
  description:
    "[FEEDBACK] Send a rating + optional comment for a prior SuperAgentSkill action (review_skill, request_primitive, upload_packages, author/forge loop). Pass the `request_id` returned in the prior response's `feedback_request.id`. Single-use; expires 30 days after issuance. Anonymous-OK.",
  parameters: z.object({
    request_id: z.string().uuid().describe("The id from the prior response's feedback_request.id"),
    rating: z.number().int().min(1).max(5).describe("1 = bad, 5 = excellent"),
    sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
    comments: z.string().max(4000).optional(),
    agent_model: z.string().max(120).optional().describe("e.g. claude-sonnet-4-5, gpt-5, gemini-3-pro"),
  }),
  execute: async ({ request_id, rating, sentiment, comments, agent_model }) => {
    const inferred = sentiment ?? (rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral");
    const { data, error } = await supabaseAdmin.rpc("submit_package_feedback", {
      _request_id: request_id,
      _rating: rating,
      _sentiment: inferred,
      _comments: comments ?? null,
      _source: "mcp",
      _agent_model: agent_model ?? null,
      _context: {},
    } as any);
    if (error) return json({ ok: false, error: error.message });
    return json({ ok: true, feedback_id: data, message: "Thanks — recorded." });
  },
});
