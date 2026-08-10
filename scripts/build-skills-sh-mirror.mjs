#!/usr/bin/env node
/**
 * Builds the top-level `skills/` mirror consumed by the open Skills CLI
 * (`npx skills add <owner/repo>` — https://skills.sh).
 *
 * Layout produced (what the CLI expects):
 *   skills/<slug>/SKILL.md   — YAML frontmatter (name, description, ...) + body
 *   skills/README.md         — how the mirror works
 *
 * Source of truth: content/skills/*.yaml (the same files validate:content checks).
 *
 * Usage: npm run build:skills-mirror  [-- --check]
 *   --check  fail (exit 1) when the mirror is out of date instead of writing it
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "content/skills");
const OUT = join(ROOT, "skills");
const REPO = "criptogus/agent-evolve-network";
const SITE = "https://superagentskill.com";
const CHECK = process.argv.includes("--check");

/** kebab-case, 2-64 chars, no reserved vendor names (Anthropic SKILL.md spec). */
function validSlug(slug) {
  return /^[a-z0-9-]{2,64}$/.test(slug) && !/(claude|anthropic)/i.test(slug);
}

/** Frontmatter descriptions must carry WHAT + WHEN, be <=1024 chars and have no angle brackets. */
function buildDescription(skill) {
  const base = String(skill.description ?? "").replace(/[<>]/g, "").trim();
  const hasTrigger =
    /\b(use when|use this when|when (the )?user|trigger|asks? (to|for)|mentions?|invoke when)\b/i.test(
      base,
    );
  const trigger = hasTrigger
    ? ""
    : ` Use when the user asks for ${String(skill.name ?? skill.slug).toLowerCase()} work, or mentions ${skill.slug.split("-").slice(0, 3).join(", ")}.`;
  return `${base}${trigger}`.slice(0, 1024).trim();
}

function yamlString(value) {
  const s = String(value ?? "").replace(/\r/g, "");
  return JSON.stringify(s); // valid YAML double-quoted scalar
}

function bulletList(items) {
  return (items ?? []).map((i) => `- ${String(i).trim()}`).join("\n");
}

function buildSkillMd(skill) {
  const fm = [
    "---",
    `name: ${skill.slug}`,
    `description: ${yamlString(buildDescription(skill))}`,
    `version: ${yamlString(skill.version ?? "0.1.0")}`,
    `license: ${yamlString(skill.license ?? "CC-BY-SA-4.0")}`,
    `homepage: ${yamlString(`${SITE}/marketplace/${skill.slug}`)}`,
    `source: ${yamlString("Super Agent Skill (SAK)")}`,
    "---",
  ].join("\n");

  const rules = skill.rules ?? {};
  const sections = [];

  sections.push(`# ${skill.name ?? skill.slug}`);
  if (skill.long_description) sections.push(String(skill.long_description).trim());

  if (skill.system_prompt) {
    sections.push(`## Instructions\n\n${String(skill.system_prompt).trim()}`);
  }

  if (rules.must?.length) sections.push(`## Always\n\n${bulletList(rules.must)}`);
  if (rules.must_not?.length) sections.push(`## Never\n\n${bulletList(rules.must_not)}`);

  if (rules.input_schema || rules.output_schema) {
    const io = [];
    if (rules.input_schema)
      io.push(`Input:\n\n\`\`\`json\n${JSON.stringify(rules.input_schema, null, 2)}\n\`\`\``);
    if (rules.output_schema)
      io.push(`Output:\n\n\`\`\`json\n${JSON.stringify(rules.output_schema, null, 2)}\n\`\`\``);
    sections.push(`## Input / output contract\n\n${io.join("\n\n")}`);
  }

  const examples = (skill.examples ?? []).slice(0, 3);
  if (examples.length) {
    const rendered = examples.map((ex, i) => {
      const title = ex.title ? String(ex.title) : `Example ${i + 1}`;
      const parts = [`### ${title}`];
      if (ex.input) parts.push(`Input:\n\n\`\`\`\n${String(ex.input).trim()}\n\`\`\``);
      if (ex.expected_output)
        parts.push(`Expected output:\n\n\`\`\`\n${String(ex.expected_output).trim()}\n\`\`\``);
      if (ex.rationale) parts.push(`Why: ${String(ex.rationale).trim()}`);
      return parts.join("\n\n");
    });
    sections.push(`## Examples\n\n${rendered.join("\n\n")}`);
  }

  sections.push(
    [
      "## Trust & telemetry",
      "",
      `This skill is graded on the Super Agent Skill network: format, substance and adversarial`,
      `(prompt-injection) testing produce a public Trust Score.`,
      "",
      `- Trust Score & evidence: ${SITE}/marketplace/trust/${skill.slug}`,
      `- Skill page: ${SITE}/marketplace/${skill.slug}`,
      `- Live version (always current) via MCP: ${SITE}/api/mcp`,
      "",
      `Reinstall or update with \`npx skills update\`, or pull the live graded version with`,
      `\`npx super-agent install ${skill.slug}\`.`,
    ].join("\n"),
  );

  return `${fm}\n\n${sections.join("\n\n")}\n`;
}

