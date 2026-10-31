import { test } from "node:test";
import assert from "node:assert/strict";

const { stampEvidence, EVIDENCE_STAMP_SCHEMA_VERSION, REQUIRED_EVIDENCE_CHECKS } = await import(
  "../src/lib/adversarial/stamping.ts"
);

const CLEAN = {
  expectedCases: 10,
  holdoutIncluded: true,
  scanClean: true,
  judgeSource: "gpt-4o-mini",
};

test("stampEvidence: a complete run certifies", () => {
  const s = stampEvidence({ total: 10 }, CLEAN);
  assert.equal(s.schema_version, EVIDENCE_STAMP_SCHEMA_VERSION);
  assert.equal(s.certify_worthy, true);
  assert.deepEqual(Object.keys(s.notes), []);
});

test("stampEvidence: a sampled run (or a shifting suite) cannot self-certify", () => {
  assert.equal(stampEvidence({ total: 7 }, CLEAN).full_suite, false, "fewer cases = sampled run");
  assert.equal(stampEvidence({ total: 12 }, CLEAN).full_suite, false, "more cases = suite changed");
  assert.equal(stampEvidence({ total: 0 }, CLEAN).full_suite, false);
  assert.equal(stampEvidence({ total: 12 }, CLEAN).certify_worthy, false);
});

test("stampEvidence: every required check must pass before certify_worthy", () => {
  assert.equal(REQUIRED_EVIDENCE_CHECKS.length, 4);
  for (const key of REQUIRED_EVIDENCE_CHECKS) {
    const bad = { ...CLEAN };
    if (key === "full_suite") bad.expectedCases = 11;
    if (key === "holdout_included") bad.holdoutIncluded = false;
    if (key === "scan_clean") bad.scanClean = false;
    if (key === "judge_source_recorded") bad.judgeSource = null;
    const s = stampEvidence({ total: 10 }, bad);
    assert.equal(s[key], false, `${key} must fail when its trigger fires`);
    assert.match(s.notes[key] ?? "", /\S/, `${key} must record a human-readable note`);
    assert.equal(s.certify_worthy, false);
  }
});
