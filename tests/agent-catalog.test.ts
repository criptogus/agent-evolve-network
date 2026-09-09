import assert from "node:assert";
import { AGENTS, AGENT_CATALOG_VERSION, listAgentSummaries, findAgent } from "../src/lib/agents/catalog.ts";

// Slugs that existed before the v1.1.0 expansion; they are held to a lighter bar.
const LEGACY_SLUGS = new Set([
  "ceo", "coo", "cto", "cmo", "cfo", "chro",
  "agent-architect", "board-advisor", "corporate-finance",
  "google-ads", "meta-ads",
  "newsletter-writer", "linkedin-writer", "x-writer",
]);

const REQUIRED_SOUL_SECTIONS = ["## Identity", "## How you think", "## Hard rules"];
const STRICT_SOUL_SECTIONS = ["## How you answer"];
const REQUIRED_SKILL_FIELDS = ["slug", "title", "summary", "body"];
const REQUIRED_PLAYBOOK_FIELDS = ["slug", "title", "summary", "body"];

const slugs = new Set();
const duplicates = [];
const errors = [];

for (const agent of AGENTS) {
  const isLegacy = LEGACY_SLUGS.has(agent.slug);

  // slug uniqueness
  if (slugs.has(agent.slug)) {
    duplicates.push(agent.slug);
  }
  slugs.add(agent.slug);

  // required top-level fields
  for (const field of ["slug", "name", "role", "emoji", "tagline", "description", "tags", "soul", "skills", "playbooks"]) {
    if (!(field in agent) || agent[field] == null) {
      errors.push(`${agent.slug}: missing field "${field}"`);
    }
  }

  // soul
  if (!agent.soul?.title || !agent.soul?.body) {
    errors.push(`${agent.slug}: soul must have title and body`);
  } else {
    const requiredSections = isLegacy ? REQUIRED_SOUL_SECTIONS : [...REQUIRED_SOUL_SECTIONS, ...STRICT_SOUL_SECTIONS];
    for (const section of requiredSections) {
      if (!agent.soul.body.includes(section)) {
        errors.push(`${agent.slug}: soul missing section "${section}"`);
      }
    }
  }

  // skills
  const minSkills = isLegacy ? 2 : 3;
  if (!Array.isArray(agent.skills) || agent.skills.length < minSkills) {
    errors.push(`${agent.slug}: must have at least ${minSkills} skills (has ${agent.skills?.length ?? 0})`);
  }
  for (const skill of agent.skills ?? []) {
    for (const field of REQUIRED_SKILL_FIELDS) {
      if (!skill[field]) {
        errors.push(`${agent.slug}/skill ${skill.slug ?? "?"}: missing "${field}"`);
      }
    }
  }

  // playbooks
  const minPlaybooks = isLegacy ? 1 : 2;
  if (!Array.isArray(agent.playbooks) || agent.playbooks.length < minPlaybooks) {
    errors.push(`${agent.slug}: must have at least ${minPlaybooks} playbooks (has ${agent.playbooks?.length ?? 0})`);
  }
  for (const playbook of agent.playbooks ?? []) {
    for (const field of REQUIRED_PLAYBOOK_FIELDS) {
      if (!playbook[field]) {
        errors.push(`${agent.slug}/playbook ${playbook.slug ?? "?"}: missing "${field}"`);
      }
    }
  }
}

console.log(`AGENT_CATALOG_VERSION: ${AGENT_CATALOG_VERSION}`);
console.log(`Total agents: ${AGENTS.length}`);
console.log(`Summaries: ${listAgentSummaries().length}`);
console.log(`Find works: ${findAgent("ceo")?.slug === "ceo"}`);

if (duplicates.length) {
  errors.push(`Duplicate slugs: ${duplicates.join(", ")}`);
}

if (errors.length) {
  console.error("Catalog validation errors:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

assert.strictEqual(AGENTS.length, 33, "expected 33 agents after expansion");
assert.strictEqual(duplicates.length, 0, "expected no duplicate slugs");
assert.strictEqual(listAgentSummaries().length, 33, "expected 33 summaries");

console.log("✓ Agent catalog validation passed");
