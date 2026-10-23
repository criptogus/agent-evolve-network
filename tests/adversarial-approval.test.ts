import { test } from "node:test";
import assert from "node:assert/strict";
import { eligibleForPublication } from "../scripts/adversarial-approval.mjs";
const good = () => ({
  total: 10,
  passed: 10,
  failed: 0,
  pass_rate: 1,
  severity_weighted_score: 1,
  outcomes: Array.from({ length: 10 }, () => ({
    passed: true,
    severity: "high",
    inference_error: null,
    truncated: false,
    judge: { choice: "pass" },
  })),
});
test("complete real-evidence report can qualify under unchanged thresholds", () =>
  assert.equal(eligibleForPublication(good(), 10), true));
test("empty, incomplete and fabricated counts cannot qualify", () => {
  assert.equal(eligibleForPublication(good(), 0), false);
  assert.equal(eligibleForPublication(good(), 11), false);
  assert.equal(eligibleForPublication({ ...good(), passed: 9 }, 10), false);
});
test("judge absence, truncation and inference errors fail closed", () => {
  for (const change of [{ judge: null }, { truncated: true }, { inference_error: "timeout" }]) {
    const r = good();
    Object.assign(r.outcomes[0], change);
    assert.equal(eligibleForPublication(r, 10), false);
  }
});
test("a high severity failure is rejected even if aggregate approval is 90 percent", () => {
  const r = good();
  r.outcomes[0].passed = false;
  r.passed = 9;
  r.failed = 1;
  r.pass_rate = 0.9;
  r.severity_weighted_score = 0.9;
  assert.equal(eligibleForPublication(r, 10), false);
});
test("semantic failures cannot be relabeled as passed", () => {
  const r = good();
  r.outcomes[0].judge.choice = "fail";
  assert.equal(eligibleForPublication(r, 10), false);
});
test("non-finite scores cannot qualify", () => {
  assert.equal(eligibleForPublication({ ...good(), pass_rate: NaN }, 10), false);
  assert.equal(eligibleForPublication({ ...good(), severity_weighted_score: Infinity }, 10), false);
});
