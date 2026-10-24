/** Compare complete real evaluations; reject changed criteria or cherry-picked subjects. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const [beforeDir, afterDir, output] = process.argv.slice(2);
if (process.argv.length !== 5 || !beforeDir || !afterDir || !output || existsSync(output))
  throw new Error("Required: previous evidence directory, new evidence directory, NEW report path");
const read = (dir, file) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
const beforePlan = read(beforeDir, "plan.json"),
  afterPlan = read(afterDir, "plan.json");
const before = read(beforeDir, "report.json"),
  after = read(afterDir, "report.json");
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
for (const key of ["model", "max_tokens", "temperature", "thresholds", "baseline_case_ids"])
  if (!equal(beforePlan[key], afterPlan[key]))
    throw new Error(`Changed evaluation condition: ${key}`);
for (const [plan, report, dir] of [
  [beforePlan, before, beforeDir],
  [afterPlan, after, afterDir],
]) {
  const hash = createHash("sha256")
    .update(readFileSync(`${dir}/plan.json`))
    .digest("hex");
  if (report.plan_sha256 !== hash || plan.subjects.length !== 21 || report.reports.length !== 21)
    throw new Error("Incomplete or unbound cohort report");
}
for (const key of ["architecture", "python", "mlx_vlm", "mlx", "model_snapshot"])
  if (!before.runtime?.[key] || before.runtime[key] !== after.runtime?.[key])
    throw new Error(`Changed or missing runtime fingerprint: ${key}`);
if (
  (beforePlan.prompt_protocol ?? "system-first-v1") !==
  (afterPlan.prompt_protocol ?? "system-first-v1")
)
  throw new Error("Changed request protocol; separate model/runtime qualification required");
const weightHashes = (runtime) => {
  const values = runtime.weights_sha256
    ? [runtime.weights_sha256]
    : Object.values(runtime.weight_fingerprints ?? {});
  if (
    !values.length ||
    values.some((hash) => typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))
  )
    throw new Error("Missing real weight fingerprint");
  return values.sort();
};
if (!equal(weightHashes(before.runtime), weightHashes(after.runtime)))
  throw new Error("Changed model weights");
if (!equal(before.runtime.model_file_fingerprints, after.runtime.model_file_fingerprints))
  throw new Error("Changed model configuration/tokenizer fingerprints");
const changes = beforePlan.subjects.map((previous) => {
  const current = afterPlan.subjects.find((s) => s.slug === previous.slug);
  const oldResult = before.reports.find((r) => r.slug === previous.slug);
  const newResult = after.reports.find((r) => r.slug === previous.slug);
  if (!current || !oldResult || !newResult || !equal(previous.cases, current.cases))
    throw new Error(`Changed cases, expectations or cohort: ${previous.slug}`);
  if (previous.prompt_sha256 === current.prompt_sha256 || previous.version === current.version)
    throw new Error(`No immutable correction: ${previous.slug}`);
  for (const [subject, result] of [
    [previous, oldResult],
    [current, newResult],
  ])
    if (
      result.prompt_sha256 !== subject.prompt_sha256 ||
      result.version !== subject.version ||
      result.total !== subject.cases.length
    )
      throw new Error(`Unbound subject result: ${subject.slug}`);
  return {
    slug: previous.slug,
    before_version: previous.version,
    after_version: current.version,
    before_passed: oldResult.passed,
    after_passed: newResult.passed,
    total: newResult.total,
    before_eligible: oldResult.eligible,
    after_eligible: newResult.eligible,
    remaining_high_critical_failures: Object.entries(newResult.by_severity)
      .filter(([severity]) => ["high", "critical"].includes(severity))
      .reduce((sum, [, bucket]) => sum + bucket.total - bucket.passed, 0),
  };
});
if (new Set(changes.map((x) => x.slug)).size !== 21) throw new Error("Duplicate cohort subjects");
const result = {
  model: afterPlan.model,
  unchanged_conditions: true,
  subject_runtime: {
    before_sha256: before.runtime.runtime_source_sha256 ?? null,
    after_sha256: after.runtime.runtime_source_sha256 ?? null,
    changed: before.runtime.runtime_source_sha256 !== after.runtime.runtime_source_sha256,
    scope:
      "Packaged runtime code is part of the corrected subject; model, SDK, weights, configuration, generation, inputs, rubrics and thresholds must stay fixed.",
  },
  skills: changes.length,
  cases: changes.reduce((n, c) => n + c.total, 0),
  before_passed: changes.reduce((n, c) => n + c.before_passed, 0),
  after_passed: changes.reduce((n, c) => n + c.after_passed, 0),
  eligible: changes.filter((c) => c.after_eligible).length,
  changes,
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(
  JSON.stringify({
    skills: result.skills,
    cases: result.cases,
    before_passed: result.before_passed,
    after_passed: result.after_passed,
    eligible: result.eligible,
    unchanged_conditions: true,
  }),
);
