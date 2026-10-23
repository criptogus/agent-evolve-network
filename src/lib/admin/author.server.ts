import { generateText, Output } from "ai";
import { getGatewayModel, describeGatewayConfig } from "@/lib/ai-gateway";
import { PackageDraftSchema, PackageDraftMinimalSchema, type PackageDraft, type PackageDraftMinimal } from "@/lib/skills/schemas";
import { PackageDraftLooseSchema, repairMinimalDraft, draftFromDocument } from "@/lib/skills/draft-repair";

const META_SYSTEM = `You are SkillForge Author, a proprietary meta-agent that designs production-grade agent packages.
Return STRICT JSON matching the requested schema. Keep it minimal but substantive:
- system_prompt: a complete operational instruction set with reasoning steps and expected output format.
- examples: at least 1 realistic example covering the happy path.
- description: one sentence, plain language.
- long_description: 2–4 short paragraphs. What it does, when to use it, what it produces.
Type semantics: skill = capability; playbook = multi-step decision flow; soul = personality/values layer; guardrail = safety boundary.
Slug must be lowercase-kebab. No filler, no meta-commentary.`;

// Author model fallback chain, cheapest/fastest first. The minimal schema
// (see PackageDraftMinimalSchema) fits well inside flash's structured-output
// budget, so flash almost always wins and pro is only reached on outages.
// "default" resolves to the env-configured AI_GATEWAY_MODEL when set.
const AUTHOR_MODEL_FALLBACKS = [
  "google/gemini-2.5-flash",
  "default",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
] as const;

// Per-attempt timeout. The minimal schema generates ~1KB of JSON — flash
// closes in 3-6s, so 12s already covers the slow tail. The previous 25s ×
// 4 models + text fallback could reach ~125s, which blew every serverless
// budget and left upload jobs orphaned in `processing`.
const PER_ATTEMPT_TIMEOUT_MS = 12_000;
// Hard wall-clock ceiling for one generateDraft() call, across every model
// in the fallback chain plus the text fallback. Once exceeded we stop trying
// and fail fast so the caller (queue worker / MCP tool) always returns
// inside its own request budget instead of being killed mid-flight.
const TOTAL_BUDGET_MS = 34_000;

/**
 * Hydrate a minimal draft into the full PackageDraft shape with sensible
 * defaults. We ask the LLM for the minimum viable answer (see
 * PackageDraftMinimalSchema) because provider strict-mode reliably rejects
 * the full schema, then fill in the rest in deterministic code.
 */
