// Pure helpers for bounty eligibility — used by both the submission API and
// the admin auto-award job.

export interface BountyRequirement {
  required_trust_score: number;
  required_adversarial_pass: number;
  vertical?: string;
  deadline?: string | null;
  status: "open" | "claimed" | "paid" | "cancelled" | "expired";
}

export interface SubmissionMetrics {
  trust_score?: number | null;
  adversarial_pass_rate?: number | null;
  package_tags?: string[];
}

export type EligibilityReason =
  | "BOUNTY_NOT_OPEN" | "DEADLINE_PASSED"
  | "TRUST_BELOW_THRESHOLD" | "ADVERSARIAL_BELOW_THRESHOLD"
  | "VERTICAL_MISMATCH" | "OK";

export function checkEligibility(b: BountyRequirement, m: SubmissionMetrics): EligibilityReason {
  if (b.status !== "open") return "BOUNTY_NOT_OPEN";
  if (b.deadline && new Date(b.deadline).getTime() < Date.now()) return "DEADLINE_PASSED";
  if (b.vertical && m.package_tags && !m.package_tags.includes(b.vertical)) return "VERTICAL_MISMATCH";
  if ((m.trust_score ?? 0) < b.required_trust_score) return "TRUST_BELOW_THRESHOLD";
  if ((m.adversarial_pass_rate ?? 0) < b.required_adversarial_pass) return "ADVERSARIAL_BELOW_THRESHOLD";
  return "OK";
}

export interface LeaderboardEntry {
  referrer_user_id: string;
  activated_referrals: number;
  referral_earnings_cents: number;
}

// Rank by activations × earnings, then earnings tiebreak. Pure & easy to test.
export function rankLeaderboard(rows: LeaderboardEntry[], topN = 50): LeaderboardEntry[] {
  return [...rows]
    .sort((a, b) => {
      const sa = a.activated_referrals * Math.max(1, a.referral_earnings_cents);
      const sb = b.activated_referrals * Math.max(1, b.referral_earnings_cents);
      if (sa !== sb) return sb - sa;
      return b.referral_earnings_cents - a.referral_earnings_cents;
    })
    .slice(0, topN);
}
