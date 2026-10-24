import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { assertCompleteBusinessPlan } from "../scripts/adversarial-approval.mjs";
import { assertContextRegressionPlan } from "../scripts/context-regression-gate.mjs";

test("qualification accepts the original case contract and rejects pilots or changed rubrics", () => {
  const dir = mkdtempSync(join(tmpdir(), "sas-business-plan-"));
  try {
    // Prepare real source fixtures only: no model invocation, outputs or synthetic qualification.
    const run = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/eval-business-adversarial.mjs",
        "prepare",
        "fixture-contract-check@no-inference",
        "--workdir",
        dir,
      ],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const plan = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8"));
    assert.doesNotThrow(() => assertCompleteBusinessPlan(plan));
    const pilot = structuredClone(plan);
    pilot.subjects[0].cases.pop();
    assert.throws(() => assertCompleteBusinessPlan(pilot), /pilots|missing/);
    const severity = structuredClone(plan);
    severity.subjects[0].cases[0].severity = "low";
    assert.throws(() => assertCompleteBusinessPlan(severity), /Changed original/);
    const rubric = structuredClone(plan);
    rubric.subjects[0].cases[0].expectations = {};
    assert.throws(() => assertCompleteBusinessPlan(rubric), /Changed original/);
    const threshold = structuredClone(plan);
    threshold.thresholds.pass_rate = 0.5;
    assert.throws(() => assertCompleteBusinessPlan(threshold), /thresholds/);
    // Contract checks only; no generated response, model success or qualification is fabricated.
    const supplement = structuredClone(plan);
    const subject = supplement.subjects[0];
    const context = subject.cases.find(
      (item) => item.id === `${subject.slug}:valid-domain-task`,
    ).context;
    const ids = [
      `${subject.slug}:unauthorized-action`,
      `${subject.slug}:fabricated-execution`,
      "exfiltrate-secrets-via-url",
      "prompt-injection-system-leak",
      "destructive-kubectl",
    ];
    subject.cases = ids.map((id) => ({
      ...subject.cases.find((item) => item.id === id),
      id: `supplemental-context:${id}`,
      context,
    }));
    supplement.subjects = [subject];
    assert.doesNotThrow(() => assertContextRegressionPlan(plan, supplement));
    const weaker = structuredClone(supplement);
    weaker.subjects[0].cases[0].expectations.must_refuse_or_must_include.must_refuse = false;
    assert.throws(() => assertContextRegressionPlan(plan, weaker), /Changed supplemental/);
    const lowerSeverity = structuredClone(supplement);
    lowerSeverity.subjects[0].cases[0].severity = "low";
    assert.throws(() => assertContextRegressionPlan(plan, lowerSeverity), /Changed supplemental/);
    const missing = structuredClone(supplement);
    missing.subjects[0].cases.pop();
    assert.throws(() => assertContextRegressionPlan(plan, missing), /subject/);
    writeFileSync(join(dir, "outputs.jsonl"), "");
    const diagnosticPath = join(dir, "diagnostic.json");
    const emptyDiagnostic = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/eval-business-adversarial.mjs",
        "diagnose",
        diagnosticPath,
        "--workdir",
        dir,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(emptyDiagnostic.status, 0);
    assert.match(emptyDiagnostic.stderr, /Empty\/no-op/);
    assert.equal(existsSync(diagnosticPath), false);
    const differentModel = structuredClone(supplement);
    differentModel.model = "different";
    assert.throws(() => assertContextRegressionPlan(plan, differentModel), /changed supplemental/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
