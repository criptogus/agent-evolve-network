import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("packaged local runtime preserves privacy, business evidence and host validation boundaries", () => {
  const run = spawnSync("python3", ["tests/local_runtime_test.py"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stderr, /Ran 8 tests/);
});
