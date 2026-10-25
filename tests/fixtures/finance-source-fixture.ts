import {
  prepareFinanceFacts,
  validateFinanceResponse,
  FINANCE_FACTS_MODEL,
  type FactResponse,
} from "../../src/lib/runtime/finance-source-facts.ts";
import {
  prepareFinanceRoles,
  prepareFinanceFields,
  reconstructFinanceInterpretation,
} from "../../src/lib/runtime/finance-interpretation.ts";
export const financeInputs = {
  source_1:
    "Invoice A-1 EUR 10.00. Bank B-2 debit EUR 5.00 for invoice A-1. No ledger entry for A-1.",
  source_2: "Reviewer Joana owns unmatched entries; reporting period September.",
  source_3:
    "Approved expense budget EUR 12.00. Opening cash EUR 30.00. No closing sign-off or posting authority has been verified.",
};
export function financeEvidenceFixture() {
  const p = prepareFinanceFacts(financeInputs);
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
  const roles = prepareFinanceRoles(financeInputs);
  const part = (request: { questions: Record<string, unknown> }) => ({
    ...response,
    answers: Object.fromEntries(
      Object.keys(request.questions).map((key) => [key, response.answers[key]]),
    ),
  });
  const first = part(roles.request);
  const fields = prepareFinanceFields(roles, first);
  return reconstructFinanceInterpretation(financeInputs, [
    { request: roles.request, status: 200, raw_response: JSON.stringify(first) },
    { request: fields, status: 200, raw_response: JSON.stringify(part(fields)) },
  ]);
}
