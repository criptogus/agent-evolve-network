/** Supplemental real-inference guard for the valid-business-context failure found during development. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { evaluateCase } from "../src/lib/adversarial/scorer.ts";
const sha = (value) => createHash("sha256").update(value).digest("hex");
const stable = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );

export function assertContextRegressionPlan(mainPlan, plan) {
  const subject = mainPlan.subjects[0];
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
  if (
    plan.model !== mainPlan.model ||
    plan.prompt_protocol !== mainPlan.prompt_protocol ||
    plan.max_tokens !== mainPlan.max_tokens ||
    plan.temperature !== mainPlan.temperature ||
    plan.subjects?.length !== 1
  )
    throw new Error("Incomplete or changed supplemental context regression evidence");
  const actual = plan.subjects[0];
  if (
    actual.slug !== subject.slug ||
    actual.version !== subject.version ||
    actual.prompt_sha256 !== subject.prompt_sha256 ||
    actual.system_prompt !== subject.system_prompt ||
    actual.cases.length !== ids.length
  )
    throw new Error("Supplemental regression subject differs from the qualified source");
  for (const [index, id] of ids.entries()) {
    const original = subject.cases.find((item) => item.id === id);
    const expected = { ...original, id: `supplemental-context:${id}`, context };
    if (stable(actual.cases[index]) !== stable(expected))
      throw new Error("Changed supplemental input, severity or expectation");
  }
  return { subject, ids, actual };
}

export function assertContextRegressions(mainPlan, mainRuntime, directory) {
  const read = (file) =>
    JSON.parse(readFileSync(`${directory}/context-regressions/${file}`, "utf8"));
  const planBytes = readFileSync(`${directory}/context-regressions/plan.json`);
  const plan = JSON.parse(planBytes.toString("utf8"));
  const runtime = read("runtime.json");
  const outputBytes = readFileSync(`${directory}/context-regressions/outputs.jsonl`);
  const rows = outputBytes
    .toString("utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const reviewBytes = readFileSync(`${directory}/context-regressions/reviews.json`);
  const reviews = JSON.parse(reviewBytes.toString("utf8"));
  const { subject, ids, actual } = assertContextRegressionPlan(mainPlan, plan);
  if (rows.length !== ids.length || !Array.isArray(reviews) || reviews.length !== ids.length)
    throw new Error("Incomplete supplemental trace/review cohort");
  for (const key of [
    "architecture",
    "python",
    "mlx_vlm",
    "mlx",
    "model_snapshot",
    "generation",
    "prompt_protocol",
    "weight_fingerprints",
    "model_file_fingerprints",
    "runtime_source_sha256",
    "worker_sha256",
  ])
    if (!mainRuntime[key] || stable(runtime[key]) !== stable(mainRuntime[key]))
      throw new Error(`Changed supplemental model/runtime: ${key}`);
  if (
    !mainRuntime.subject_package_fingerprints?.[subject.slug] ||
    stable(runtime.subject_package_fingerprints?.[subject.slug]) !==
      stable(mainRuntime.subject_package_fingerprints?.[subject.slug])
  )
    throw new Error("Changed supplemental package fingerprints");
  const planHash = sha(planBytes);
  for (const index of ids.keys()) {
    const kase = actual.cases[index];
    const matching = rows.filter((row) => row.case_id === kase.id);
    const judged = reviews.filter((row) => row.case_id === kase.id && row.slug === subject.slug);
    if (matching.length !== 1 || judged.length !== 1)
      throw new Error("Missing or duplicate supplemental trace/review");
    const row = matching[0],
      review = judged[0];
    if (
      row.slug !== subject.slug ||
      row.version !== subject.version ||
      row.prompt_sha256 !== subject.prompt_sha256 ||
      row.model !== mainPlan.model ||
      row.plan_sha256 !== planHash ||
      row.error !== null ||
      row.truncated !== false ||
      typeof row.output !== "string" ||
      !row.output.trim() ||
      row.runtime_provenance?.output_processing !== "none; raw final generation text" ||
      row.runtime_provenance?.protocol !== mainPlan.prompt_protocol ||
      !evaluateCase(kase, row.output).passed ||
      review.output_sha256 !== sha(row.output) ||
      review.verdict !== "pass" ||
      !review.rationale?.trim() ||
      !review.reviewer?.trim()
    )
      throw new Error(`Failed or unbound supplemental regression: ${kase.id}`);
  }
  return {
    cases: ids.length,
    passed: ids.length,
    model: plan.model,
    runtime_source_sha256: runtime.runtime_source_sha256,
    plan_sha256: planHash,
    outputs_sha256: sha(outputBytes),
    reviews_sha256: sha(reviewBytes),
  };
}
