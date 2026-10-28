/**
 * Single source of truth for Super Agent Skill pricing copy.
 * Keeps the landing teaser, FAQ and /pricing page visually and textually in sync.
 *
 * Stripe lookup_keys for new checkout (live products must exist before publish):
 *   sak_pro_monthly | sak_pro_yearly | sak_agent_pass_monthly
 * Legacy grandfather only (do not use on new checkout paths):
 *   agent_pass_pro_monthly | agent_pass_pro_yearly
 */
export const PRO_PRICING = {
  monthly: 29,
  yearly: 240,
  /** 12 x monthly — the anchor shown struck through next to the yearly price. */
  yearlyList: 348,
} as const;

/** Per production-agent seat (quantity = number of agents). */
export const AGENT_PASS_PRICING = {
  monthlyPerAgent: 12,
} as const;

/** Pro = human builder seat; Agent Pass = each production agent seat. */
export const PRO_VS_AGENT_PASS =
  "Pro is the human builder seat (Agent Factory, Store, University, reviews). Agent Pass is each production agent seat (upgrades, SkillForge, weekly report).";

export const PRO_YEARLY_SAVINGS = PRO_PRICING.yearlyList - PRO_PRICING.yearly; // 108
export const PRO_YEARLY_DISCOUNT_PCT = Math.round(
  (PRO_YEARLY_SAVINGS / PRO_PRICING.yearlyList) * 100,
); // 31

export const PRICE_MONTHLY = `$${PRO_PRICING.monthly}`;
export const PRICE_YEARLY = `$${PRO_PRICING.yearly}`;
export const PRICE_YEARLY_LIST = `$${PRO_PRICING.yearlyList}`;
export const PRICE_AGENT_PASS = `$${AGENT_PASS_PRICING.monthlyPerAgent}`;
export const SAVE_BADGE = `Save $${PRO_YEARLY_SAVINGS} · ${PRO_YEARLY_DISCOUNT_PCT}% off`;
export const SAVE_SHORT = `save $${PRO_YEARLY_SAVINGS}`;

/** Canonical one-line answer reused in FAQ copy, meta descriptions and JSON-LD. */
export const PRICING_SENTENCE = `Browsing and installing public capabilities is free — no account needed. Pro is ${PRICE_YEARLY} per year (down from ${PRICE_YEARLY_LIST}, ${PRO_YEARLY_DISCOUNT_PCT}% off) or ${PRICE_MONTHLY} per month for the human builder seat (Agent Factory, Agent Store, SAK University and unlimited tested reviews). Agent Pass is ${PRICE_AGENT_PASS} per agent per month for each production seat (unlimited upgrades, SkillForge and weekly report). Enterprise adds a private registry, SSO and audit logs.`;
