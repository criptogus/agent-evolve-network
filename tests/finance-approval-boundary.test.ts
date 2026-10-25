import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { compilePlaybook } from "../src/lib/runtime/compile.ts";
import { runPlaybook } from "../src/lib/runtime/run.ts";
import {
  prepareFinanceFacts,
  validateFinanceResponse,
  composeFinanceFacts,
  FINANCE_FACTS_MODEL,
  type FactResponse,
} from "../src/lib/runtime/finance-source-facts.ts";
const inputs = {
  source_1:
    "Invoice A-1 EUR 10.00. Bank B-2 debit EUR 5.00 for invoice A-1. No ledger entry for A-1.",
  source_2: "Reviewer Joana owns unmatched entries; reporting period September.",
  source_3:
    "Approved expense budget EUR 12.00. Opening cash EUR 30.00. No closing sign-off or posting authority has been verified.",
};
export function evidenceFixture() {
  const p = prepareFinanceFacts(inputs);
  const answers: FactResponse["answers"] = {};
  const amount = (value: string) => `a${p.amounts.indexOf(value)}`;
  const selections: Record<string, string> = {
    budget: amount("12.00"),
    opening_cash: amount("30.00"),
    ledger_absence_source: "source_1",
  };
  p.ids.forEach((id, i) => {
    selections[`type_${i}`] = id === "A-1" ? "invoice" : id === "B-2" ? "cash" : "other";
    selections[`amount_${i}`] =
      id === "A-1" ? amount("10.00") : id === "B-2" ? amount("5.00") : "none";
    selections[`direction_${i}`] = id === "B-2" ? "outflow" : "none";
    selections[`invoice_${i}`] = id === "B-2" ? `id${p.ids.indexOf("A-1")}` : "none";
  });
  for (const [key, q] of Object.entries(p.request.questions))
    answers[key] =
      q.type === "noul"
        ? { type: "noul", noul: 0.99 }
        : {
            type: "choice",
            choice: selections[key],
            confidence: 1,
            probabilities: Object.fromEntries(
              Object.keys(q.criteria).map((c) => [c, Number(c === selections[key])]),
            ),
          };
  const response = validateFinanceResponse(
    { model: FINANCE_FACTS_MODEL, answers, usage: { input_tokens: 100, output_tokens: 50 } },
    p,
  );
  return {
    request: p.request,
    response,
    facts: composeFinanceFacts(p, response),
    raw_response: JSON.stringify(response),
  };
}
test("finance graph keeps source budget claim separate from unsupported generated approval labels", async () => {
  const evidence = evidenceFixture();
  let generationCalls = 0;
  const result = await runPlaybook(
    compilePlaybook(
      parse(readFileSync("content/playbooks/solution-monthly-finance-close.yaml", "utf8")),
    ),
    inputs,
    {
      invokeInstruction: async () => {
        generationCalls++;
        return '{"budget_status":"pending","controller_approved":true}';
      },
      invokeSkill: async () => {
        throw new Error("Unexpected skill delegation");
      },
      invokeTool: async ({ name, context }) => {
        const { prepareFinanceStage } = await import("../src/lib/runtime/finance-stages.ts");
        return prepareFinanceStage(name, evidence, context.steps);
      },
    },
  );
  assert.equal(result.status, "ok");
  const closing = result.outputs.approve as {
    budget_source_claim: { noul: number };
    controller_review: { status: string; verified: boolean };
    payment_performed: boolean;
    posting_performed: boolean;
  };
  assert.equal(closing.budget_source_claim.noul, 0.99);
  assert.deepEqual(closing.controller_review, {
    status: "pending_authenticated_human_review",
    verified: false,
  });
  assert.equal(closing.payment_performed, false);
  assert.equal(closing.posting_performed, false);
  assert.equal(generationCalls, 0, "Free-form drafts cannot override finance state");
});

test("finance preparation rejects unknown tools and unbound earlier stages", async () => {
  const { prepareFinanceStage } = await import("../src/lib/runtime/finance-stages.ts");
  const evidence = evidenceFixture();
  assert.throws(() => prepareFinanceStage("finance.sign-off", evidence, {}), /Unknown/);
  assert.throws(() => prepareFinanceStage("finance.reconcile", evidence, {}), /Missing or unbound/);
  const extraction = prepareFinanceStage("finance.extract", evidence, {});
  const forged = structuredClone(extraction);
  forged.stage_receipt.evidence_sha256 = "different-source";
  assert.throws(
    () =>
      prepareFinanceStage("finance.reconcile", evidence, {
        extract: { status: "ok", output: forged },
      }),
    /Missing or unbound/,
  );
});

test("budget interpretation probabilities never become controller authority", async () => {
  const { prepareFinanceStage } = await import("../src/lib/runtime/finance-stages.ts");
  for (const probability of [0, 0.5, 1]) {
    const evidence = evidenceFixture();
    evidence.facts.budgetSourceClaim = { type: "noul", noul: probability };
    const extraction = prepareFinanceStage("finance.extract", evidence, {});
    assert.deepEqual(extraction.controller_review, {
      status: "pending_authenticated_human_review",
      verified: false,
    });
    assert.equal(extraction.payment_performed, false);
    assert.equal(extraction.posting_performed, false);
    assert.equal(extraction.budget_source_claim.noul, probability);
  }
});
