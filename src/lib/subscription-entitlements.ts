/** Explicit lookup keys: standalone Agent Pass must never imply Pro access. */
export const PRO_PRICE_IDS = [
  "sak_pro_monthly",
  "sak_pro_yearly",
  "agent_pass_pro_monthly",
  "agent_pass_pro_yearly",
] as const;

export type SubscriptionState = {
  price_id: string | null;
  status: string;
  current_period_end: string | null;
};

export function isSubscriptionActive(sub: SubscriptionState, now = Date.now()): boolean {
  const hasTime = sub.current_period_end === null || Date.parse(sub.current_period_end) > now;
  return (["active", "trialing", "past_due"].includes(sub.status) && hasTime) ||
    (sub.status === "canceled" && sub.current_period_end !== null && hasTime);
}

export function isProSubscription(sub: SubscriptionState, now = Date.now()): boolean {
  return PRO_PRICE_IDS.some((priceId) => priceId === sub.price_id) && isSubscriptionActive(sub, now);
}

/** Evaluate all rows: buying extra seats must not hide an existing Pro plan. */
export function getSubscriptionEntitlements<T extends SubscriptionState>(rows: T[], now = Date.now()) {
  const proSubscription = rows.find((row) => isProSubscription(row, now)) ?? null;
  const agentPassSubscription = rows.find((row) =>
    row.price_id === "sak_agent_pass_monthly" && isSubscriptionActive(row, now)) ?? null;
  return {
    isPro: proSubscription !== null,
    hasAgentPass: agentPassSubscription !== null,
    proSubscription,
    agentPassSubscription,
    subscription: proSubscription ?? agentPassSubscription ?? rows[0] ?? null,
  };
}