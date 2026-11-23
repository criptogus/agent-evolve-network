import { test } from "node:test";
import assert from "node:assert/strict";
import { authenticateCronRequest } from "../src/integrations/supabase/cron-auth.ts";
import {
  resolveCheckoutQuantity,
  shouldEnableAdjustableQuantity,
  validateReturnUrl,
} from "../src/lib/checkout-quantity.ts";
import { canAccessDiagnosis, diagnosisCapability } from "../src/lib/university/diagnosis-access.ts";

test("privileged jobs reject public keys and query credentials, accept managed current/previous secrets", async () => {
  const previous = process.env.LOVABLE_CRON_SECRET;
  const old = process.env.LOVABLE_CRON_SECRET_PREVIOUS;
  try {
    process.env.LOVABLE_CRON_SECRET = "test-server-secret";
    process.env.LOVABLE_CRON_SECRET_PREVIOUS = "test-previous-secret";
    for (const value of [
      "",
      "Bearer public-key",
      "Bearer user-jwt",
      "Bearer test-server-secret,extra",
    ]) {
      const r = await authenticateCronRequest(
        new Request("https://example.test/job?apikey=test-server-secret", {
          headers: { authorization: value },
        }),
      );
      assert.equal(r?.status, 401);
    }
    for (const token of ["test-server-secret", "test-previous-secret"]) {
      assert.equal(
        await authenticateCronRequest(
          new Request("https://example.test/job", {
            headers: { authorization: `Bearer ${token}` },
          }),
        ),
        null,
      );
    }
  } finally {
    if (previous === undefined) delete process.env.LOVABLE_CRON_SECRET;
    else process.env.LOVABLE_CRON_SECRET = previous;
    if (old === undefined) delete process.env.LOVABLE_CRON_SECRET_PREVIOUS;
    else process.env.LOVABLE_CRON_SECRET_PREVIOUS = old;
  }
});

test("owned diagnoses require owner; anonymous UUIDs alone are insufficient", () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const cap = diagnosisCapability(id, "test-secret");
  assert.equal(canAccessDiagnosis("alice", "bob", id, "test-secret"), false);
  assert.equal(canAccessDiagnosis("alice", null, cap, "test-secret"), false);
  assert.equal(canAccessDiagnosis("alice", "alice", id, "test-secret"), true);
  assert.equal(canAccessDiagnosis(null, null, id, "test-secret"), false);
  assert.equal(canAccessDiagnosis(null, null, cap, "test-secret"), true);
  assert.equal(
    canAccessDiagnosis(null, null, cap.replace("aaaaaaaa", "bbbbbbbb"), "test-secret"),
    false,
  );
  assert.equal(canAccessDiagnosis(null, null, cap, "other-secret"), false);
});

test("only the exact Agent Pass product accepts adjustable seats", () => {
  for (const priceId of ["sak_pro_monthly", "agent_pass_pro_monthly", "sak_agent_pass_fake"]) {
    assert.equal(resolveCheckoutQuantity(priceId, 50), 1);
    assert.equal(shouldEnableAdjustableQuantity({ priceId, adjustableQuantity: true }), false);
  }
  assert.equal(resolveCheckoutQuantity("sak_agent_pass_monthly", 100), 100);
});

test("checkout rejects attacker preview lookalikes, userinfo and arbitrary ports", () => {
  for (const url of [
    "https://evil-b00a8021-9d8d-4f49-a581-628727b71f68.lovable.app",
    "https://evil@superagentskill.com",
    "https://superagentskill.com:444",
    "http://localhost:3000",
  ]) {
    assert.throws(() => validateReturnUrl(url));
  }
});
