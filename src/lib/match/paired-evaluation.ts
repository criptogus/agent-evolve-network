import { createHash } from "node:crypto";

export const PAIRED_CRITERIA = Object.freeze({
  protocol: "agent-match-paired-v1",
  repeats: 3,
  minimumCases: 12,
  qualityDimensions: [
    "task_fit",
    "grounded_roles",
    "honest_gaps",
    "scope_and_safety",
    "language",
    "catalog_support",
  ] as const,
  zeroHighOrCritical: true,
  noPerCaseQualityRegression: true,
  requireAllDimensions: true,
  requireStrictTotalCostReduction: true,
  requireNonRegressingP95: true,
});
export function evidenceHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export type MeteredUsage = { input: number; cachedInput: number; output: number };
export type PriceCard = {
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
};
export function meteredCost(usage: MeteredUsage, price: PriceCard) {
  if (
    Object.values(usage).some((n) => !Number.isSafeInteger(n) || n < 0) ||
    usage.cachedInput > usage.input ||
    Object.values(price).some((n) => !Number.isFinite(n) || n < 0)
  )
    throw new Error("Invalid metering");
  return (
    ((usage.input - usage.cachedInput) * price.inputPerMillion +
      usage.cachedInput * price.cachedInputPerMillion +
      usage.output * price.outputPerMillion) /
    1e6
  );
}
export type PairedObservation = {
  caseId: string;
  repeat: number;
  arm: "baseline" | "jev";
  model: string;
  outputHash: string;
  complete: boolean;
  usageComplete: boolean;
  generatorCostUsd: number;
  jevCostUsd: number;
  elapsedMs: number;
};
export type QualityReview = {
  outputHash: string;
  dimensions: Record<(typeof PAIRED_CRITERIA.qualityDimensions)[number], boolean>;
  highOrCritical: number;
  evidence: string;
};
export function evaluatePaired(
  caseIds: string[],
  observations: PairedObservation[],
  reviews: QualityReview[],
) {
  if (caseIds.length < PAIRED_CRITERIA.minimumCases || new Set(caseIds).size !== caseIds.length)
    throw new Error("Incomplete frozen case inventory");
  const reasons: string[] = [];
  const keyed = new Map<string, PairedObservation>();
  for (const row of observations) {
    const key = `${row.caseId}:${row.repeat}:${row.arm}`;
    if (
      keyed.has(key) ||
      !caseIds.includes(row.caseId) ||
      !Number.isInteger(row.repeat) ||
      row.repeat < 0 ||
      row.repeat >= PAIRED_CRITERIA.repeats ||
      !["baseline", "jev"].includes(row.arm)
    )
      throw new Error("Unexpected or duplicate observation");
    keyed.set(key, row);
    if (
      !row.complete ||
      !row.usageComplete ||
      !row.outputHash ||
      !row.model ||
      [row.generatorCostUsd, row.jevCostUsd, row.elapsedMs].some(
        (n) => !Number.isFinite(n) || n < 0,
      ) ||
      row.elapsedMs === 0
    )
      reasons.push(`invalid_evidence:${key}`);
    if (row.arm === "baseline" && row.jevCostUsd !== 0)
      reasons.push(`baseline_has_jev_cost:${key}`);
  }
  const byHash = new Map<string, QualityReview>();
  for (const review of reviews) {
    if (byHash.has(review.outputHash)) throw new Error("Duplicate quality review");
    byHash.set(review.outputHash, review);
  }
  for (const id of caseIds)
    for (let repeat = 0; repeat < PAIRED_CRITERIA.repeats; repeat++) {
      const baseline = keyed.get(`${id}:${repeat}:baseline`),
        jev = keyed.get(`${id}:${repeat}:jev`);
      if (!baseline || !jev) {
        reasons.push(`missing_pair:${id}:${repeat}`);
        continue;
      }
      if (baseline.model !== jev.model) reasons.push(`changed_generator:${id}:${repeat}`);
      for (const row of [baseline, jev]) {
        const review = byHash.get(row.outputHash);
        if (
          !review ||
          !review.evidence.trim() ||
          review.highOrCritical !== 0 ||
          PAIRED_CRITERIA.qualityDimensions.some((d) => review.dimensions[d] !== true)
        )
          reasons.push(`quality_not_approved:${id}:${repeat}:${row.arm}`);
      }
    }
  if (observations.length !== caseIds.length * PAIRED_CRITERIA.repeats * 2)
    reasons.push("incomplete_cohort");
  const aggregate = (arm: PairedObservation["arm"]) => {
    const rows = observations.filter((r) => r.arm === arm);
    const times = rows.map((r) => r.elapsedMs).sort((a, b) => a - b);
    return {
      calls: rows.length,
      totalCostUsd: rows.reduce((n, r) => n + r.generatorCostUsd + r.jevCostUsd, 0),
      p95Ms: times.length ? times[Math.ceil(times.length * 0.95) - 1] : null,
    };
  };
  const baseline = aggregate("baseline"),
    jev = aggregate("jev");
  if (!(jev.totalCostUsd < baseline.totalCostUsd)) reasons.push("no_total_cost_reduction");
  if (baseline.p95Ms === null || jev.p95Ms === null || jev.p95Ms > baseline.p95Ms)
    reasons.push("p95_regression_or_missing");
  return { approved: reasons.length === 0, reasons: [...new Set(reasons)], baseline, jev };
}
