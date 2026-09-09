import { test } from "node:test";
import assert from "node:assert/strict";

const { runPluginConformance, readFrontmatter } = await import("../src/lib/plugins/conformance.ts");
const { PLUGIN_SCHEMA_URL, MCP_SCHEMA_URL } = await import("../src/lib/plugins/agent-plugins.ts");

const SKILL_MD = `---
name: Deploy Checker
description: Verifies a deployment pipeline before shipping to production users.
---

# Deploy Checker

${"Run the pipeline checks in order and stop at the first failure. ".repeat(8)}
`;

function goodPackage(overrides = {}) {
  const files = new Map([
    [
      "plugin.json",
      JSON.stringify({
        $schema: PLUGIN_SCHEMA_URL,
        name: "deploy-checker",
        version: "1.0.0",
        description: "Deployment conformance checks.",
        license: "MIT",
      }),
    ],
    [
      "mcp.json",
      JSON.stringify({
        $schema: MCP_SCHEMA_URL,
        mcpServers: { superagentskill: { type: "streamable-http", url: "https://superagentskill.com/api/public/mcp" } },
      }),
    ],
    ["skills/deploy-checker/SKILL.md", SKILL_MD],
    ["README.md", "# Deploy Checker"],
  ]);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) files.delete(k);
    else files.set(k, v);
  }
  return files;
}

test("a well-formed package is conformant with no warnings", () => {
  const r = runPluginConformance(goodPackage());
  assert.equal(r.conformant, true);
  assert.equal(r.failed, 0);
  assert.equal(r.warnings, 0);
  assert.equal(r.manifest.name, "deploy-checker");
  assert.equal(r.skills.length, 1);
});

test("missing plugin.json blocks publishing", () => {
  const r = runPluginConformance(goodPackage({ "plugin.json": null }));
  assert.equal(r.conformant, false);
  assert.ok(r.checks.find((c) => c.id === "manifest.present").status === "fail");
});

test("invalid mcp.json blocks publishing", () => {
  const r = runPluginConformance(
    goodPackage({
      "mcp.json": JSON.stringify({
        $schema: MCP_SCHEMA_URL,
        mcpServers: { x: { type: "streamable-http", url: "http://example.com/mcp" } },
      }),
    }),
  );
  assert.equal(r.conformant, false);
  assert.equal(r.checks.find((c) => c.id === "mcp.optional").status, "fail");
});

test("committed secrets block publishing", () => {
  const r = runPluginConformance(goodPackage({ "README.md": "key: sk-abcdefghijklmnopqrstuvwxyz012345" }));
  assert.equal(r.conformant, false);
  assert.equal(r.checks.find((c) => c.id === "security.no-secrets").status, "fail");
});

test("path traversal and binaries are rejected", () => {
  const r = runPluginConformance(goodPackage({ "../evil.md": "x", "bin/tool.exe": "x" }));
  assert.equal(r.checks.find((c) => c.id === "package.paths").status, "fail");
  assert.equal(r.checks.find((c) => c.id === "package.text-only").status, "fail");
});

test("SKILL.md without frontmatter description fails", () => {
  const r = runPluginConformance(goodPackage({ "skills/deploy-checker/SKILL.md": "# no frontmatter\nshort" }));
  assert.equal(r.conformant, false);
  assert.equal(r.checks.find((c) => c.id === "skills.frontmatter").status, "fail");
});

test("missing README is only a recommendation", () => {
  const r = runPluginConformance(goodPackage({ "README.md": null }));
  assert.equal(r.conformant, true);
  assert.equal(r.warnings, 1);
});

test("frontmatter reader handles quoted values", () => {
  assert.equal(readFrontmatter('---\nname: "A B"\n---\nbody').name, "A B");
});
