import { test } from "node:test";
import assert from "node:assert/strict";

const {
  assignArm,
  subjectHashUnit,
  twoProportionUplift,
  formatUpliftClaim,
  normalCdf,
  MIN_PER_ARM_FOR_SIGNIFICANCE,
} = await import("../src/lib/experiments/uplift.ts");

test("subjectHashUnit is deterministic and in [0,1)", () => {
  const a = subjectHashUnit("exp", "ws-1");
  assert.equal(a, subjectHashUnit("exp", "ws-1"));
  assert.ok(a >= 0 && a < 1);
  assert.notEqual(a, subjectHashUnit("exp", "ws-2"));
});

test("assignArm is stable per subject and respects the control share", () => {
  const key = "code-reviewer:on-vs-off";
  const arm = assignArm(key, "ws-42", 0.2);
  assert.equal(arm, assignArm(key, "ws-42", 0.2));

  let control = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    if (assignArm(key, `ws-${i}`, 0.2) === "control") control++;
  }
  const share = control / N;
  assert.ok(share > 0.16 && share < 0.24, `expected ~20% control, got ${share}`);
});

test("assignArm with 0 share never puts anyone in control", () => {
  for (let i = 0; i < 50; i++) {
    assert.equal(assignArm("e", `s-${i}`, 0), "treatment");
  }
});

test("normalCdf is calibrated", () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 0.001);
});

test("no data ⇒ no claim, not significant", () => {
  const r = twoProportionUplift({ n: 0, completed: 0 }, { n: 0, completed: 0 });
  assert.equal(r.significant, false);
  assert.equal(r.absolute_uplift, 0);
  assert.match(formatUpliftClaim(r), /sem braço de controle/);
});

test("tiny samples never claim significance", () => {
  const r = twoProportionUplift({ n: 5, completed: 1 }, { n: 5, completed: 5 });
  assert.equal(r.significant, false, "below the per-arm floor must stay unproven");
  assert.ok(MIN_PER_ARM_FOR_SIGNIFICANCE > 5);
});

test("large clear effect is significant with a positive CI", () => {
  const r = twoProportionUplift({ n: 1000, completed: 600 }, { n: 1000, completed: 800 });
  assert.equal(r.significant, true);
  assert.ok(Math.abs(r.absolute_uplift - 0.2) < 1e-6);
  assert.ok(r.ci_low > 0, `CI should exclude 0, got ${r.ci_low}`);
  assert.ok(r.relative_uplift !== null && r.relative_uplift > 0.3);
  assert.match(formatUpliftClaim(r), /\+20\.0 p\.p\./);
});

test("no real difference is not significant even at scale", () => {
  const r = twoProportionUplift({ n: 5000, completed: 3500 }, { n: 5000, completed: 3510 });
  assert.equal(r.significant, false);
  assert.ok(r.ci_low < 0 && r.ci_high > 0, "CI should straddle 0");
});

test("regressions are reported as negative uplift", () => {
  const r = twoProportionUplift({ n: 800, completed: 700 }, { n: 800, completed: 500 });
  assert.ok(r.absolute_uplift < 0);
  assert.equal(r.significant, true);
  assert.ok(r.ci_high < 0);
});
