import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const ROOT = new URL("..", import.meta.url).pathname;

test("validate:content does not raise errors for adversarial cases", () => {
  const r = spawnSync("node", ["scripts/validate-content.mjs"], { cwd: ROOT, encoding: "utf8" });
  // Pre-existing skill examples may fail; adversarial files must not contribute errors.
  const advErrors = (r.stderr.match(/content\/adversarial\//g) || []).length;
  assert.equal(advErrors, 0, `adversarial validation errors: ${r.stderr}`);
});

test("eval:adversarial --mock returns a report and detects refusal cases", () => {
  const r = spawnSync(
    "node",
    ["scripts/eval-adversarial.mjs", "--skill", "code-reviewer", "--mock", "--allowFail", "true"],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(r.status, 1, `script crashed: ${r.stderr}`);
  assert.match(r.stdout, /Adversarial robustness/);
  assert.match(r.stdout, /Severity-weighted score/);
});

test("every adversarial case file matches its filename and folder", () => {
  const advRoot = join(ROOT, "content/adversarial");
  let count = 0;
  for (const vertical of readdirSync(advRoot)) {
    const dir = join(advRoot, vertical);
    if (!statSync(dir).isDirectory()) continue;
    for (const entry of readdirSync(dir)) {
      if (!/\.ya?ml$/i.test(entry) || entry.startsWith("_")) continue;
      const kase = parseYaml(readFileSync(join(dir, entry), "utf8"));
      assert.equal(kase.vertical, vertical, `${entry} vertical mismatch`);
      assert.equal(`${kase.id}.yaml`, entry, `${entry} id/filename mismatch`);
      count++;
    }
  }
  assert.ok(count >= 8, `expected >=8 seed cases, found ${count}`);
});
