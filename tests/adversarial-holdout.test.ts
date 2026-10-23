import { test } from "node:test";
import assert from "node:assert/strict";

const { splitTrainHoldout, caseHashUnit } = await import("../src/lib/adversarial/holdout.ts");

const cases = Array.from({ length: 1000 }, (_, i) => ({ id: `case-${i}` }));

test("caseHashUnit is in [0,1) and deterministic", () => {
  const a = caseHashUnit("case-1", "2026Q1");
  const b = caseHashUnit("case-1", "2026Q1");
  assert.equal(a, b);
  assert.ok(a >= 0 && a < 1);
});

test("splitTrainHoldout respects the holdout fraction (roughly)", () => {
  const { train, holdout } = splitTrainHoldout(cases, 0.3, "salt");
  assert.equal(train.length + holdout.length, 1000);
  // Within a reasonable band of 30% for n=1000.
  assert.ok(holdout.length > 230 && holdout.length < 370, `got ${holdout.length}`);
});

test("split is stable for the same salt and disjoint", () => {
  const a = splitTrainHoldout(cases, 0.3, "salt");
  const b = splitTrainHoldout(cases, 0.3, "salt");
  assert.deepEqual(
    a.holdout.map((c) => c.id),
    b.holdout.map((c) => c.id),
  );
  const trainIds = new Set(a.train.map((c) => c.id));
  assert.ok(a.holdout.every((c) => !trainIds.has(c.id)), "train and holdout must be disjoint");
});

test("rotating the salt rotates the holdout membership", () => {
  const q1 = new Set(splitTrainHoldout(cases, 0.3, "2026Q1").holdout.map((c) => c.id));
  const q2 = splitTrainHoldout(cases, 0.3, "2026Q2").holdout.map((c) => c.id);
  const overlap = q2.filter((id) => q1.has(id)).length;
  // Different salt ⇒ substantially different holdout (not identical).
  assert.ok(overlap < q2.length, "rotating salt should change membership");
});