function hydrateDraftFromMinimal(
  min: PackageDraftMinimal,
  type: "skill" | "playbook" | "soul" | "guardrail",
): PackageDraft {
  // Duplicate the first example when the model returned only one; the full
  // schema requires 2+ but we accept 1 from the LLM for reliability.
  const examples = min.examples.length >= 2
    ? min.examples
    : [
        ...min.examples,
        {
          title: "Edge case",
          input: min.examples[0]?.input ?? "Unusual/edge input",
          expected_output: min.examples[0]?.expected_output ?? "Handle gracefully; escalate or refuse if outside scope.",
        },
      ];
  const hydrated: PackageDraft = {
    slug: min.slug,
    name: min.name,
    type,
    description: min.description,
    long_description: min.long_description.length >= 80
      ? min.long_description
      : `${min.long_description}\n\nUse it when: your workflow needs a repeatable ${type} that produces consistent output. This draft can be refined further with the SuperAgentSkill review engine.`,
    system_prompt: min.system_prompt.length >= 120
      ? min.system_prompt
      : `${min.system_prompt}\n\nReasoning:\n1. Confirm you understood the request.\n2. Apply the ${type} logic above.\n3. Return the result in the format the caller expects.`,
    rules: {
      input_schema: {},
      output_schema: {},
      must: [],
      must_not: [],
      enforcement: "prompt",
    },
    examples,
    compatibility: [],
    scopes: ["agent:upgrade", "registry:read"],
    mcp_servers: [],
    permissions: [],
    live_resources: [],
  };
  const parsed = PackageDraftSchema.safeParse(hydrated);
  if (!parsed.success) {
    // Shouldn't happen — the hydrated shape is designed to satisfy the full
    // schema. If it fails, surface the mismatch so it's fixable, don't
    // silently insert something malformed.
    throw new Error(
      `hydrateDraftFromMinimal produced invalid draft: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }
  return parsed.data;
}

export type DraftGenerationPath = "structured" | "text" | "deterministic";

export async function generateDraft(
  brief: string,
  type: "skill" | "playbook" | "soul" | "guardrail",
  vertical?: string,
  grounding?: string,
  source?: { filename?: string; content?: string },
): Promise<PackageDraft> {
  return (await generateDraftWithMeta(brief, type, vertical, grounding, source)).draft;
}

/**
 * Same pipeline as generateDraft but reports WHICH path produced the draft.
 * `deterministic` means every model failed and the draft was built from the
 * uploaded document itself — the upload still succeeds instead of returning
 * "No object generated" to the caller.
 */
export async function generateDraftWithMeta(
  brief: string,
  type: "skill" | "playbook" | "soul" | "guardrail",
  vertical?: string,
  grounding?: string,
  source?: { filename?: string; content?: string },
): Promise<{ draft: PackageDraft; generation_path: DraftGenerationPath; attempts: string[] }> {
  const prompt = `Brief:\n${brief}\n\nType: ${type}${vertical ? `\nVertical: ${vertical}` : ""}${
    grounding ? `\n\nGrounding research (use as ground truth):\n${grounding.slice(0, 8000)}` : ""
  }\n\nDesign a production-ready ${type} package. Return ONLY the JSON — minimal, tight, complete.`;

  const startedAt = Date.now();
  const remaining = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);
  const attemptBudget = () => Math.min(PER_ATTEMPT_TIMEOUT_MS, remaining());
  const repairCtx = { type, filename: source?.filename, content: source?.content };

  const attempts: Array<{ model: string; error: string }> = [];
  const cfg = describeGatewayConfig();
  if (!cfg.configured) {
    console.error("[skillforge.author] no AI gateway configured:", cfg);
    throw new Error(
      "SkillForge author cannot run: no AI gateway configured. Set AI_GATEWAY_API_KEY (or LOVABLE_API_KEY / OPENAI_API_KEY) in the server env.",
    );
  }
  // De-dup: skip `default` when it resolves to another id already in the list.
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const m of AUTHOR_MODEL_FALLBACKS) {
    const resolved = m === "default" ? (cfg.defaultModel ?? "default") : m;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    ordered.push(m);
  }
  for (const modelId of ordered) {
    // Leave at least 6s of budget for the text fallback below; if we can't
    // fit another structured attempt, stop burning the clock.
    if (remaining() < 8_000) {
      attempts.push({ model: modelId, error: "skipped: total budget exhausted" });
      break;
    }
    try {
      const model = getGatewayModel(modelId);
      const { experimental_output } = await generateText({
        model,
        system: META_SYSTEM,
        prompt,
        // LOOSE schema at the provider boundary: fields + types only. Length
        // limits and the slug regex are applied afterwards by
        // repairMinimalDraft, so a slightly-off value no longer discards the
        // entire response ("response did not match schema").
        experimental_output: Output.object({ schema: PackageDraftLooseSchema }),
        abortSignal: AbortSignal.timeout(attemptBudget()),
      });
      const minimal = repairMinimalDraft(experimental_output, repairCtx);
      const draft = hydrateDraftFromMinimal(minimal, type);
      if (attempts.length > 0) {
        console.warn(
          `[skillforge.author] recovered on ${modelId} after ${attempts.length} failure(s):`,
          attempts,
        );
      }
      return { draft, generation_path: "structured", attempts: attempts.map(fmtAttempt) };
    } catch (e: any) {
      const msg = describeAttemptError(e);
      attempts.push({ model: modelId, error: msg });
      console.error(`[skillforge.author] ${modelId} structured failed:`, msg);
    }
  }

  // Structured-output path failed on every model. Fall back to plain text on
  // the fastest model, parse ourselves, repair, then hydrate.
  try {
    if (remaining() < 4_000) throw new Error("skipped: total budget exhausted");
    const fallbackModel = getGatewayModel("google/gemini-2.5-flash");
    const { text } = await generateText({
      model: fallbackModel,
      system:
        META_SYSTEM +
        `\n\nReturn ONLY a single JSON object with these keys: slug, name, type, description, long_description, system_prompt, examples. examples is an array of >=1 items each with {title, input, expected_output}. No markdown, no prose, no code fences.`,
      prompt,
      abortSignal: AbortSignal.timeout(attemptBudget()),
    });
    const json = extractJsonObject(text);
    const minimal = repairMinimalDraft(json, repairCtx);
    const draft = hydrateDraftFromMinimal(minimal, type);
    console.warn(
      `[skillforge.author] recovered via text fallback after ${attempts.length} structured failure(s):`,
      attempts,
    );
    return { draft, generation_path: "text", attempts: attempts.map(fmtAttempt) };
  } catch (e: any) {
    attempts.push({ model: "text-fallback", error: describeAttemptError(e) });
    console.error(`[skillforge.author] text fallback failed:`, attempts[attempts.length - 1]?.error);
  }

  // Last resort: build the draft from the uploaded document itself. No model
  // involved, so this cannot fail — the author gets a private draft they can
  // refine instead of a hard "No object generated" error.
  if (source?.content && source.content.trim().length >= 40) {
    const minimal = draftFromDocument(source.filename ?? "upload.md", source.content, type);
    const draft = hydrateDraftFromMinimal(minimal, type);
    console.warn(
      `[skillforge.author] deterministic fallback used (all models failed):`,
      attempts.map(fmtAttempt),
    );
    return { draft, generation_path: "deterministic", attempts: attempts.map(fmtAttempt) };
  }

  const summary = attempts.map(fmtAttempt).join(" | ");
  throw new Error(`SkillForge author failed across all fallback models — ${summary}`);
}

function fmtAttempt(a: { model: string; error: string }): string {
  return `${a.model}: ${a.error}`;
}



// AI SDK errors hide the upstream body inside `e.text` (NoObjectGeneratedError),
// `e.responseBody` (HTTP errors), or `e.cause`. Bare `e.message` strips all of
// that and leaves operators chasing "Bad Request" with no context.
function describeAttemptError(e: any): string {
  const parts: string[] = [];
  if (e?.message) parts.push(String(e.message));
  if (e?.name && !parts[0]?.includes(e.name)) parts.unshift(String(e.name));
  if (e?.text && typeof e.text === "string") parts.push(`text=${e.text.slice(0, 400)}`);
  if (e?.responseBody && typeof e.responseBody === "string")
    parts.push(`body=${e.responseBody.slice(0, 400)}`);
  if (e?.cause?.message && e.cause.message !== e?.message)
    parts.push(`cause=${String(e.cause.message).slice(0, 200)}`);
  return parts.join(" | ") || String(e);
}

// Permissive JSON extractor: handles plain JSON, markdown-fenced JSON, and
// preamble/postamble text the model sometimes adds despite instructions.
function extractJsonObject(text: string): unknown {
  const stripped = text.trim();
  const tryParse = (s: string) => {
    try { return JSON.parse(s); } catch { return undefined; }
  };
  const direct = tryParse(stripped);
  if (direct !== undefined) return direct;
  const fence = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const v = tryParse(fence[1].trim());
    if (v !== undefined) return v;
  }
  // Last resort: locate the first {...} block by brace balancing.
  const start = stripped.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    for (let i = start; i < stripped.length; i++) {
      const c = stripped[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          const v = tryParse(stripped.slice(start, i + 1));
          if (v !== undefined) return v;
          break;
        }
      }
    }
  }
  throw new Error(`text fallback returned non-JSON: ${stripped.slice(0, 200)}`);
}

export async function insertDraftPackage(
  supabase: any,
  userId: string,
  draft: any,
  meta: { source_kind: "github" | "markdown" | "request" | "wizard"; source_ref: string }
) {
  const baseSlug = draft.slug;
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const { data: existing } = await supabase
      .from("packages")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 50) break;
  }

  const { data: pkg, error: pkgErr } = await supabase
    .from("packages")
    .insert({
      slug,
      name: draft.name,
      type: draft.type,
      description: draft.description,
      long_description: draft.long_description,
      author_id: userId,
      // Trust fields are NOT self-asserted. A new draft is unverified and
      // unreviewed; `author_verified` and `review_status='approved'` are only
      // ever granted by an admin via the review workflow. The DB also enforces
      // this with a BEFORE UPDATE trigger so a compromised/abused client
      // cannot escalate via direct RLS writes.
      author_verified: false,
      is_published: false,
      review_status: "draft",
      latest_version: "0.1.0",
      scopes: draft.scopes,
      source_kind: meta.source_kind,
      source_ref: meta.source_ref,
    })
    .select()
    .single();
  if (pkgErr) throw new Response(`Insert package failed: ${pkgErr.message}`, { status: 500 });

  const { error: verErr } = await supabase.from("package_versions").insert({
    package_id: pkg.id,
    version: "0.1.0",
    status: "beta",
    notes: `Source: ${meta.source_kind} (${meta.source_ref})`,
    system_prompt: draft.system_prompt,
    rules: draft.rules,
    examples: draft.examples,
    compatibility: draft.compatibility,
  });
  if (verErr) throw new Response(`Insert version failed: ${verErr.message}`, { status: 500 });

  return pkg;
}

export function inferType(path: string, content: string): "skill" | "playbook" | "soul" | "guardrail" {
  const p = path.toLowerCase();
  const c = content.slice(0, 1000).toLowerCase();
  if (p.includes("guardrail") || c.includes("guardrail") || c.includes("policy")) return "guardrail";
  if (p.includes("playbook") || c.includes("step 1") || c.includes("workflow")) return "playbook";
  if (p.includes("soul") || c.includes("persona") || c.includes("tone of voice")) return "soul";
  return "skill";
}
