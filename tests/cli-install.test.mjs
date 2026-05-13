import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

test("CLI --help prints usage and exits 0", () => {
  const r = spawnSync("node", [join(ROOT, "cli/super-agent.mjs"), "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /install <slug>/);
  assert.match(r.stdout, /SUPER_AGENT_REGISTRY/);
});

test("CLI fails clearly on unknown command", () => {
  const r = spawnSync("node", [join(ROOT, "cli/super-agent.mjs"), "bogus"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /unknown command|install <slug>/);
});

test("CLI install errors out when no slug is provided", () => {
  const r = spawnSync("node", [join(ROOT, "cli/super-agent.mjs"), "install"], {
    encoding: "utf8",
    env: { ...process.env, SUPER_AGENT_TELEMETRY: "0" },
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /install requires <slug>/);
});

test("CLI package.json declares super-agent bin", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "cli/package.json"), "utf8"));
  assert.equal(pkg.name, "super-agent");
  assert.equal(pkg.bin["super-agent"], "./super-agent.mjs");
  assert.ok(statSync(join(ROOT, "cli/super-agent.mjs")).isFile());
});
