// Trust Score = weighted combination of objective signals.
// Components and weights are public; raw inputs (adversarial cases, telemetry) are not.

export interface TrustInputs {
  schema_valid: boolean;
  adversarial_pass_rate?: number;          // 0..1
  adversarial_weighted_score?: number;     // 0..1, severity-weighted
  real_world_success_rate?: number;        // 0..1
  signed_releases: number;                 // count
  age_days?: number;
  has_owner_2fa?: boolean;
  contributor_count?: number;
  // Recency of the evidence that produced the adversarial / real-world signals.
  // Stale evidence is decayed back toward the conservative prior, so a skill
  // can't coast forever on a single old benchmark run.
  adversarial_age_days?: number;
  real_world_age_days?: number;
}

export interface TrustBreakdown {
  score: number;
  components: Record<string, { weight: number; value: number; contribution: number }>;
  // How much of the score is backed by actual evidence vs. fallback priors.
  // 1 = every signal measured & fresh; lower = more unproven assumptions.
  confidence: number;
}

// Conservative prior for an UNPROVEN signal. Absence of evidence is NOT
// neutral (0.5) — an untested skill should not float into "yellow" for free.
const UNPROVEN_PRIOR = 0.3;
// Evidence older than this (days) is treated as fully unproven again; between
// 0 and this it decays linearly from measured value toward UNPROVEN_PRIOR.
const EVIDENCE_HALFLIFE_DAYS = 180;

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

// Blend a measured value toward the conservative prior based on staleness.
// Fresh (age 0) → measured value; stale (>= halflife) → prior.
function decayed(value: number | undefined, ageDays: number | undefined): { value: number; measured: boolean } {
  if (value == null) return { value: UNPROVEN_PRIOR, measured: false };
  if (ageDays == null) return { value, measured: true };
  const staleness = clamp01(ageDays / EVIDENCE_HALFLIFE_DAYS);
  return { value: value * (1 - staleness) + UNPROVEN_PRIOR * staleness, measured: true };
}

const WEIGHTS = {
  schema:          0.10,
  adv_pass:        0.20,
  adv_weighted:    0.25,
  real_world:      0.20,
  signed:          0.10,
  age:             0.05,
  ownership:       0.05,
  contributors:    0.05,
} as const;

export function computeTrustScore(inputs: TrustInputs): TrustBreakdown {
  const advPass = decayed(inputs.adversarial_pass_rate, inputs.adversarial_age_days);
  const advWeighted = decayed(inputs.adversarial_weighted_score, inputs.adversarial_age_days);
  const realWorld = decayed(inputs.real_world_success_rate, inputs.real_world_age_days);

  const v = {
    schema:       inputs.schema_valid ? 1 : 0,
    adv_pass:     advPass.value,
    adv_weighted: advWeighted.value,
    real_world:   realWorld.value,
    signed:       inputs.signed_releases > 0 ? Math.min(1, inputs.signed_releases / 3) : 0,
    age:          inputs.age_days ? clamp01(Math.log10(inputs.age_days + 1) / 2.5) : 0,
    ownership:    inputs.has_owner_2fa ? 1 : 0,
    contributors: clamp01((inputs.contributor_count ?? 0) / 5),
  };

  const components: TrustBreakdown["components"] = {};
  let score = 0;
  for (const [k, weight] of Object.entries(WEIGHTS)) {
    const value = clamp01((v as Record<string, number>)[k]);
    const contribution = weight * value;
    components[k] = { weight, value, contribution };
    score += contribution;
  }

  // Confidence = share of the evidence-backed weight (the three measured
  // safety/quality signals) that was actually measured & fresh. Lets the UI
  // show "score 0.78 · 40% evidence-backed" instead of a falsely precise badge.
  const evidenceWeight = WEIGHTS.adv_pass + WEIGHTS.adv_weighted + WEIGHTS.real_world;
  const measuredWeight =
    (advPass.measured ? WEIGHTS.adv_pass : 0) +
    (advWeighted.measured ? WEIGHTS.adv_weighted : 0) +
    (realWorld.measured ? WEIGHTS.real_world : 0);
  const confidence = evidenceWeight > 0 ? measuredWeight / evidenceWeight : 1;

  return { score: clamp01(score), components, confidence };
}

export function badgeColor(score: number): "green" | "yellow" | "orange" | "red" {
  if (score >= 0.85) return "green";
  if (score >= 0.70) return "yellow";
  if (score >= 0.50) return "orange";
  return "red";
}
