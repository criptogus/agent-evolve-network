import { test } from "node:test";
import assert from "node:assert/strict";

const { checkEligibility, rankLeaderboard } = await import("../src/lib/growth/bounties.ts");

const openBounty = {
  status: "open", required_trust_score: 0.85, required_adversarial_pass: 0.8,
  vertical: "security", deadline: null,
};

test("accepts a submission that meets thresholds", () => {
  assert.equal(
    checkEligibility(openBounty, { trust_score: 0.9, adversarial_pass_rate: 0.85, package_tags: ["security"] }),
    "OK",
  );
});

test("rejects when trust below threshold", () => {
  assert.equal(
    checkEligibility(openBounty, { trust_score: 0.7, adversarial_pass_rate: 0.85, package_tags: ["security"] }),
    "TRUST_BELOW_THRESHOLD",
  );
});

test("rejects when adversarial below threshold", () => {
  assert.equal(
    checkEligibility(openBounty, { trust_score: 0.9, adversarial_pass_rate: 0.5, package_tags: ["security"] }),
    "ADVERSARIAL_BELOW_THRESHOLD",
  );
});

test("rejects when bounty closed or past deadline", () => {
  assert.equal(checkEligibility({ ...openBounty, status: "paid" }, { trust_score: 1, adversarial_pass_rate: 1, package_tags: ["security"] }),
    "BOUNTY_NOT_OPEN");
  assert.equal(checkEligibility({ ...openBounty, deadline: new Date(Date.now() - 1000).toISOString() }, { trust_score: 1, adversarial_pass_rate: 1, package_tags: ["security"] }),
    "DEADLINE_PASSED");
});

test("rejects when package_tags miss the required vertical", () => {
  assert.equal(
    checkEligibility(openBounty, { trust_score: 1, adversarial_pass_rate: 1, package_tags: ["fintech"] }),
    "VERTICAL_MISMATCH",
  );
});

test("leaderboard ranks by activations * earnings, breaking ties by earnings", () => {
  const rows = [
    { referrer_user_id: "a", activated_referrals: 5, referral_earnings_cents: 10_000 },
    { referrer_user_id: "b", activated_referrals: 10, referral_earnings_cents: 500 },
    { referrer_user_id: "c", activated_referrals: 1, referral_earnings_cents: 200_000 },
    { referrer_user_id: "d", activated_referrals: 5, referral_earnings_cents: 10_000 }, // tied with a
  ];
  const ranked = rankLeaderboard(rows, 4);
  // c has 1 * 200000 = 200000; a/d have 5 * 10000 = 50000; b has 10 * 500 = 5000.
  assert.equal(ranked[0].referrer_user_id, "c");
  assert.equal(ranked[3].referrer_user_id, "b");
});

test("leaderboard respects topN", () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({
    referrer_user_id: `u${i}`, activated_referrals: i + 1, referral_earnings_cents: (i + 1) * 100,
  }));
  assert.equal(rankLeaderboard(rows, 10).length, 10);
});
