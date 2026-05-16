import { generateText, Output } from "ai";
import { getGatewayModel } from "@/lib/ai-gateway";
import { PackageDraftSchema } from "@/lib/skills/schemas";

const META_SYSTEM = `You are SkillForge Author, a proprietary meta-agent that designs production-grade agent packages.
You output strict JSON conforming to the PackageDraft schema. Every package must be:
- Executable: system_prompt is a complete operational instruction set with reasoning steps and output format.
- Verifiable: rules.input_schema/output_schema use JSON-schema-like fields; must/must_not are testable invariants.
- Realistic: at least 2 examples covering happy path and edge case.
- Domain-specific: reflect the brief's vertical, tools, and constraints. No filler.

Type semantics: skill = capability; playbook = multi-step decision flow; soul = personality/values layer; guardrail = safety boundary.
Slug must be lowercase-kebab.`;

export async function generateDraft(
  brief: string,
  type: "skill" | "playbook" | "soul" | "guardrail",
  vertical?: string,
  grounding?: string
) {
  const model = getGatewayModel("google/gemini-3-flash-preview");
  const prompt = `Brief:\n${brief}\n\nType: ${type}${vertical ? `\nVertical: ${vertical}` : ""}${
    grounding ? `\n\nGrounding research (use as ground truth):\n${grounding.slice(0, 8000)}` : ""
  }\n\nDesign a complete, production-ready ${type} package. Return ONLY the JSON.`;

  const { experimental_output } = await generateText({
    model,
    system: META_SYSTEM,
    prompt,
    experimental_output: Output.object({ schema: PackageDraftSchema }),
  });
  if (experimental_output.type !== type) experimental_output.type = type;
  return experimental_output;
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
