import { test } from "node:test";
import assert from "node:assert/strict";

const { attackClassStats, pairedComparison, ATTACK_CLASSES } =
  await import("../src/lib/benchmark/paired.ts");
const { contractRubric, hallucinationRubric, gradeOutcome } =
  await import("../src/lib/benchmark/outcome-grader.ts");
const { scanForLeaks, leakRate, luhn } = await import("../src/lib/adversarial/leak-scanner.ts");

function report(byCategory, total) {
  const passed = Object.values(byCategory).reduce((a, c) => a + c.passed, 0);
  return {
    total,
    passed,
    failed: total - passed,
    pass_rate: total ? passed / total : 0,
    severity_weighted_score: total ? passed / total : 0,
    by_category: byCategory,
    by_severity: {},
    outcomes: [],
  };
}

test("attackClassStats: rolls categories into headline classes with Wilson LB", () => {
  const r = report(
    {
      prompt_injection: { total: 40, passed: 39, pass_rate: 0.975 },
      instruction_drift: { total: 10, passed: 10, pass_rate: 1 },
      jailbreak: { total: 20, passed: 20, pass_rate: 1 },
    },
    70,
  );
  const s = attackClassStats(r);
  assert.equal(s.prompt_injection.total, 50);
  assert.equal(s.prompt_injection.passed, 49);
  assert.ok(s.prompt_injection.lower_bound < s.prompt_injection.rate);
  assert.ok(s.prompt_injection.lower_bound > 0.85);
  // Unmeasured class → zeroes, never NaN.
  assert.equal(s.policy_bypass.total, 0);
  assert.equal(s.policy_bypass.lower_bound, 0);
});

test("pairedComparison: refuses mismatched suites", () => {
  const a = report({ jailbreak: { total: 5, passed: 5, pass_rate: 1 } }, 5);
  const b = report({ jailbreak: { total: 6, passed: 6, pass_rate: 1 } }, 6);
  assert.throws(() => pairedComparison(a, b), /identical suites/);
});

test("pairedComparison: uplift = certified LB minus baseline rate", () => {
  const base = report({ jailbreak: { total: 100, passed: 20, pass_rate: 0.2 } }, 100);
  const cert = report({ jailbreak: { total: 100, passed: 99, pass_rate: 0.99 } }, 100);
  const cmp = pairedComparison(base, cert);
  const row = cmp.rows.find((r) => r.class === "jailbreak");
  assert.ok(row.uplift > 0.7);
  assert.equal(row.baseline.rate, 0.2);
  assert.ok(row.certified.lower_bound <= 0.99);
  assert.equal(cmp.total_cases, 100);
});

test("ATTACK_CLASSES: covers the four landing-page classes", () => {
  assert.deepEqual(Object.keys(ATTACK_CLASSES), [
    "prompt_injection",
    "jailbreak",
    "data_exfiltration",
    "policy_bypass",
  ]);
});

test("contractRubric: encodes must/must_not and examples", () => {
  const rubric = contractRubric({
    slug: "code-reviewer",
    description: "Review code for bugs.",
    must: ["cite the line number"],
    must_not: ["invent APIs"],
    examples: [{ input: "review this diff", output: "line 12: off-by-one" }],
  });
  assert.ok(rubric.criteria.some((c) => c.includes("cite the line number")));
  assert.ok(rubric.hard_fail.some((c) => c.includes("invent APIs")));
  assert.ok(rubric.criteria.some((c) => c.includes("worked examples")));
});

test("gradeOutcome: maps judge verdict to task_completed; null on judge error", async () => {
  const pass = await gradeOutcome(
    async () => ({ verdict: "pass", rationale: "did the task", confidence: 0.9 }),
    { slug: "s" },
    { input: "i", output: "o" },
  );
  assert.equal(pass.task_completed, true);
  const boom = await gradeOutcome(
    async () => {
      throw new Error("gateway down");
    },
    { slug: "s" },
    { input: "i", output: "o" },
  );
  assert.equal(boom, null);
});

test("hallucinationRubric: hard-fails fabricated citations", () => {
  const r = hallucinationRubric("some context");
  assert.ok(r.hard_fail[0].includes("invents"));
});

test("leak-scanner: catches PAN (Luhn-valid), CPF, AWS key, JWT, private key", () => {
  assert.ok(luhn("4242424242424242"));
  const out = [
    "card: 4242 4242 4242 4242",
    "cpf: 111.444.777-35",
    "key: AKIAIOSFODNN7EXAMPLE",
    "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghijklmnop",
    "-----BEGIN PRIVATE KEY-----",
  ].join("\n");
  const kinds = scanForLeaks(out).map((f) => f.kind);
  for (const k of ["credit_card", "cpf", "aws_access_key", "jwt", "private_key"]) {
    assert.ok(kinds.includes(k), `expected ${k} in ${kinds}`);
  }
});

test("leak-scanner: ignores Luhn-invalid digit runs and redacts excerpts", () => {
  assert.equal(
    scanForLeaks("order id 1234 5678 9012 3456").some((f) => f.kind === "credit_card"),
    false,
  );
  const f = scanForLeaks("AKIAIOSFODNN7EXAMPLE")[0];
  assert.ok(!f.excerpt.includes("IOSFODNN7EXAMP"), "excerpt must be redacted");
});

test("leakRate: share of outputs with at least one finding", () => {
  const r = leakRate(["clean output", "mail me at a@b.com"]);
  assert.equal(r.leaked, 1);
  assert.equal(r.rate, 0.5);
});
