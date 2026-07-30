/**
 * Counterfactual uplift math for "skill on vs. off" experiments.
 *
 * The trust score proves a package is reliable; uplift proves the *customer*
 * got better. For that we need a control arm (skill off, or previous version)
 * and a treatment arm, plus an outcome metric per execution (task completed,
 * human intervention needed, thumbs up/down).
 *
 * This module is pure and dependency-light so the published numbers are
 * reproducible offline from the same counts — the same property that makes the
 * Trust Score verifiable.
 */
import { createHash } from "node:crypto";

export type Arm = "control" | "treatment";

/** Stable [0,1) hash of a subject within an experiment. */
export function subjectHashUnit(experimentKey: string, subject: string): number {
  const hex = createHash("sha256")
    .update(`${experimentKey}:${subject}`)
    .digest("hex")
    .slice(0, 13);
  return parseInt(hex, 16) / 2 ** 52;
}

/**
 * Deterministically assign a subject (workspace hash / agent fingerprint) to
 * an arm. Same subject always lands in the same arm for a given experiment, so
 * a customer never flips mid-session and the split is auditable.
 */
export function assignArm(
  experimentKey: string,
  subject: string,
  controlShare = 0.1,
): Arm {
  const share = Math.max(0, Math.min(0.5, controlShare));
  if (share === 0) return "treatment";
  return subjectHashUnit(experimentKey, subject) < share ? "control" : "treatment";
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26 based erf approximation). */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export interface ArmCounts {
  n: number;
  completed: number;
}

export interface UpliftResult {
  control_rate: number;
  treatment_rate: number;
  /** treatment_rate − control_rate, in absolute percentage points (0-1 scale). */
  absolute_uplift: number;
  /** Relative lift vs. control. Null when the control rate is 0. */
  relative_uplift: number | null;
  /** 95% CI on the absolute uplift. */
  ci_low: number;
  ci_high: number;
  /** Two-sided p-value from a two-proportion z-test. */
  p_value: number;
  z: number;
  /** True when p < 0.05 and both arms have at least `minPerArm` observations. */
  significant: boolean;
  n_control: number;
  n_treatment: number;
}

export const MIN_PER_ARM_FOR_SIGNIFICANCE = 30;

/**
 * Two-proportion z-test with a Wald 95% CI on the difference. Conservative by
 * construction: too little data ⇒ wide CI, `significant: false`.
 */
export function twoProportionUplift(
  control: ArmCounts,
  treatment: ArmCounts,
  z95 = 1.96,
): UpliftResult {
  const n1 = Math.max(0, control.n);
  const n2 = Math.max(0, treatment.n);
  const p1 = n1 > 0 ? control.completed / n1 : 0;
  const p2 = n2 > 0 ? treatment.completed / n2 : 0;
  const diff = p2 - p1;

  let zStat = 0;
  let pValue = 1;
  let se = 0;
  if (n1 > 0 && n2 > 0) {
    const pooled = (control.completed + treatment.completed) / (n1 + n2);
    const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
    zStat = sePooled > 0 ? diff / sePooled : 0;
    pValue = 2 * (1 - normalCdf(Math.abs(zStat)));
    se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  }

  const significant =
    pValue < 0.05 &&
    n1 >= MIN_PER_ARM_FOR_SIGNIFICANCE &&
    n2 >= MIN_PER_ARM_FOR_SIGNIFICANCE;

  return {
    control_rate: round4(p1),
    treatment_rate: round4(p2),
    absolute_uplift: round4(diff),
    relative_uplift: p1 > 0 ? round4(diff / p1) : null,
    ci_low: round4(diff - z95 * se),
    ci_high: round4(diff + z95 * se),
    p_value: round4(pValue),
    z: round4(zStat),
    significant,
    n_control: n1,
    n_treatment: n2,
  };
}

/** Human-readable claim, e.g. "+23.0% de resolução (p=0.0120)". */
export function formatUpliftClaim(r: UpliftResult): string {
  if (r.n_control === 0 || r.n_treatment === 0) return "sem braço de controle ainda";
  const pct = (r.absolute_uplift * 100).toFixed(1);
  const sign = r.absolute_uplift >= 0 ? "+" : "";
  const sig = r.significant ? `p=${r.p_value.toFixed(4)}` : "ainda não significativo";
  return `${sign}${pct} p.p. de resolução (${sig})`;
}

function round4(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10000) / 10000;
}
