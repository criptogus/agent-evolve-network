/**
 * Single source of truth for Pro pricing copy.
 * Keeps the landing teaser, FAQ and /pricing page visually and textually in sync.
 */
export const PRO_PRICING = {
  monthly: 19,
  yearly: 140,
  /** 12 x monthly — the anchor shown struck through next to the yearly price. */
  yearlyList: 228,
} as const;

export const PRO_YEARLY_SAVINGS = PRO_PRICING.yearlyList - PRO_PRICING.yearly; // 88
export const PRO_YEARLY_DISCOUNT_PCT = Math.round(
  (PRO_YEARLY_SAVINGS / PRO_PRICING.yearlyList) * 100,
); // 39

export const PRICE_MONTHLY = `$${PRO_PRICING.monthly}`;
export const PRICE_YEARLY = `$${PRO_PRICING.yearly}`;
export const PRICE_YEARLY_LIST = `$${PRO_PRICING.yearlyList}`;
export const SAVE_BADGE = `Save $${PRO_YEARLY_SAVINGS} · ${PRO_YEARLY_DISCOUNT_PCT}% off`;
export const SAVE_SHORT = `save $${PRO_YEARLY_SAVINGS}`;

/** Canonical one-line answer reused in FAQ copy, meta descriptions and JSON-LD. */
export const PRICING_SENTENCE = `Browsing and installing public capabilities is free — no account needed. Pro is ${PRICE_YEARLY} per year (down from ${PRICE_YEARLY_LIST}, ${PRO_YEARLY_DISCOUNT_PCT}% off) or ${PRICE_MONTHLY} per month and includes everything: the Agent Factory, the Agent Store, SAK University and unlimited tested reviews. Enterprise adds a private registry, SSO and audit logs.`;
