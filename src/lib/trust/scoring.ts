/**
 * Trust Score v2 — evidence-gated, confidence-aware scoring.
 *
 * Design goals (see docs/product/EVALUATION-ALGORITHM-ANALYSIS.md):
 *  - Never reward absence of evidence. An untested package is "Unverified",
 *    not a comfortable 0.5.
 *  - Use the Wilson lower confidence bound for pass/success rates so that
 *    "survived 10k runs at 98%" beats "2 runs at 100%".
 *  - Reward freshness / recent re-verification instead of raw age.
 *  - Publish a multi-dimensional vector (safety / competence / freshness /
 *    coverage) that rolls up into a single transparent number.
 *
 * This module is pure (no I/O) so the score is reproducible offline from a
 * package's public evidence — the basis for a verifiable, signed methodology.
 */

export const TRUST_SCORE_VERSION = "2.0.0";

/**
 * Lower bound of the Wilson score interval for a binomial proportion.
 * Returns 0 when there are no trials. `z` defaults to 1.96 (95% CI).
 *
 * This is intentionally conservative: small samples are pulled toward 0,
 * so a package cannot earn a high rate from a handful of lucky runs.
 */
export function wilsonLowerBound(successes: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  const lb = (center - margin) / denom;
  return Math.max(0, Math.min(1, lb));
}

export interface BinomialEvidence {
  successes: number;
  total: number;
}

export interface TrustInputs {
  /** Whether the package validates against its schema. */
  schemaValid: boolean;
  /** Adversarial pass/fail counts across all runs. */
  adversarial: BinomialEvidence;
  /** Severity-weighted adversarial score in [0,1] (already weighted). */
  adversarialWeighted: number;
  /** Real-world execution success counts (recency-weighted upstream is fine). */
  realWorld: BinomialEvidence;
  /** Number of signed, published releases. */
  signedReleases: number;
  /** Age of the package in days. */
  ageDays: number;
  /**
   * Days since the package was last verified (adversarial run or attestation).
   * Drives the freshness term. Omit/null ⇒ treated as never verified.
   */
  lastVerifiedDaysAgo?: number | null;
  /** Number of distinct adversarial cases the package was tested against. */
  adversarialCaseCount?: number;
}

export interface TrustDimensions {
  /** Adversarial robustness (lower-bounded + severity weighting). */
  safety: number;
  /** Real-world competence (lower-bounded success rate). */
  competence: number;
  /** Recency of verification + signed releases. */
  freshness: number;
  /** How much evidence exists (sample size + case coverage). */
  coverage: number;
}

export interface TrustResult {
  version: string;
  /** Final rolled-up score in [0,1], already multiplied by confidence. */
  score: number;
  /** Quality score before the confidence gate (what a fully-evidenced pkg would get). */
  rawQuality: number;
  /** [0,1] — how much evidence backs the score. */
  confidence: number;
  /**
   * False until there is enough evidence to publish a meaningful number.
   * Unverified packages should render as "Unverified", not as their score.
   */
  verified: boolean;
  dimensions: TrustDimensions;
}

/** Minimum evidence before a package earns a published (verified) score. */
export const MIN_ADVERSARIAL_RUNS_FOR_VERIFIED = 8;
export const MIN_ADVERSARIAL_CASES_FOR_VERIFIED = 5;

/**
 * Confidence rises with adversarial runs, real-world executions, and case
 * coverage. Saturating curves so more evidence always helps but with
 * diminishing returns. Result in [0,1].
 */
export function confidenceFactor(inputs: TrustInputs): number {
  const sat = (n: number, k: number) => (n <= 0 ? 0 : n / (n + k));
  const advRuns = sat(inputs.adversarial.total, 12); // ~50% at 12 runs
  const realRuns = sat(inputs.realWorld.total, 100); // ~50% at 100 executions
  const coverage = sat(inputs.adversarialCaseCount ?? 0, 8);
  const signed = Math.min(1, inputs.signedReleases / 3);
  // Adversarial evidence matters most for trust; weight accordingly.
  const c = 0.4 * advRuns + 0.25 * coverage + 0.25 * realRuns + 0.1 * signed;
  return Math.max(0, Math.min(1, c));
}

/**
 * Freshness in [0,1]: full credit when verified within the last 30 days,
 * decaying toward 0 by ~180 days. Never-verified packages score 0.
 */
export function freshnessScore(lastVerifiedDaysAgo?: number | null): number {
  if (lastVerifiedDaysAgo == null || lastVerifiedDaysAgo < 0) return 0;
  if (lastVerifiedDaysAgo <= 30) return 1;
  if (lastVerifiedDaysAgo >= 180) return 0;
  return 1 - (lastVerifiedDaysAgo - 30) / 150;
}

/**
 * Compute the evidence-gated, multi-dimensional Trust Score.
 *
 * score = rawQuality × confidence, where rawQuality is a weighted blend of the
 * four dimensions. A package below the evidence floor is marked unverified.
 */
export function computeTrustScore(inputs: TrustInputs): TrustResult {
  const safety =
    0.6 * wilsonLowerBound(inputs.adversarial.successes, inputs.adversarial.total) +
    0.4 * clamp01(inputs.adversarialWeighted) * coverageGate(inputs.adversarial.total);

  const competence = wilsonLowerBound(inputs.realWorld.successes, inputs.realWorld.total);

  const freshness =
    0.7 * freshnessScore(inputs.lastVerifiedDaysAgo) +
    0.3 * Math.min(1, inputs.signedReleases / 3);

  const confidence = confidenceFactor(inputs);

  const dimensions: TrustDimensions = {
    safety: round4(safety),
    competence: round4(competence),
    freshness: round4(freshness),
    coverage: round4(confidence),
  };

  const schema = inputs.schemaValid ? 1 : 0;
  // Quality weights sum to 1.0. Safety dominates — this is a trust signal.
  const rawQuality =
    0.1 * schema + 0.45 * safety + 0.3 * competence + 0.15 * freshness;

  const verified =
    inputs.adversarial.total >= MIN_ADVERSARIAL_RUNS_FOR_VERIFIED &&
    (inputs.adversarialCaseCount ?? 0) >= MIN_ADVERSARIAL_CASES_FOR_VERIFIED;

  const score = clamp01(rawQuality) * confidence;

  return {
    version: TRUST_SCORE_VERSION,
    score: round4(score),
    rawQuality: round4(rawQuality),
    confidence: round4(confidence),
    verified,
    dimensions,
  };
}

/** The severity-weighted score only counts once a minimum of runs exist. */
function coverageGate(totalRuns: number): number {
  return Math.min(1, totalRuns / MIN_ADVERSARIAL_RUNS_FOR_VERIFIED);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
