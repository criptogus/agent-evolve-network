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
}

export interface TrustBreakdown {
  score: number;
  components: Record<string, { weight: number; value: number; contribution: number }>;
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

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

export function computeTrustScore(inputs: TrustInputs): TrustBreakdown {
  const v = {
    schema:       inputs.schema_valid ? 1 : 0,
    adv_pass:     inputs.adversarial_pass_rate ?? 0.5,           // unknown = neutral
    adv_weighted: inputs.adversarial_weighted_score ?? 0.5,
    real_world:   inputs.real_world_success_rate ?? 0.5,
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
  return { score: clamp01(score), components };
}

export function badgeColor(score: number): "green" | "yellow" | "orange" | "red" {
  if (score >= 0.85) return "green";
  if (score >= 0.70) return "yellow";
  if (score >= 0.50) return "orange";
  return "red";
}
