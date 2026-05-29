import { test } from "node:test";
import assert from "node:assert/strict";

const {
  wilsonLowerBound,
  confidenceFactor,
  freshnessScore,
  computeTrustScore,
  TRUST_SCORE_VERSION,
  MIN_ADVERSARIAL_RUNS_FOR_VERIFIED,
} = await import("../src/lib/trust/scoring.ts");

test("wilsonLowerBound: no trials scores 0", () => {
  assert.equal(wilsonLowerBound(0, 0), 0);
});

test("wilsonLowerBound: never exceeds the observed proportion", () => {
  assert.ok(wilsonLowerBound(98, 100) <= 0.98);
  assert.ok(wilsonLowerBound(5, 5) <= 1);
});

test("wilsonLowerBound: large sample beats tiny perfect sample", () => {
  // The whole point: 10k runs at 98% should outscore 2 runs at 100%.
  const big = wilsonLowerBound(9800, 10000);
  const tiny = wilsonLowerBound(2, 2);
  assert.ok(big > tiny, `expected ${big} > ${tiny}`);
});

test("freshnessScore: recent = 1, stale decays, never-verified = 0", () => {
  assert.equal(freshnessScore(0), 1);
  assert.equal(freshnessScore(30), 1);
  assert.equal(freshnessScore(null), 0);
  assert.equal(freshnessScore(undefined), 0);
  assert.equal(freshnessScore(180), 0);
  const mid = freshnessScore(105);
  assert.ok(mid > 0 && mid < 1);
});

test("confidenceFactor: rises with evidence", () => {
  const none = confidenceFactor({
    schemaValid: true,
    adversarial: { successes: 0, total: 0 },
    adversarialWeighted: 0,
    realWorld: { successes: 0, total: 0 },
    signedReleases: 0,
    ageDays: 0,
  });
  const lots = confidenceFactor({
    schemaValid: true,
    adversarial: { successes: 200, total: 200 },
    adversarialWeighted: 1,
    realWorld: { successes: 5000, total: 5000 },
    signedReleases: 5,
    ageDays: 400,
    adversarialCaseCount: 40,
  });
  assert.equal(none, 0);
  assert.ok(lots > 0.8, `expected high confidence, got ${lots}`);
});

test("computeTrustScore: untested package is Unverified with a low score", () => {
  const r = computeTrustScore({
    schemaValid: true,
    adversarial: { successes: 0, total: 0 },
    adversarialWeighted: 0,
    realWorld: { successes: 0, total: 0 },
    signedReleases: 0,
    ageDays: 1,
  });
  assert.equal(r.verified, false);
  assert.equal(r.version, TRUST_SCORE_VERSION);
  // No evidence ⇒ confidence 0 ⇒ score 0. The opposite of the old 0.5 default.
  assert.equal(r.score, 0);
});

test("computeTrustScore: well-evidenced safe package is verified and scores high", () => {
  const r = computeTrustScore({
    schemaValid: true,
    adversarial: { successes: 196, total: 200 },
    adversarialWeighted: 0.97,
    realWorld: { successes: 4800, total: 5000 },
    signedReleases: 3,
    ageDays: 200,
    lastVerifiedDaysAgo: 5,
    adversarialCaseCount: 40,
  });
  assert.equal(r.verified, true);
  assert.ok(r.score > 0.7, `expected high score, got ${r.score}`);
  assert.ok(r.dimensions.safety > 0.8);
  assert.ok(r.confidence > 0.8);
});

test("computeTrustScore: a few perfect runs are NOT enough to verify", () => {
  const r = computeTrustScore({
    schemaValid: true,
    adversarial: { successes: 3, total: 3 },
    adversarialWeighted: 1,
    realWorld: { successes: 10, total: 10 },
    signedReleases: 1,
    ageDays: 5,
    lastVerifiedDaysAgo: 1,
    adversarialCaseCount: 3,
  });
  assert.equal(r.verified, false, "below the evidence floor must stay unverified");
  assert.ok(r.score < 0.6, `tiny sample should not score high, got ${r.score}`);
  assert.ok(MIN_ADVERSARIAL_RUNS_FOR_VERIFIED > 3);
});
