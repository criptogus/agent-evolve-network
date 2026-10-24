import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("packaged local runtime preserves privacy, business evidence and host validation boundaries", () => {
  const run = spawnSync("python3", ["tests/local_runtime_test.py"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const executed = /Ran (\d+) tests/.exec(run.stderr);
  assert.ok(executed && Number(executed[1]) >= 22, "All privacy/calculation regressions must run");
});

test("interrupted inference resumes only an immutable prefix and preserves failures", () => {
  const run = spawnSync("python3", ["tests/worker_resume_test.py"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stderr, /Ran 4 tests/);
});
