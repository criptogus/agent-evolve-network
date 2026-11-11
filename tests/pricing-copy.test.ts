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

const { validateCheckoutQuantity, shouldEnableAdjustableQuantity } =
  await import("../src/lib/checkout-quantity.ts");

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
  assert.equal(shouldEnableAdjustableQuantity({ priceId: "sak_pro_monthly" }), false);
  assert.equal(shouldEnableAdjustableQuantity({ priceId: "sak_pro_monthly", quantity: 2 }), true);
  assert.equal(
    shouldEnableAdjustableQuantity({
      priceId: "sak_pro_monthly",
      quantity: 2,
      adjustableQuantity: false,
    }),
    false,
  );
});

const {
  FREE_PRICING,
  PRICE_FREE,
  PRICES_UPDATED_ON,
  PRICES_UPDATED_ON_ISO,
  PRICE_UPDATE_SENTENCE,
  PRICING_FAQ_QUESTION,
  PRICING_FAQ_ANSWER,
  PRICING_SOFTWARE_LD,
  PRICING_FAQ_LD,
} = await import("../src/lib/pricing-copy.ts");

test("dated pricing copy publishes the confirmed prices and update date", () => {
  assert.equal(PRICES_UPDATED_ON, "November 1, 2026");
  assert.equal(PRICES_UPDATED_ON_ISO, "2026-11-01");
  assert.equal(FREE_PRICING.price, 0);
  assert.equal(PRICE_FREE, "$0");
  assert.equal(
    PRICE_UPDATE_SENTENCE,
    "Prices updated on November 1, 2026. Pro costs $29 per month or $240 per year, and Agent Pass costs $12 per agent per month.",
  );
  assert.ok(PRICING_FAQ_ANSWER.startsWith(PRICE_UPDATE_SENTENCE));
  assert.match(PRICING_FAQ_ANSWER, /Free plan costs \$0 and is free forever/);
  assert.ok(!PRICING_FAQ_ANSWER.includes("—"));
});

test("pricing SoftwareApplication JSON-LD exposes Free and each paid billing unit", () => {
  const json = JSON.stringify(PRICING_SOFTWARE_LD);
  const schema = JSON.parse(json);
  assert.equal(schema["@context"], "https://schema.org");
  assert.equal(schema["@type"], "SoftwareApplication");
  assert.equal(schema.name, "Super Agent Skill");
  assert.equal(schema.url, "https://superagentskill.com/pricing");
  assert.equal(schema.dateModified, PRICES_UPDATED_ON_ISO);
  assert.ok(!json.includes("aggregateRating"));
  assert.equal(schema.offers.length, 4);
  const [free, monthly, yearly, agentPass] = schema.offers;
  assert.equal(free.name, "Free");
  assert.equal(free.price, "0");
  for (const offer of schema.offers) {
    assert.equal(offer["@type"], "Offer");
    assert.equal(offer.priceCurrency, "USD");
    assert.equal(offer.url, schema.url);
  }
  for (const [offer, name, price, unitText] of [
    [monthly, "Pro monthly", "29", "MONTH"],
    [yearly, "Pro yearly", "240", "YEAR"],
    [agentPass, "Agent Pass per agent per month", "12", "agent/month"],
  ]) {
    assert.equal(offer.name, name);
    assert.equal(offer.price, price);
    assert.deepEqual(offer.priceSpecification, {
      "@type": "UnitPriceSpecification",
      name,
      price,
      priceCurrency: "USD",
      unitText,
    });
  }
});

test("pricing FAQPage JSON-LD uses the same complete question and visible answer", () => {
  const schema = JSON.parse(JSON.stringify(PRICING_FAQ_LD));
  assert.equal(schema["@context"], "https://schema.org");
  assert.equal(schema["@type"], "FAQPage");
  assert.equal(PRICING_FAQ_QUESTION, "How much does Super Agent Skill cost?");
  assert.deepEqual(schema.mainEntity, [
    {
      "@type": "Question",
      name: PRICING_FAQ_QUESTION,
      acceptedAnswer: { "@type": "Answer", text: PRICING_FAQ_ANSWER },
    },
  ]);
});

test("pricing SSR includes the visible price source and matching JSON-LD", async () => {
  const { build } = await import("esbuild");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { resolve, join } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  // Isolate auth, checkout and navigation; render the real page and JsonLd component.
  const dir = mkdtempSync(resolve("node_modules/.pricing-ssr-"));
  try {
    const outfile = join(dir, "pricing.mjs");
    await build({
      entryPoints: [resolve("src/routes/pricing.tsx")],
      outfile,
      bundle: true,
      packages: "external",
      platform: "node",
      format: "esm",
      jsx: "automatic",
      alias: { "@": resolve("src") },
      plugins: [
        {
          name: "pricing-ssr-isolation",
          setup(builder) {
            builder.onResolve(
              {
                filter:
                  /^(@tanstack\/react-router|@\/hooks\/|@\/components\/(site\/(Nav|Footer)|PaymentTestModeBanner))/,
              },
              (args) => ({ path: args.path, namespace: "pricing-fixture" }),
            );
            builder.onLoad({ filter: /.*/, namespace: "pricing-fixture" }, () => ({
              contents: `
              export const createFileRoute = () => options => options;
              export const useRouter = () => ({ options: {} });
              export const Link = () => null;
              export const Nav = () => null;
              export const Footer = () => null;
              export const PaymentTestModeBanner = () => null;
              export const useAuth = () => ({ user: null });
              export const useSubscription = () => ({ isActive: false });
              export const useStripeCheckout = () => ({ isOpen: false });
            `,
            }));
          },
        },
      ],
    });
    const { Route } = await import(pathToFileURL(outfile).href);
    const html = renderToStaticMarkup(createElement(Route.component));
    assert.ok(html.includes(PRICE_UPDATE_SENTENCE));
    assert.ok(html.includes(PRICING_FAQ_QUESTION));
    assert.ok(html.includes(PRICING_FAQ_ANSWER));
    const scripts = [
      ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs),
    ];
    assert.equal(scripts.length, 1);
    assert.deepEqual(JSON.parse(scripts[0][1]), [PRICING_SOFTWARE_LD, PRICING_FAQ_LD]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
