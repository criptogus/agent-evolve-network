import { test } from "node:test";
import assert from "node:assert/strict";

const { resolveCheckoutQuantity, validateReturnUrl } =
  await import("../src/lib/checkout-quantity.ts");
const { canAccessDiagnosis } = await import("../src/lib/university/diagnosis-access.ts");

test("Pro plans are always sold as quantity 1, whatever the caller asks", () => {
  assert.equal(resolveCheckoutQuantity("sak_pro_monthly", 50), 1);
  assert.equal(resolveCheckoutQuantity("sak_pro_yearly", 7), 1);
});

test("Agent Pass keeps the chosen number of agent seats", () => {
  assert.equal(resolveCheckoutQuantity("sak_agent_pass_monthly", 3), 3);
  assert.throws(() => resolveCheckoutQuantity("sak_agent_pass_monthly", 101));
});

test("checkout return links must point back at this site", () => {
  assert.equal(
    validateReturnUrl("https://superagentskill.com/welcome?session_id={CHECKOUT_SESSION_ID}"),
    "https://superagentskill.com/welcome?session_id={CHECKOUT_SESSION_ID}",
  );
  assert.ok(validateReturnUrl("https://agent-evolve-network.lovable.app/account/billing"));
  assert.throws(() => validateReturnUrl("https://evil.example.com/phish"));
  assert.throws(() => validateReturnUrl("https://superagentskill.com.evil.io/x"));
  assert.throws(() => validateReturnUrl("javascript:alert(1)"));
  assert.throws(() => validateReturnUrl("http://superagentskill.com/welcome"));
});

test("an owned diagnosis is only reachable by its owner", () => {
  assert.equal(canAccessDiagnosis("user-a", "user-a", "id", "secret"), true);
  assert.equal(canAccessDiagnosis("user-a", "user-b", "id", "secret"), false);
  assert.equal(canAccessDiagnosis("user-a", null, "id", "secret"), false);
  assert.equal(canAccessDiagnosis(null, null, "id", "secret"), false);
});
