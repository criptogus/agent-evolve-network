// Deterministic repair layer between the LLM structured-output boundary and
// the strict PackageDraft schemas.
//
// Why this exists: we used to hand providers a constrained schema (slug regex,
// description 20..280, long_description >= 40, system_prompt >= 60). A model
// that returned "Skill: Deal Memo" as a slug or a 300-char description caused
// the WHOLE response to be discarded with "No object generated: response did
// not match schema". Every model in the fallback chain then burned the budget
// and the upload job failed/timed out (client-reported, confirmed in
// package_upload_jobs.error).
//
// New contract: ask the model for FIELDS AND TYPES ONLY (see
// PackageDraftLooseSchema), then coerce the values into the strict shape here.
// Pure module — no server imports — so it can be unit-tested under plain node.
import { z } from "zod";
import { PackageDraftMinimalSchema, type PackageDraftMinimal } from "./schemas";

export type DraftType = "skill" | "playbook" | "soul" | "guardrail";

/** LLM-facing schema: no length limits, no regex, everything nudged to string. */
export const PackageDraftLooseSchema = z.object({
  slug: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  long_description: z.string().optional(),
  system_prompt: z.string().optional(),
  examples: z
    .array(
      z.object({
        title: z.string().optional(),
        input: z.string().optional(),
        expected_output: z.string().optional(),
      }),
    )
    .optional(),
});
export type PackageDraftLoose = z.infer<typeof PackageDraftLooseSchema>;

export function slugify(input: string, fallback = "untitled-primitive"): string {
  const s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  if (s.length >= 2) return s;
  return fallback;
}

function firstHeading(content: string): string | null {
  const m = content.match(/^\s*#{1,3}\s+(.+)$/m);
  if (m?.[1]) return m[1].trim().replace(/[#*`]/g, "").slice(0, 120);
  const fm = content.match(/^---[\s\S]*?\bname:\s*["']?([^"'\n]+)/);
  if (fm?.[1]) return fm[1].trim().slice(0, 120);
  return null;
}

function firstSentence(content: string): string {
  const prose = content
    .replace(/^---[\s\S]*?\n---/, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  const m = prose.match(/^(.{20,240}?[.!?])(\s|$)/);
  return (m?.[1] ?? prose.slice(0, 200)).trim();
}

function pad(text: string, min: number, filler: string): string {
  if (text.length >= min) return text;
  return `${text}${text.endsWith(".") ? "" : "."} ${filler}`.slice(0, 4000);
}

/**
 * Coerce whatever the model produced into a valid PackageDraftMinimal.
 * Never throws for recoverable shape problems — that is the whole point.
 */
export function repairMinimalDraft(
  raw: unknown,
  ctx: { type: DraftType; filename?: string; content?: string },
): PackageDraftMinimal {
  const loose = PackageDraftLooseSchema.safeParse(raw ?? {});
  const v: PackageDraftLoose = loose.success ? loose.data : {};
  const content = ctx.content ?? "";
  const docTitle = firstHeading(content);
  const fileBase = (ctx.filename ?? "").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();

  const name = (v.name?.trim() || docTitle || fileBase || `Untitled ${ctx.type}`).slice(0, 120);
  const slug = slugify(v.slug?.trim() || name || fileBase, slugify(`${ctx.type}-${Date.now()}`));

  let description = (v.description?.trim() || (content ? firstSentence(content) : "")).replace(/\s+/g, " ");
  if (description.length < 20) {
    description = `${name} — a production-ready ${ctx.type} for agent runtimes.`;
  }
  description = description.slice(0, 280);

  let long_description = (v.long_description?.trim() || "").slice(0, 4000);
  if (long_description.length < 40) {
    long_description = pad(
      long_description || description,
      80,
      `Use it when your workflow needs a repeatable ${ctx.type}. Refine it further with the SuperAgentSkill review engine.`,
    );
  }

  let system_prompt = (v.system_prompt?.trim() || "").trim();
  if (system_prompt.length < 60) {
    // Deterministic fallback: the uploaded document IS the operating prompt.
    system_prompt = content.trim().slice(0, 20_000) || `${name}\n\n${long_description}`;
    system_prompt = pad(
      system_prompt,
      120,
      `Reasoning:\n1. Confirm the request is in scope.\n2. Apply the ${ctx.type} logic above.\n3. Return the result in the caller's expected format.`,
    );
  }

  const rawExamples = (v.examples ?? []).filter((e) => e && (e.input || e.expected_output || e.title));
  const seen = new Set<string>();
  const examples = rawExamples
    .map((e, i) => ({
      title: (e.title?.trim() || `Example ${i + 1}`).slice(0, 200),
      input: (e.input?.trim() || "Representative request for this primitive.").slice(0, 4000),
      expected_output: (e.expected_output?.trim() || "The expected, well-formed result.").slice(0, 4000),
    }))
    .filter((e) => {
      const key = `${e.title}|${e.input}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
  if (examples.length === 0) {
    examples.push({
      title: "Happy path",
      input: `A typical request this ${ctx.type} should handle.`,
      expected_output: "A complete, well-formed answer that follows the rules above.",
    });
  }

  const candidate = {
    slug,
    name,
    type: normalizeType(v.type, ctx.type),
    description,
    long_description,
    system_prompt,
    examples,
  };
  // Must always pass: everything above is clamped to the schema bounds.
  return PackageDraftMinimalSchema.parse(candidate);
}

function normalizeType(value: string | undefined, fallback: DraftType): DraftType {
  const t = (value ?? "").toLowerCase().trim();
  if (t === "skill" || t === "playbook" || t === "soul" || t === "guardrail") return t;
  return fallback;
}

/**
 * Zero-LLM draft built entirely from the uploaded document. Used when every
 * model in the fallback chain fails, so `upload_packages` never returns a
 * total failure — the author still gets a private draft to refine.
 */
export function draftFromDocument(
  filename: string,
  content: string,
  type: DraftType,
): PackageDraftMinimal {
  return repairMinimalDraft({}, { type, filename, content });
}
