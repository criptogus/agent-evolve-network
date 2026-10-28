import test from "node:test";
import assert from "node:assert/strict";
import {
  meteredCost,
  evaluatePaired,
  PAIRED_CRITERIA,
  type PairedObservation,
  type QualityReview,
} from "../src/lib/match/paired-evaluation.ts";
const ids = Array.from({ length: 12 }, (_, i) => `case-${i}`);
function evidence() {
  const rows: PairedObservation[] = ids
    .flatMap((caseId) =>
      Array.from({ length: 3 }, (_, repeat) =>
        (["baseline", "jev"] as const).map((arm) => ({
          caseId,
          repeat,
          arm,
          model: "pinned-generator",
          outputHash: `${caseId}:${repeat}:${arm}`,
          complete: true,
          usageComplete: true,
          generatorCostUsd: arm === "baseline" ? 0.1 : 0.05,
          jevCostUsd: arm === "baseline" ? 0 : 0.005,
          elapsedMs: 1000,
        })),
      ),
    )
    .flat();
  const reviews: QualityReview[] = rows.map((r) => ({
    outputHash: r.outputHash,
    highOrCritical: 0,
    evidence: "Primary review of fixture",
    dimensions: {
      task_fit: true,
      grounded_roles: true,
      honest_gaps: true,
      scope_and_safety: true,
      language: true,
      catalog_support: true,
    },
  }));
  return { rows, reviews };
}
test("paired cost includes cached input and rejects unknown/nonfinite usage", () => {
  assert.equal(
    meteredCost(
      { input: 1000000, cachedInput: 500000, output: 100000 },
      { inputPerMillion: 2, cachedInputPerMillion: 1, outputPerMillion: 10 },
    ),
    2.5,
  );
  assert.throws(
    () =>
      meteredCost(
        { input: 1, cachedInput: 2, output: 0 },
        { inputPerMillion: 1, cachedInputPerMillion: 0, outputPerMillion: 1 },
      ),
    /Invalid/,
  );
});
test("only complete, reviewed, same-model pairs with lower total cost and non-regressing latency pass", () => {
  const { rows, reviews } = evidence();
  assert.equal(evaluatePaired(ids, rows, reviews).approved, true);
  rows[1].jevCostUsd = 100;
  assert.equal(evaluatePaired(ids, rows, reviews).approved, false);
});
test("empty/incomplete/no-op comparison and substituted generator cannot qualify", () => {
  assert.throws(() => evaluatePaired([], [], []), /Incomplete/);
  const { rows, reviews } = evidence();
  assert.equal(evaluatePaired(ids, rows.slice(1), reviews).approved, false);
  rows[1].model = "other";
  assert.ok(
    evaluatePaired(ids, rows, reviews).reasons.some((r) => r.startsWith("changed_generator")),
  );
});
test("quality failures and unknown billing cannot be compensated by cost savings", () => {
  const { rows, reviews } = evidence();
  rows[1].usageComplete = false;
  reviews[1].dimensions.task_fit = false;
  const result = evaluatePaired(ids, rows, reviews);
  assert.equal(result.approved, false);
  assert.ok(result.reasons.some((r) => r.startsWith("quality_not_approved")));
  assert.equal(PAIRED_CRITERIA.repeats, 3);
});
