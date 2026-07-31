import assert from "node:assert";
import { AGENTS, AGENT_CATALOG_VERSION, listAgentSummaries, findAgent } from "../src/lib/agents/catalog.ts";

const REQUIRED_SOUL_SECTIONS = ["## Identity", "## How you think", "## How you answer", "## Hard rules"];
const REQUIRED_SKILL_FIELDS = ["slug", "title", "summary", "body"];
const REQUIRED_PLAYBOOK_FIELDS = ["slug", "title", "summary", "body"];

const slugs = new Set();
const duplicates = [];
const errors = [];

for (const agent of AGENTS) {
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
    for (const section of REQUIRED_SOUL_SECTIONS) {
      if (!agent.soul.body.includes(section)) {
        errors.push(`${agent.slug}: soul missing section "${section}"`);
      }
    }
  }

  // skills
  if (!Array.isArray(agent.skills) || agent.skills.length < 3) {
    errors.push(`${agent.slug}: must have at least 3 skills (has ${agent.skills?.length ?? 0})`);
  }
  for (const skill of agent.skills ?? []) {
    for (const field of REQUIRED_SKILL_FIELDS) {
      if (!skill[field]) {
        errors.push(`${agent.slug}/skill ${skill.slug ?? "?"}: missing "${field}"`);
      }
    }
  }

  // playbooks
  if (!Array.isArray(agent.playbooks) || agent.playbooks.length < 2) {
    errors.push(`${agent.slug}: must have at least 2 playbooks (has ${agent.playbooks?.length ?? 0})`);
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
