import {
  prepareSupplierFacts,
  validateSupplierResponse,
} from "../../src/lib/runtime/supplier-source-facts.ts";
import {
  FINANCE_FACTS_MODEL,
  type FactResponse,
} from "../../src/lib/runtime/finance-source-facts.ts";
export const supplierInputs = {
  source_1:
    "EXPORT-7: Quote Z-8: 37 parts EUR 3.75 each, delivery included, 5 calendar days. Quote Q-9: 37 parts EUR 3.50 each plus EUR 12.50 delivery, 4 calendar days. All taxes included.",
  source_2:
    "Mandatory delivery <=6 calendar days. Compare landed cost first and lead time second. Buyer Noor decides, no approval supplied.",
  source_3:
    "Both quotes have identical scope. Z-8 net 30. Q-9 requires 100% prepayment. No verified contract.",
};
export function supplierEvidenceFixture() {
  const p = prepareSupplierFacts(supplierInputs),
    answers: FactResponse["answers"] = {};
  const n = (v: string) => `n${p.numbers.indexOf(v)}`;
  const selections: Record<string, string> = {
    maximum_delivery: n("6"),
    maximum_delivery_unit: "calendar",
    maximum_delivery_source: "source_2",
    scope: "same",
    priority: "cost_then_lead",
    priority_source: "source_2",
  };
  p.ids.forEach((id, i) => {
    const quote = ["Z-8", "Q-9"].includes(id);
    const q = id === "Q-9";
    Object.assign(selections, {
      [`kind_${i}`]: quote ? "quote" : "other",
      [`pricing_source_${i}`]: quote ? "source_1" : "none",
      [`payment_source_${i}`]: quote ? "source_3" : "none",
      [`quantity_${i}`]: quote ? n("37") : "none",
      [`unit_price_${i}`]: quote ? n(q ? "3.50" : "3.75") : "none",
      [`delivery_charge_${i}`]: quote ? (q ? n("12.50") : "included") : "none",
      [`lead_days_${i}`]: quote ? n(q ? "4" : "5") : "none",
      [`lead_unit_${i}`]: quote ? "calendar" : "unknown",
      [`tax_${i}`]: quote ? "included" : "unknown",
      [`prepayment_percent_${i}`]: q ? n("100") : "none",
      [`net_days_${i}`]: id === "Z-8" ? n("30") : "none",
    });
  });
  for (const [key, q] of Object.entries(p.request.questions))
    answers[key] = {
      type: "choice",
      choice: selections[key],
      confidence: 1,
      probabilities: Object.fromEntries(
        Object.keys(q.criteria).map((c) => [c, Number(c === selections[key])]),
      ),
    };
  const r = {
    model: FINANCE_FACTS_MODEL,
    answers,
    usage: { input_tokens: 123, output_tokens: 45 },
  };
  return { p, r: validateSupplierResponse(r, p) };
}
