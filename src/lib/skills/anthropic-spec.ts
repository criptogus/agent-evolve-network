/**
 * Anthropic-strict frontmatter validator + SKILL.md serializer.
 * Implements the rules from "The Complete Guide to Building Skills for Claude":
 * - kebab-case slug, no reserved names
 * - description must include both WHAT it does and WHEN to use it (trigger phrases)
 * - description ≤ 1024 chars, no XML angle brackets
 * - SKILL.md folder layout: SKILL.md (frontmatter + body) + references/examples.md
 */
import type { PackageDraft } from "./schemas";

const RESERVED = ["claude", "anthropic"];
const TRIGGER_HINTS =
  /\b(use when|use this when|when (the )?user|trigger|asks? (to|for)|mentions?|says?|invoke when)\b/i;

export type AnthropicViolation = { field: string; message: string };

export function validateAnthropicSpec(d: {
  slug: string;
  name: string;
  description: string;
}): AnthropicViolation[] {
  const errs: AnthropicViolation[] = [];

  // slug
  if (!/^[a-z0-9-]{2,64}$/.test(d.slug))
    errs.push({ field: "slug", message: "Use kebab-case lowercase (a-z, 0-9, -), 2–64 chars." });
  if (RESERVED.some((r) => d.slug.toLowerCase().includes(r)))
    errs.push({ field: "slug", message: `Slug cannot contain reserved name (${RESERVED.join(", ")}).` });

  // name
  if (RESERVED.some((r) => d.name.toLowerCase().includes(r)))
    errs.push({ field: "name", message: `Name cannot contain reserved word (${RESERVED.join(", ")}).` });

  // description
  if (d.description.length > 1024)
    errs.push({ field: "description", message: "Description must be ≤ 1024 chars (Anthropic spec)." });
  if (/[<>]/.test(d.description))
    errs.push({ field: "description", message: "Description must not contain `<` or `>` (prompt-injection guard)." });
  if (!TRIGGER_HINTS.test(d.description))
    errs.push({
      field: "description",
      message:
        'Description must include trigger phrases (e.g. "Use when user asks…", "Trigger on…"). Anthropic spec requires WHAT + WHEN.',
    });
  if (d.description.length < 30)
    errs.push({ field: "description", message: "Description too short to convey purpose + triggers." });

  return errs;
}

export function assertAnthropicSpec(d: { slug: string; name: string; description: string }) {
  const errs = validateAnthropicSpec(d);
  if (errs.length) {
    const msg = errs.map((e) => `${e.field}: ${e.message}`).join(" | ");
    throw new Response(`Anthropic spec violations — ${msg}`, { status: 422 });
  }
}

/**
 * Serialize a package draft into the Anthropic SKILL.md format.
 * Returns the SKILL.md body as a single string.
 */
export function buildSkillMd(input: {
  slug: string;
  name: string;
  type: string;
  description: string;
  long_description?: string | null;
  system_prompt: string;
  rules: { must?: string[]; must_not?: string[]; input_schema?: unknown; output_schema?: unknown } | null;
  examples: Array<{ title: string; input: string; expected_output: string; rationale?: string }>;
  compatibility?: Array<{ runtime: string; status: string; detail?: string }>;
  license?: string | null;
  author_handle?: string | null;
  version?: string | null;
}): string {
  const compatString =
    input.compatibility && input.compatibility.length
      ? input.compatibility.map((c) => `${c.runtime}:${c.status}${c.detail ? ` (${c.detail})` : ""}`).join("; ")
      : undefined;

  const fm: string[] = [
    "---",
    `name: ${input.slug}`,
    `description: ${escapeYamlString(input.description)}`,
  ];
  if (input.license) fm.push(`license: ${input.license}`);
  if (compatString) fm.push(`compatibility: ${escapeYamlString(compatString.slice(0, 500))}`);
  fm.push("metadata:");
  fm.push(`  display_name: ${escapeYamlString(input.name)}`);
  fm.push(`  type: ${input.type}`);
  if (input.author_handle) fm.push(`  author: ${escapeYamlString(input.author_handle)}`);
  if (input.version) fm.push(`  version: ${input.version}`);
  fm.push("---", "");

  const rules = input.rules ?? {};
  const must = (rules.must ?? []).map((r) => `- ${r}`).join("\n");
  const mustNot = (rules.must_not ?? []).map((r) => `- ${r}`).join("\n");

  const body = [
    `# ${input.name}`,
    "",
    input.long_description?.trim() || input.description,
    "",
    "## Instructions",
    "",
    input.system_prompt.trim(),
    "",
    "## Rules",
    "",
    "**Must:**",
    must || "- (none)",
    "",
    "**Must not:**",
    mustNot || "- (none)",
    "",
    "## Examples",
    "",
    "See `references/examples.md` for the full set of worked examples.",
    "",
    "## Resources",
    "",
    "- `references/examples.md` — input/expected output pairs (ground truth)",
  ].join("\n");

  return fm.join("\n") + body + "\n";
}

export function buildExamplesMd(
  examples: Array<{ title: string; input: string; expected_output: string; rationale?: string }>
): string {
  return [
    "# Examples",
    "",
    "Worked examples used as ground truth for evaluation.",
    "",
    ...examples.flatMap((ex, i) => [
      `## ${i + 1}. ${ex.title}`,
      "",
      "**Input**",
      "",
      "```",
      ex.input.trim(),
      "```",
      "",
      "**Expected output**",
      "",
      "```",
      ex.expected_output.trim(),
      "```",
      ...(ex.rationale ? ["", `_${ex.rationale.trim()}_`] : []),
      "",
    ]),
  ].join("\n");
}

function escapeYamlString(s: string): string {
  // single-line strings with quotes if they contain : # or start with special chars
  const safe = s.replace(/\r?\n/g, " ").replace(/"/g, '\\"');
  if (/[:#&*?\[\]{}|>!%@`]/.test(s) || /^[ \-?]/.test(s)) return `"${safe}"`;
  return safe;
}

/** Convenience that runs both checks AND returns an Anthropic-compliant SKILL.md. */
export function buildAndValidate(draft: PackageDraft, extras?: { author_handle?: string; version?: string }) {
  assertAnthropicSpec({ slug: draft.slug, name: draft.name, description: draft.description });
  return buildSkillMd({
    slug: draft.slug,
    name: draft.name,
    type: draft.type,
    description: draft.description,
    long_description: draft.long_description,
    system_prompt: draft.system_prompt,
    rules: draft.rules,
    examples: draft.examples,
    compatibility: draft.compatibility,
    license: "CC-BY-SA-4.0",
    author_handle: extras?.author_handle,
    version: extras?.version,
  });
}
