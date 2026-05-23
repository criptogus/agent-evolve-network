import { generateText, Output } from "ai";
import { getGatewayModel, describeGatewayConfig } from "@/lib/ai-gateway";
import { PackageDraftSchema } from "@/lib/skills/schemas";

const META_SYSTEM = `You are SkillForge Author, a proprietary meta-agent that designs production-grade agent packages.
You output strict JSON conforming to the PackageDraft schema. Every package must be:
- Executable: system_prompt is a complete operational instruction set with reasoning steps and output format.
- Verifiable: rules.input_schema/output_schema use JSON-schema-like fields; must/must_not are testable invariants.
- Realistic: at least 2 examples covering happy path and edge case.
- Domain-specific: reflect the brief's vertical, tools, and constraints. No filler.

Type semantics: skill = capability; playbook = multi-step decision flow; soul = personality/values layer; guardrail = safety boundary.
Slug must be lowercase-kebab.`;

// Author model fallback chain. The structured-output path (Output.object →
// tool/function calling) is sensitive to provider/model quirks, so we try
// an ordered list before giving up. First success wins.
//
// The list intentionally mixes Google + OpenAI ids because production has
// shifted gateways: deployments running the Lovable gateway respond to
// google/* ids; deployments on a plain OpenAI-compatible gateway only
// understand openai/* (and reject the Google ones with a 400). Including
// both means at least one survives whichever gateway is configured.
//
// "default" is the env-configured AI_GATEWAY_MODEL — tried FIRST so a
// well-configured deployment doesn't pay the latency of a doomed attempt.
const AUTHOR_MODEL_FALLBACKS = [
  "default",
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
] as const;

// Per-attempt timeout. Vercel serverless caps the whole request; trying 3
// models with no individual budget meant a single hung upstream (observed
// ~35s) burned the entire function before any fallback ran. With 12s per
// model the worst-case is ~36s of upstream + overhead, still under a 60s
// function limit and surfacing the timeout as a normal attempt failure
// that flips to the next model instead of a hard 504.
const PER_ATTEMPT_TIMEOUT_MS = 12_000;

export async function generateDraft(
  brief: string,
  type: "skill" | "playbook" | "soul" | "guardrail",
  vertical?: string,
  grounding?: string
) {
  const prompt = `Brief:\n${brief}\n\nType: ${type}${vertical ? `\nVertical: ${vertical}` : ""}${
    grounding ? `\n\nGrounding research (use as ground truth):\n${grounding.slice(0, 8000)}` : ""
  }\n\nDesign a complete, production-ready ${type} package. Return ONLY the JSON.`;

  const attempts: Array<{ model: string; error: string }> = [];
  // Log the gateway config once per request so the cause of a total
  // failure (e.g. "no AI gateway configured") is clear in the logs.
  const cfg = describeGatewayConfig();
  if (!cfg.configured) {
    console.error("[skillforge.author] no AI gateway configured:", cfg);
    throw new Error(
      "SkillForge author cannot run: no AI gateway configured. Set AI_GATEWAY_API_KEY (or LOVABLE_API_KEY / OPENAI_API_KEY) in the server env.",
    );
  }
  // De-dup: if `default` resolves to one of the explicit ids below, drop
  // the duplicate so we don't pay double latency on the doomed second try.
  const explicit = AUTHOR_MODEL_FALLBACKS.filter((m) => m !== "default");
  const ordered =
    cfg.defaultModel && explicit.includes(cfg.defaultModel as never)
      ? explicit
      : (["default", ...explicit] as readonly string[]);
  for (const modelId of ordered) {
    try {
      const model = getGatewayModel(modelId);
      const { experimental_output } = await generateText({
        model,
        system: META_SYSTEM,
        prompt,
        experimental_output: Output.object({ schema: PackageDraftSchema }),
        abortSignal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS),
      });
      if (experimental_output.type !== type) experimental_output.type = type;
      if (attempts.length > 0) {
        // We recovered — log so we can spot a regression on the primary model.
        console.warn(
          `[skillforge.author] recovered on ${modelId} after ${attempts.length} failure(s):`,
          attempts,
        );
      }
      return experimental_output;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      attempts.push({ model: modelId, error: msg });
      console.error(`[skillforge.author] ${modelId} failed:`, msg);
    }
  }
  // All fallbacks exhausted. Surface a structured error so the upload
  // pipeline can report it back to the caller instead of silently
  // recording "failed".
  const summary = attempts.map((a) => `${a.model}: ${a.error}`).join(" | ");
  throw new Error(`SkillForge author failed across all fallback models — ${summary}`);
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
