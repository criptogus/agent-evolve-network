import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getSubscriptionEntitlements,
  isProSubscription,
  type SubscriptionState,
} from "../src/lib/subscription-entitlements.ts";

const now = Date.parse("2026-10-29T18:35:00Z");
const row = (price_id: string, status = "active", current_period_end: string | null = "2026-11-29T18:35:00Z"): SubscriptionState =>
  ({ price_id, status, current_period_end });

test("standalone $12 Agent Pass has seats but no Pro access and remains eligible for Pro checkout", () => {
  const result = getSubscriptionEntitlements([row("sak_agent_pass_monthly")], now);
  assert.equal(result.hasAgentPass, true);
  assert.equal(result.isPro, false);
  assert.equal(result.proSubscription, null);
  assert.equal(result.subscription?.price_id, "sak_agent_pass_monthly");
});

test("$29 monthly and $240 yearly Pro both grant Pro access", () => {
  for (const price of ["sak_pro_monthly", "sak_pro_yearly"])
    assert.equal(isProSubscription(row(price), now), true);
});

test("grandfathered Pro plans retain Pro access", () => {
  for (const price of ["agent_pass_pro_monthly", "agent_pass_pro_yearly"])
    assert.equal(isProSubscription(row(price), now), true);
});

test("newer Agent Pass and inactive rows do not hide an existing Pro subscription", () => {
  const result = getSubscriptionEntitlements([
    row("sak_pro_yearly", "incomplete"), row("sak_agent_pass_monthly"), row("sak_pro_monthly"),
  ], now);
  assert.equal(result.isPro, true);
  assert.equal(result.hasAgentPass, true);
  assert.equal(result.subscription?.price_id, "sak_pro_monthly");
});

test("Pro preserves trial, payment retry, and end-of-period cancellation access", () => {
  for (const status of ["active", "trialing", "past_due", "canceled"])
    assert.equal(isProSubscription(row("sak_pro_monthly", status), now), true);
});

test("expired, incomplete, unpaid, paused and unknown plans fail closed", () => {
  assert.equal(isProSubscription(row("sak_pro_monthly", "active", "2026-10-28T00:00:00Z"), now), false);
  assert.equal(isProSubscription(row("sak_pro_monthly", "canceled", null), now), false);
  for (const status of ["incomplete", "incomplete_expired", "unpaid", "paused"])
    assert.equal(isProSubscription(row("sak_pro_monthly", status), now), false);
  assert.equal(isProSubscription(row("unknown"), now), false);
});