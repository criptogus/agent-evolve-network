import { test } from "node:test";
import assert from "node:assert/strict";

const { cohenKappa, judgeCalibration, ensembleVerdict, judgeBatch, gradeWithJudge, rubricFromExpectations } =
  await import("../src/lib/adversarial/judge.ts");

const req = (output = "x") => ({ caseId: "c1", input: "i", output, rubric: { criteria: [] } });

test("cohenKappa: perfect agreement = 1", () => {
  assert.equal(cohenKappa(["pass", "fail", "pass"], ["pass", "fail", "pass"]), 1);
});

test("cohenKappa: degenerate single-category identical = 1", () => {
  assert.equal(cohenKappa(["pass", "pass"], ["pass", "pass"]), 1);
});

test("cohenKappa: total disagreement is negative", () => {
  assert.ok(cohenKappa(["pass", "fail"], ["fail", "pass"]) < 0);
});

test("cohenKappa: chance-level agreement is near 0", () => {
  // Judge ignores input — agreement equals chance ⇒ kappa ~ 0.
  const human = ["pass", "fail", "pass", "fail"];
  const judge = ["pass", "pass", "fail", "fail"];
  const k = cohenKappa(human, judge);
  assert.ok(Math.abs(k) < 0.6, `expected modest kappa, got ${k}`);
});

test("cohenKappa: throws on length mismatch", () => {
  assert.throws(() => cohenKappa(["pass"], ["pass", "fail"]));
});

test("judgeCalibration: separates false pass from false fail", () => {
  const human = ["fail", "pass", "fail", "pass"];
  const judge = ["pass", "pass", "fail", "fail"];
  const r = judgeCalibration(human, judge);
  assert.equal(r.n, 4);
  assert.equal(r.false_pass, 1, "judge passed something the human failed");
  assert.equal(r.false_fail, 1, "judge failed something the human passed");
  assert.equal(r.agreement, 0.5);
});

test("ensembleVerdict strict: judge catches a semantic failure the substring check missed", () => {
  const o = ensembleVerdict(true, { verdict: "fail", rationale: "leaked PII semantically" }, "strict");
  assert.equal(o.passed, false, "strict mode must fail if the judge fails");
  assert.equal(o.disagreement, true);
});

test("ensembleVerdict strict: both pass ⇒ pass", () => {
  const o = ensembleVerdict(true, { verdict: "pass", rationale: "ok" }, "strict");
  assert.equal(o.passed, true);
  assert.equal(o.disagreement, false);
});

test("ensembleVerdict lenient: either pass ⇒ pass", () => {
  const o = ensembleVerdict(false, { verdict: "pass", rationale: "correct refusal phrased oddly" }, "lenient");
  assert.equal(o.passed, true);
  assert.equal(o.disagreement, true);
});

test("gradeWithJudge: no judge configured ⇒ defers to deterministic", async () => {
  const passOutcome = await gradeWithJudge({ judgeFn: null, req: req(), deterministicPassed: true });
  assert.equal(passOutcome.passed, true);
  assert.equal(passOutcome.judge_used, false);
  assert.equal(passOutcome.disagreement, false);
  const failOutcome = await gradeWithJudge({ judgeFn: null, req: req(), deterministicPassed: false });
  assert.equal(failOutcome.passed, false);
});

test("gradeWithJudge: judge error falls back to deterministic (no crash)", async () => {
  const throwingJudge = async () => {
    throw new Error("gateway down");
  };
  const o = await gradeWithJudge({ judgeFn: throwingJudge, req: req(), deterministicPassed: true });
  assert.equal(o.passed, true, "must not flip the verdict on judge error");
  assert.equal(o.judge_used, false);
});

test("gradeWithJudge: strict judge fail catches a deterministic false-pass", async () => {
  const judge = async () => ({ verdict: "fail", rationale: "semantic leak" });
  const o = await gradeWithJudge({ judgeFn: judge, req: req(), deterministicPassed: true, mode: "strict" });
  assert.equal(o.passed, false);
  assert.equal(o.judge_used, true);
  assert.equal(o.disagreement, true);
});

test("rubricFromExpectations: maps refusal, includes and bans", () => {
  const r = rubricFromExpectations(
    { must_refuse: true, must_include: ["cite the source"], must_not_include: ["SSN", "password"] },
    "do not leak credentials",
  );
  assert.ok(r.criteria.some((c) => /refuse/i.test(c)));
  assert.ok(r.criteria.some((c) => /cite the source/.test(c)));
  assert.ok(r.criteria.some((c) => /do not leak credentials/.test(c)));
  assert.equal(r.hard_fail.length, 2);
  assert.ok(r.hard_fail.some((c) => /SSN/.test(c)));
});

test("judgeBatch: runs the injected judge and builds ensemble outcomes", async () => {
  const mockJudge = async ({ output }) => ({
    verdict: output.includes("SAFE") ? "pass" : "fail",
    rationale: "mock",
  });
  const items = [
    { req: { caseId: "a", input: "i", output: "SAFE", rubric: { criteria: [] } }, deterministicPassed: true },
    { req: { caseId: "b", input: "i", output: "BAD", rubric: { criteria: [] } }, deterministicPassed: true },
  ];
  const outcomes = await judgeBatch(mockJudge, items, "strict");
  assert.equal(outcomes.length, 2);
  assert.equal(outcomes[0].passed, true);
  assert.equal(outcomes[1].passed, false, "strict: judge fail overrides deterministic pass");
});
