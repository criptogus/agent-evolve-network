/**
 * Single source of truth for Super Agent Skill pricing copy.
 * Keeps the landing teaser, FAQ and /pricing page visually and textually in sync.
 *
 * Stripe lookup_keys for new checkout (live products must exist before publish):
 *   sak_pro_monthly | sak_pro_yearly | sak_agent_pass_monthly
 * Legacy grandfather only (do not use on new checkout paths):
 *   agent_pass_pro_monthly | agent_pass_pro_yearly
 */
export const PRICES_UPDATED_ON = "November 1, 2026";
export const PRICES_UPDATED_ON_ISO = "2026-11-01";

export const FREE_PRICING = { price: 0 } as const;

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

/** Production agents included with a Pro subscription. Extra seats are Agent Pass. */
export const PRO_INCLUDED_AGENTS = 1;

/**
 * Pro = human builder seat + 1 included production agent.
 * Agent Pass = standalone monthly seat ($12/agent) — no Pro required; also covers extras beyond Pro's included 1.
 */
export const PRO_VS_AGENT_PASS = `Pro is the human builder seat (Agent Factory, Store, University, reviews) and includes ${PRO_INCLUDED_AGENTS} production agent. Extra production agents beyond that are Agent Pass at $${AGENT_PASS_PRICING.monthlyPerAgent}/agent/mo. Agent Pass is also sold standalone (monthly only, no Pro required) for people who only run agents.`;

export const PRO_YEARLY_SAVINGS = PRO_PRICING.yearlyList - PRO_PRICING.yearly; // 108
export const PRO_YEARLY_DISCOUNT_PCT = Math.round(
  (PRO_YEARLY_SAVINGS / PRO_PRICING.yearlyList) * 100,
); // 31

export const PRICE_FREE = `$${FREE_PRICING.price}`;
export const PRICE_MONTHLY = `$${PRO_PRICING.monthly}`;
export const PRICE_YEARLY = `$${PRO_PRICING.yearly}`;
export const PRICE_YEARLY_LIST = `$${PRO_PRICING.yearlyList}`;
export const PRICE_AGENT_PASS = `$${AGENT_PASS_PRICING.monthlyPerAgent}`;
export const SAVE_BADGE = `Save $${PRO_YEARLY_SAVINGS} · ${PRO_YEARLY_DISCOUNT_PCT}% off`;
export const SAVE_SHORT = `save $${PRO_YEARLY_SAVINGS}`;

/** Canonical one-line answer reused in FAQ copy, meta descriptions and JSON-LD. */
export const PRICING_SENTENCE = `Browsing and installing public capabilities is free — no account needed. Pro is ${PRICE_YEARLY} per year (down from ${PRICE_YEARLY_LIST}, ${PRO_YEARLY_DISCOUNT_PCT}% off) or ${PRICE_MONTHLY} per month for the human builder seat (Agent Factory, Agent Store, SAK University and unlimited tested reviews) and includes ${PRO_INCLUDED_AGENTS} production agent. Extra production agents are Agent Pass at ${PRICE_AGENT_PASS} per agent per month (monthly only) — buy Agent Pass without Pro if you only run agents. Enterprise adds a private registry, SSO and audit logs.`;

/** Dated price source shared by the visible /pricing copy and structured data. */
export const PRICE_UPDATE_SENTENCE = `Prices updated on ${PRICES_UPDATED_ON}. Pro costs ${PRICE_MONTHLY} per month or ${PRICE_YEARLY} per year, and Agent Pass costs ${PRICE_AGENT_PASS} per agent per month.`;
export const PRICING_FAQ_QUESTION = "How much does Super Agent Skill cost?";
export const PRICING_FAQ_ANSWER = `${PRICE_UPDATE_SENTENCE} The Free plan costs ${PRICE_FREE} and is free forever. Enterprise pricing is custom.`;

const PRICING_URL = "https://superagentskill.com/pricing";

function paidOffer(name: string, price: number, unitText: string) {
  return {
    "@type": "Offer",
    name,
    url: PRICING_URL,
    price: String(price),
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      name,
      price: String(price),
      priceCurrency: "USD",
      unitText,
    },
  };
}

export const PRICING_SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Super Agent Skill",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any (MCP-compatible)",
  url: PRICING_URL,
  dateModified: PRICES_UPDATED_ON_ISO,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      url: PRICING_URL,
      price: String(FREE_PRICING.price),
      priceCurrency: "USD",
    },
    paidOffer("Pro monthly", PRO_PRICING.monthly, "MONTH"),
    paidOffer("Pro yearly", PRO_PRICING.yearly, "YEAR"),
    paidOffer("Agent Pass per agent per month", AGENT_PASS_PRICING.monthlyPerAgent, "agent/month"),
  ],
};

export const PRICING_FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: PRICING_URL,
  mainEntity: [
    {
      "@type": "Question",
      name: PRICING_FAQ_QUESTION,
      acceptedAnswer: {
        "@type": "Answer",
        text: PRICING_FAQ_ANSWER,
      },
    },
  ],
};
