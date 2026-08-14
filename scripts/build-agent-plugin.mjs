#!/usr/bin/env node
/**
 * Generates the root Agent Plugins v1 manifests (https://agent-plugins.org):
 *
 *   plugin.json  — plugin manifest (name, version, metadata, extensions)
 *   mcp.json     — our hosted MCP server as a portable streamable-http entry
 *
 * The `skills/` component directory is produced by build-skills-sh-mirror.mjs,
 * so together this repo is a conformant plugin package that any Agent Plugins
 * client can load.
 *
 * Usage: npm run build:agent-plugin [-- --check]
 *   --check  fail (exit 1) when manifests are stale instead of writing them
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CHECK = process.argv.includes("--check");

const {
  buildPluginManifest,
  buildMcpConfig,
  validatePluginManifest,
  validateMcpConfig,
  stringifyJson,
  SAK_SITE,
  SAK_REPO,
  SAK_MCP_URL,
  SAK_EXTENSION_NS,
} = await import(join(ROOT, "src/lib/plugins/agent-plugins.ts"));

const versionSrc = readFileSync(join(ROOT, "src/lib/version.ts"), "utf8");
const version = /PLATFORM_VERSION = "([^"]+)"/.exec(versionSrc)?.[1] ?? "0.0.0";

const skillCount = existsSync(join(ROOT, "content/skills"))
  ? readdirSync(join(ROOT, "content/skills")).filter(
      (f) => f.endsWith(".yaml") && f !== "_template.yaml",
    ).length
  : 0;

const manifest = buildPluginManifest({
  name: "superagentskill",
  version,
  description:
    "Graded agent skills from the Super Agent Skill network: every skill carries a public Trust Score, adversarial pass rate and before/after evidence.",
  homepage: SAK_SITE,
  repository: SAK_REPO,
  license: "CC-BY-SA-4.0",
  keywords: ["agent-skills", "mcp", "trust-score", "evaluation", "adversarial-testing"],
  author: { name: "Super Agent Skill", url: SAK_SITE },
  extensions: {
    [SAK_EXTENSION_NS]: {
      trust_center: `${SAK_SITE}/security`,
      marketplace: `${SAK_SITE}/marketplace`,
      mcp_endpoint: SAK_MCP_URL,
      plugin_index: `${SAK_SITE}/api/public/plugins.json`,
      skills_included: skillCount,
    },
  },
});

const mcp = buildMcpConfig();

const problems = [
  ...validatePluginManifest(manifest).map((e) => `plugin.json: ${e}`),
  ...validateMcpConfig(mcp).map((e) => `mcp.json: ${e}`),
];
if (problems.length) {
  console.error("Generated manifests are not Agent Plugins v1 conformant:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const files = new Map([
  ["plugin.json", stringifyJson(manifest)],
  ["mcp.json", stringifyJson(mcp)],
]);

if (CHECK) {
  let stale = 0;
  for (const [rel, contents] of files) {
    const full = join(ROOT, rel);
    if (!existsSync(full) || readFileSync(full, "utf8") !== contents) {
      console.error(`stale: ${rel}`);
      stale++;
    }
  }
  if (stale) {
    console.error(`\n${stale} file(s) out of date. Run: npm run build:agent-plugin`);
    process.exit(1);
  }
  console.log(`Agent Plugins manifests up to date (v${version}).`);
  process.exit(0);
}

for (const [rel, contents] of files) writeFileSync(join(ROOT, rel), contents, "utf8");
console.log(`Wrote plugin.json + mcp.json (Agent Plugins v1, platform v${version}).`);
