import { test } from "node:test";
import assert from "node:assert/strict";

const {
  PRO_PRICING,
  AGENT_PASS_PRICING,
  PRO_INCLUDED_AGENTS,
  PRO_YEARLY_SAVINGS,
  PRO_YEARLY_DISCOUNT_PCT,
  PRICING_SENTENCE,
  PRO_VS_AGENT_PASS,
} = await import("../src/lib/pricing-copy.ts");

const {
  validateCheckoutQuantity,
  shouldEnableAdjustableQuantity,
} = await import("../src/lib/checkout-quantity.ts");

test("Pro pricing: $29/mo, $240/yr, list $348 → Save $108 · 31% off", () => {
  assert.equal(PRO_PRICING.monthly, 29);
  assert.equal(PRO_PRICING.yearly, 240);
  assert.equal(PRO_PRICING.yearlyList, 348);
  assert.equal(PRO_YEARLY_SAVINGS, 108);
  assert.equal(PRO_YEARLY_DISCOUNT_PCT, 31);
});

test("Agent Pass pricing: $12 per agent / month", () => {
  assert.equal(AGENT_PASS_PRICING.monthlyPerAgent, 12);
});

test("Pro includes 1 production agent", () => {
  assert.equal(PRO_INCLUDED_AGENTS, 1);
});

test("pricing sentence covers Free, Pro, Agent Pass and Enterprise", () => {
  assert.match(PRICING_SENTENCE, /free/i);
  assert.match(PRICING_SENTENCE, /\$240 per year/);
  assert.match(PRICING_SENTENCE, /\$29 per month/);
  assert.match(PRICING_SENTENCE, /includes 1 production agent/);
  assert.match(PRICING_SENTENCE, /\$12 per agent per month/);
  assert.match(PRICING_SENTENCE, /without Pro/);
  assert.match(PRICING_SENTENCE, /monthly only/);
  assert.match(PRICING_SENTENCE, /Enterprise/);
  assert.match(PRO_VS_AGENT_PASS, /human builder seat/);
  assert.match(PRO_VS_AGENT_PASS, /includes 1 production agent/);
  assert.match(PRO_VS_AGENT_PASS, /standalone/i);
  assert.match(PRO_VS_AGENT_PASS, /no Pro required/);
});

test("validateCheckoutQuantity accepts 1–100 integers", () => {
  assert.equal(validateCheckoutQuantity(undefined), 1);
  assert.equal(validateCheckoutQuantity(1), 1);
  assert.equal(validateCheckoutQuantity(100), 100);
  assert.throws(() => validateCheckoutQuantity(0), /integer between 1 and 100/);
  assert.throws(() => validateCheckoutQuantity(101), /integer between 1 and 100/);
  assert.throws(() => validateCheckoutQuantity(1.5), /integer between 1 and 100/);
});

test("shouldEnableAdjustableQuantity defaults for Agent Pass lookup keys", () => {
  assert.equal(
    shouldEnableAdjustableQuantity({ priceId: "sak_agent_pass_monthly", quantity: 3 }),
    true,
  );
  assert.equal(
    shouldEnableAdjustableQuantity({ priceId: "sak_pro_monthly" }),
    false,
  );
  assert.equal(
    shouldEnableAdjustableQuantity({ priceId: "sak_pro_monthly", quantity: 2 }),
    true,
  );
  assert.equal(
    shouldEnableAdjustableQuantity({
      priceId: "sak_pro_monthly",
      quantity: 2,
      adjustableQuantity: false,
    }),
    false,
  );
});
