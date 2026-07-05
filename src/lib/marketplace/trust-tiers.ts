// Trust tiers for catalog curation.
//
// Maps a package's Trust Score (0..1, from package_trust_scores) plus its
// evidence-gated `verified` flag into a small set of browse-facing tiers.
// Thresholds are NOT invented here: they reuse the public badgeColor() bands
// defined in @/lib/trust/score (green >= 0.85, yellow >= 0.70, orange >= 0.50)
// and the verification gate computed server-side by recompute_trust_scores_v2
// (MIN_ADVERSARIAL_RUNS_FOR_VERIFIED / MIN_ADVERSARIAL_CASES_FOR_VERIFIED in
// @/lib/trust/scoring). Pure module — safe to import from client code.

import { badgeColor } from "@/lib/trust/score";

export type TrustTier = "verified" | "high" | "baseline" | "low" | "unscored";

export function trustTier(score: number | null | undefined, verified: boolean): TrustTier {
  if (score == null || Number.isNaN(score)) return "unscored";
  if (verified) return "verified";
  const color = badgeColor(score);
  if (color === "green" || color === "yellow") return "high"; // >= 0.70
  if (color === "orange") return "baseline"; // >= 0.50
  return "low"; // < 0.50
}

export const TRUST_TIER_LABELS: Record<TrustTier, string> = {
  verified: "Verified",
  high: "High trust",
  baseline: "Baseline",
  low: "Low trust",
  unscored: "Unscored",
};

// Lower = better. Used by the "Trust score" sort and by ranking demotion.
export const TRUST_TIER_RANK: Record<TrustTier, number> = {
  verified: 0,
  high: 1,
  baseline: 2,
  low: 3,
  unscored: 4,
};

/**
 * True when a package should be demoted in the default browse sort:
 * unscored, or scored below the Baseline band (score < 0.50).
 * Nothing is hidden — demoted packages simply sort after scored ones.
 */
export function isTrustDemoted(tier: TrustTier): boolean {
  return tier === "low" || tier === "unscored";
}
