import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const skills = JSON.parse(readFileSync("content/expansion/skills.json", "utf8"));
if (!skills.length) throw new Error("Empty skill batch");
mkdirSync("artifacts/validation", { recursive: true });
writeFileSync("artifacts/validation/empty-skill-input.json", "{}");
const results = [];
let cases = 0;
for (const s of skills) {
  const script = `skills/${s.slug}/scripts/check_input.py`;
  const success = spawnSync("python3", [script, `skills/${s.slug}/tests/input.json`], {
    encoding: "utf8",
  });
  const failure = spawnSync("python3", [script, "artifacts/validation/empty-skill-input.json"], {
    encoding: "utf8",
  });
  let parsed;
  try {
    parsed = JSON.parse(success.stdout);
  } catch {
    parsed = null;
  }
  cases += 2;
  let metricsOk = true;
  let invalidExit = null;
  if (s.calculation) {
    const bad = structuredClone(s.input);
    if (s.calculation === "oee") {
      metricsOk = Math.abs(parsed?.metrics?.oee - (1140 * 2) / 3600) < 1e-12;
      bad.good_units = 1201;
    }
    if (s.calculation === "fmea") {
      metricsOk = parsed?.risks?.[0]?.rpn === 108;
      bad.failure_modes[0].severity = 11;
    }
    if (s.calculation === "reconcile") {
      metricsOk =
        JSON.stringify(parsed?.matched) === '["TX-1"]' && parsed?.exceptions?.length === 0;
      bad.observed[0].amount_cents = 0.5;
    }
    if (s.calculation === "frame_times") {
      metricsOk =
        parsed?.metrics?.p50_ms === 16 &&
        parsed?.metrics?.p95_ms === 30 &&
        parsed?.metrics?.over_budget === 2;
      bad.frame_ms = [0];
    }
    const path = `artifacts/validation/${s.slug}-invalid.json`;
    writeFileSync(path, JSON.stringify(bad));
    invalidExit = spawnSync("python3", [script, path], { encoding: "utf8" }).status;
    cases++;
  }
  const ok =
    success.status === 0 &&
    parsed?.status === "ready_for_review" &&
    failure.status === 2 &&
    metricsOk &&
    (invalidExit === null || invalidExit === 2);
  results.push({
    slug: s.slug,
    ok,
    valid_exit: success.status,
    metrics_ok: metricsOk,
    invalid_range_exit: invalidExit,
    empty_exit: failure.status,
    actual: parsed,
    error: success.stderr,
  });
}
const failed = results.filter((r) => !r.ok).length;
writeFileSync(
  "artifacts/validation/business-skills.json",
  JSON.stringify({ tested: results.length, cases, failed, results }, null, 2),
);
console.log(`${results.length} executable skill helpers; ${cases} fixtures; ${failed} failures`);
process.exitCode = failed ? 1 : 0;