function buildReadme(slugs) {
  return `# SAK skills — open Skills CLI mirror

This directory is a generated mirror of the Super Agent Skill (SAK) catalog in the layout the open
Skills CLI expects (https://skills.sh).

Install the whole catalog into any supported agent:

\`\`\`bash
npx skills add ${REPO}
\`\`\`

Install one skill:

\`\`\`bash
npx skills add ${REPO}/<skill-name>
\`\`\`

Update later:

\`\`\`bash
npx skills update
\`\`\`

${slugs.length} skills are mirrored here. Every skill also carries a public **Trust Score** —
format, substance and adversarial (prompt-injection) grading — at
${SITE}/marketplace/trust/<skill-name>.

## Source of truth

Do not edit files in this directory. They are generated from \`content/skills/*.yaml\` by
\`scripts/build-skills-sh-mirror.mjs\` (\`npm run build:skills-mirror\`). Skills authored inside the
app are served live from ${SITE}/api/skills/<slug>/export.md and through the MCP server at
${SITE}/api/mcp, which always returns the current graded version plus telemetry.
`;
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".yaml") && f !== "_template.yaml");
const written = new Map(); // relative path -> contents
const slugs = [];
const problems = [];

for (const file of files) {
  const raw = readFileSync(join(SRC, file), "utf8");
  let skill;
  try {
    skill = parseYaml(raw);
  } catch (err) {
    problems.push(`${file}: unparseable YAML (${err.message})`);
    continue;
  }
  const slug = skill?.slug;
  if (!slug || !validSlug(slug)) {
    problems.push(`${file}: invalid or missing slug "${slug ?? ""}"`);
    continue;
  }
  if (!skill.description) {
    problems.push(`${file}: missing description`);
    continue;
  }
  slugs.push(slug);
  written.set(join(slug, "SKILL.md"), buildSkillMd(skill));
}

slugs.sort();
written.set("README.md", buildReadme(slugs));

if (problems.length) {
  console.error("Cannot build skills mirror:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (CHECK) {
  let stale = 0;
  for (const [rel, contents] of written) {
    const full = join(OUT, rel);
    if (!existsSync(full) || readFileSync(full, "utf8") !== contents) {
      console.error(`stale: skills/${rel}`);
      stale++;
    }
  }
  if (stale) {
    console.error(`\n${stale} file(s) out of date. Run: npm run build:skills-mirror`);
    process.exit(1);
  }
  console.log(`skills mirror up to date (${slugs.length} skills).`);
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
for (const [rel, contents] of written) {
  const full = join(OUT, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, contents, "utf8");
}
console.log(`Wrote skills/ mirror: ${slugs.length} skills (npx skills add ${REPO}).`);
