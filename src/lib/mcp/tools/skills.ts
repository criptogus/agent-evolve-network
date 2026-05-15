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
    "[PRIVATE UPLOAD] Push local primitive(s) into the author's PRIVATE workspace. Files are normalised by the SkillForge author pipeline and stored as private drafts owned by the token holder — NOT visible in the public marketplace, search, or trust leaderboard. To list a draft for sale on the marketplace, the author must explicitly publish it from the website UI (/account/packages). This MCP tool intentionally has no `publish` parameter so agents cannot expose a user's skill publicly without their consent. Requires OAuth or a personal MCP token from /account/tokens.",
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
  }),
  execute: async ({ auth_token, files }) => {
    const userId = await resolveUserFromToken(auth_token);
    if (!userId) return json({ error: "invalid_token", hint: "Mint a token at /account/tokens" });
    try {
      // Always private. Marketplace listing requires an explicit user action in the UI.
      const results = await processBulkUpload(supabaseAdmin as any, userId, files, { publish: false });
      const ok = results.filter((r) => r.ok).length;
      return json({
        uploaded: ok,
        failed: results.length - ok,
        visibility: "private_draft",
        next_step: "Open /account/packages on superagentskill.com to list a draft on the marketplace.",
        results,
      });
    } catch (e: any) {
      return json({ error: e?.message ?? "upload_failed" });
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

const ENGINE = "sas-eval/2";

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

// Per-primitive emphasis. Souls live or die on identity; guardrails on
// guardrails; playbooks on procedure; skills are balanced. Weights are
// intentionally server-private — they are a large part of why the score is
// hard to reverse-engineer from outputs.
const TYPE_WEIGHTS: Record<string, Partial<Record<PillarId, number>>> = {
  skill: { identity: 1, scope: 1.2, procedure: 1.3, examples: 1.3, guardrails: 1.1, trust: 1, portability: 0.9 },
  playbook: { identity: 0.8, scope: 1.1, procedure: 1.8, examples: 1.2, guardrails: 1.1, trust: 1, portability: 0.8 },
  soul: { identity: 2, scope: 0.8, procedure: 0.6, examples: 0.9, guardrails: 1.2, trust: 0.9, portability: 0.9 },
  guardrail: { identity: 0.7, scope: 1, procedure: 1, examples: 1, guardrails: 2, trust: 1.1, portability: 0.9 },
};

// Each signal contributes a graded amount (primary hit = full, secondary =
// partial). Multi-signal + partial credit makes the surface score a smooth
// function the caller cannot map back to a discrete checklist.
type Signal = { w: number; primary: RegExp; secondary?: RegExp };

const SIGNALS: Record<PillarId, Signal[]> = {
  identity: [
    { w: 1, primary: /you are |role:|persona:|act as /i, secondary: /assistant|agent that/i },
    { w: 1, primary: /values?:|principles?:|cares? about|believe/i, secondary: /prioriti[sz]e|stands? for/i },
    { w: 0.8, primary: /\bvoice\b|\btone\b|writing style/i, secondary: /concise|formal|friendly|tone of/i },
    { w: 1, primary: /non-goals?|will not|won't|out of scope/i, secondary: /\bnever\b|avoid doing/i },
    { w: 1, primary: /refus|decline|cannot help|won't assist/i, secondary: /escalate|hand off/i },
  ],
  scope: [
    { w: 1.2, primary: /use when|use this when|job:|purpose:|when to use/i, secondary: /applies to|good for/i },
    { w: 1, primary: /trigger|invoke|activate when/i, secondary: /when the user (asks|says|wants)/i },
    { w: 1, primary: /anti-trigger|do not use|skip when|not for/i, secondary: /unless|except when/i },
    { w: 0.8, primary: /target user|audience|intended for|for: /i, secondary: /role of the user/i },
  ],
  procedure: [
    { w: 1.4, primary: /^\s*\d+[.)]/m, secondary: /^\s*[-*] /m },
    { w: 1.1, primary: /input:|output:|success:|done when|✓/i, secondary: /returns?:|produces?:/i },
    { w: 1, primary: /if .*(then|→)|otherwise|else if|branch|fork/i, secondary: /\bcase\b|depending on/i },
    { w: 1, primary: /stop when|definition of done|finish when|terminate/i, secondary: /until (the|all)/i },
  ],
  examples: [
    { w: 1.3, primary: /(example|sample|worked|walkthrough)/i, secondary: /e\.g\.|for instance/i },
    { w: 1.2, primary: /bad example|anti-example|wrong:|❌|fails when|counter-?example/i, secondary: /pitfall|mistake/i },
    { w: 1, primary: /messy|edge case|ambiguous|partial input|real-world/i, secondary: /unhappy path|corner case/i },
  ],
  guardrails: [
    { w: 1.2, primary: /failure mode|known issue|risk:|pitfall|threat model/i, secondary: /can go wrong|caveat/i },
    { w: 1.2, primary: /mitigat|prevent|guard against|defen[sc]e|countermeasure/i, secondary: /to avoid this/i },
    { w: 1.3, primary: /prompt injection|untrusted|treat .* as data|ignore instructions in/i, secondary: /sanitiz|do not follow instructions/i },
    { w: 1, primary: /\bpii\b|secret|redact|do not log|citation|cite sources/i, secondary: /confidential|sensitive data/i },
  ],
  trust: [
    { w: 1, primary: /validated on|tested on|claude|gpt-|gemini|llama/i, secondary: /model:|benchmarked/i },
    { w: 1.1, primary: /acceptance criteri|success criter|self-eval|self check/i, secondary: /pass if|must satisfy/i },
    { w: 1.1, primary: /output schema|```|return json|structured (output|result)/i, secondary: /named sections|format:/i },
    { w: 0.9, primary: /report_execution|telemetry|emit metrics/i, secondary: /track success/i },
  ],
  portability: [
    { w: 1, primary: /only works on|requires claude|requires gpt|requires gemini|claude-only/i, secondary: /vendor-specific/i },
    { w: 1, primary: /anthropic sdk|openai sdk|google ai sdk|tool_use block/i },
    { w: 1, primary: /.{16001,}/s },
    { w: 0.8, primary: /^---[\s\S]*?(lovable:|proprietary:|internal:)/m },
  ],
};
// portability signals 3 & 4 and 1 & 2 are *penalties* (presence = worse);
// handled in scorePillar by inverting.
const PORTABILITY_NEGATIVE = new Set([0, 1, 2, 3]);

// Outcome-level directives. These describe the desired END STATE, not the
// detector. Safe to surface because they do not reveal how we measure or
// what the threshold is — only what a stronger primitive of this kind looks
// like. The pool is rotated so repeated calls don't crystallise a static list.
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
  ],
};

interface PillarScore {
  pillar: PillarId;
  title: string;
  score: number; // 0..100, graded
}

function scorePillar(id: PillarId, text: string): { score: number; deficit: number } {
  const signals = SIGNALS[id];
  let earned = 0;
  let total = 0;
  signals.forEach((s, idx) => {
    total += s.w;
    const isNeg = id === "portability" && PORTABILITY_NEGATIVE.has(idx);
    const primaryHit = s.primary.test(text);
    const secondaryHit = s.secondary ? s.secondary.test(text) : false;
    let frac = primaryHit ? 1 : secondaryHit ? 0.5 : 0;
    if (isNeg) frac = 1 - frac; // for penalty signals, absence is good
    earned += frac * s.w;
  });
  const score = Math.max(0, Math.min(100, Math.round((earned / total) * 100)));
  return { score, deficit: 100 - score };
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

// Deterministic-but-rotating pick so repeat calls on the same file don't
// surface an identical, memorisable list.
function pickDirective(id: PillarId, content: string, salt: number): string {
  const pool = DIRECTIVES[id];
  let h = salt;
  for (let i = 0; i < content.length; i += 97) h = (h * 31 + content.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

export const getMethodologyTool = defineTool({
  name: "get_methodology",
  description:
    "[UPGRADE] Orientation for the local-file upgrade flow. Returns the dimensions the proprietary SuperAgentSkill engine evaluates and how to drive the loop — NOT the rubric, signals or thresholds (those are server-side and intentionally not disclosed). The actionable output comes from review_skill. Read-only, no auth.",
  parameters: z.object({}),
  execute: async () =>
    json({
      engine: ENGINE,
      name: "Super Agent Skill evaluation",
      proprietary: true,
      note:
        "Scoring is performed server-side by a proprietary engine. The detection signals, weights and thresholds are not exposed — call review_skill to get this file's scores and the specific improvements to apply, then iterate.",
      dimensions: (Object.keys(PILLAR_TITLE) as PillarId[]).map((id) => ({
        id,
        title: PILLAR_TITLE[id],
      })),
      how_to_use: [
        "1. review_skill — submit the file; get overall_score, per-dimension scores and prioritised, file-specific actions.",
        "2. You (the host agent) apply the actions in the user's repo.",
        "3. review_skill again — confirm the score rose. Iterate until grade A.",
        "4. Optionally search_registry / get_package to borrow patterns from high-trust primitives.",
        "5. request_primitive to have Super Agent Skill author a brand-new primitive from scratch.",
      ],
    }),
});

export const reviewSkillTool = defineTool({
  name: "review_skill",
  description:
    "[UPGRADE] Score a local skill / playbook / soul / guardrail with the proprietary SuperAgentSkill engine. Returns overall_score (0-100), grade, per-dimension scores (number + strong/adequate/weak band) and `top_actions` — prioritised, file-specific improvements to apply. It does NOT return the rubric, the detection signals or per-check pass/fail (those stay server-side by design). Apply the actions, then call again to confirm the score rose. Read-only, no auth.",
  parameters: z.object({
    name: z.string().min(1).max(200).describe("File or skill name (for the report header only)"),
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).default("skill"),
    content: z.string().min(20).max(120_000).describe("Raw markdown / prompt text of the local file"),
  }),
  execute: async ({ name, type, content }) => {
    const ids = Object.keys(PILLAR_TITLE) as PillarId[];
    const weights = TYPE_WEIGHTS[type] ?? TYPE_WEIGHTS.skill;
    const raw = ids.map((id) => ({ id, ...scorePillar(id, content) }));

    let wSum = 0;
    let wTotal = 0;
    for (const r of raw) {
      const w = weights[r.id] ?? 1;
      wSum += r.score * w;
      wTotal += w;
    }
    const overall = Math.round(wSum / wTotal);

    const pillars: (PillarScore & { status: string })[] = raw.map((r) => ({
      pillar: r.id,
      title: PILLAR_TITLE[r.id],
      score: r.score,
      status: statusBand(r.score),
    }));

    // Rank by weighted deficit so the actions target what most moves THIS
    // primitive's score — without revealing the weighting.
    const ranked = [...raw]
      .map((r) => ({ id: r.id, impact: r.deficit * (weights[r.id] ?? 1) }))
      .sort((a, b) => b.impact - a.impact)
      .filter((r) => r.impact > 0)
      .slice(0, 4);

    const topActions = ranked.map((r, i) => ({
      area: PILLAR_TITLE[r.id],
      priority: i + 1,
      action: pickDirective(r.id, content, i + 1),
    }));

    return json({
      file: name,
      type,
      engine: ENGINE,
      overall_score: overall,
      grade: gradeBand(overall),
      pillars,
      top_actions: topActions,
      next_steps:
        topActions.length === 0
          ? ["Grade A — no high-impact gaps detected. Re-run after any substantive edit."]
          : [
              "Apply the top_actions in the user's local file (you, the host agent, do the editing).",
              "Re-run review_skill with the updated content to confirm the score rose.",
              "Optionally call search_registry to borrow patterns from high-trust primitives of the same type.",
            ],
    });
  },
});
