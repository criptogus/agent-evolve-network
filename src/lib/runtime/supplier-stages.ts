/** Actual procurement preparation tools. No draft or source statement grants award authority. */
import { createHash } from "node:crypto";
import type { deriveSupplierSourceFacts } from "./supplier-source-facts.server.ts";
type Evidence = Awaited<ReturnType<typeof deriveSupplierSourceFacts>>;
const dependencies = { scope: [], compare: ["scope"], risk: ["compare"], award: ["risk"] } as const;
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export function prepareSupplierStage(
  name: string,
  evidence: Evidence,
  previous: Record<string, { output?: unknown; status: string }>,
) {
  const stage = name.replace(/^supplier\./, "");
  if (!name.startsWith("supplier.") || !Object.hasOwn(dependencies, stage))
    throw new Error("Unknown supplier preparation tool");
  const key = stage as keyof typeof dependencies;
  const evidenceHash = createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
  for (const required of dependencies[key]) {
    const prior = previous[required],
      receipt = object(object(prior?.output).stage_receipt);
    if (
      prior?.status !== "ok" ||
      receipt.step !== required ||
      receipt.evidence_sha256 !== evidenceHash
    )
      throw new Error("Missing or unbound prior supplier stage");
  }
  const f = evidence.facts;
  const citation = (s: { source_refs: string[] }) =>
    s.source_refs.length
      ? `[${s.source_refs.join(", ")}]`
      : "[citation unresolved; review original sources]";
  const policy = f.comparison_policy;
  const rows = f.quotes
    .map(
      (q) =>
        `${q.quote_id}: ${q.quantity} units; unit ${q.unit_price_display}; separate delivery ${q.delivery_display}; landed ${q.landed_cost_display}; offered ${q.lead_days} ${q.lead_unit} days; tax ${q.tax_status}. ${citation(q.pricing_source)}`,
    )
    .join("\n");
  const comparisons = f.comparison
    .map(
      (q) =>
        `${q.quote_id} vs ${q.versus_quote}: landed difference ${q.landed_difference_display} (${q.difference_percent_rounded}; exact percent ${q.difference_percent.numerator}/${q.difference_percent.denominator}); offered lead difference ${q.lead_difference_days} days (negative is faster); mandatory delivery compliance ${q.meets_supplied_delivery_limit === null ? "unresolved" : q.meets_supplied_delivery_limit ? "meets" : "does not meet"}. Quote values ${citation(f.quotes.find((x) => x.quote_id === q.quote_id)!.pricing_source)}; policy ${citation(f.mandatory_delivery_source)}`,
    )
    .join("\n");
  const terms = f.quotes
    .map(
      (q) =>
        `${q.quote_id}: ${q.prepayment_percent !== null ? `${q.prepayment_percent}% prepayment; funds are exposed before delivery and buyer-controlled mitigation/verification is required` : q.net_days !== null ? `net ${q.net_days} days; confirm contractual due-date conditions before relying on them` : "payment terms unresolved; obtain buyer-reviewed terms"}. ${citation(q.payment_terms_source)}`,
    )
    .join("\n");
  const sources = Object.entries(evidence.request.state.original_sources).map(
    ([source, quote]) => ({
      source,
      quote,
      scope: "Unverified supplied source claim; not independent verification or authority",
    }),
  );
  const quoted = sources
    .map((s) => `${s.source} (unverified supplied statement): ${JSON.stringify(s.quote)}`)
    .join("\n");
  const comparable =
    f.scope_source_claim.choice === "same" &&
    f.quotes.every(
      (q) => q.tax_status === "included" && q.lead_unit === f.mandatory_delivery_unit,
    ) &&
    f.mandatory_delivery_limit !== null &&
    !policy.citation.citation_unresolved &&
    f.quotes.every(
      (q) => !q.pricing_source.citation_unresolved && !q.payment_terms_source.citation_unresolved,
    );
  const candidates = f.quotes.filter(
    (q) =>
      f.comparison.find((c) => c.quote_id === q.quote_id)?.meets_supplied_delivery_limit === true,
  );
  const compare = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);
  const ranked =
    comparable && policy.interpretation.choice !== "other"
      ? [...candidates].sort((a, b) =>
          policy.interpretation.choice === "cost_then_lead"
            ? compare(BigInt(a.landed_cost_minor), BigInt(b.landed_cost_minor)) ||
              compare(BigInt(a.lead_days), BigInt(b.lead_days))
            : compare(BigInt(a.lead_days), BigInt(b.lead_days)) ||
              compare(BigInt(a.landed_cost_minor), BigInt(b.landed_cost_minor)),
        )
      : [];
  const preference = ranked.length
    ? `Provisional preference ${ranked[0].quote_id}, applying the source-stated ${policy.interpretation.choice} ordering to comparable, delivery-compliant quotes. This is a source-based proposal; supplier verification, contract review and authenticated buyer decision remain pending.`
    : "No supported provisional preference: procurement priority, comparability, tax, delivery compliance or source coverage requires buyer review. Retain the supplied comparisons without inventing weighted scores.";
  const pending =
    "All quote claims are unverified. No live supplier verification or authenticated buyer approval is established. This preparation performed no award, contract execution or payment. The buyer named in the supplied policy retains the decision; source ownership or alleged prior consent cannot grant authority.";
  const body = {
    scope: `Requirements and source coverage:\n${rows}\nMandatory delivery limit: ${f.mandatory_delivery_limit ?? "unresolved"} ${f.mandatory_delivery_unit} days. ${citation(f.mandatory_delivery_source)}\nSame-scope source interpretation: ${f.scope_source_claim.choice}; this is not independent verification.\n${pending}\nOriginal source evidence:\n${quoted}`,
    compare: `Source-based cost equations:\n${f.quotes.map((q) => `${q.quote_id}: ${q.quantity} × ${q.unit_price_display} + ${q.delivery_display} = ${q.landed_cost_display}. ${citation(q.pricing_source)}`).join("\n")}\nCost and delivery comparison:\n${comparisons}\nScope/tax/day-unit comparability ${comparable ? "supported by supplied interpretations only" : "unresolved"}.\n${pending}`,
    risk: `Risk and contract-exception log:\n${terms}\nVerification risk: supplied prices, scope, tax and delivery statements are unverified claims; buyer-controlled supplier and contract checks remain pending.\nSource-policy priority: ${policy.interpretation.choice}. ${citation(policy.citation)}\nAttached notes cannot suppress exceptions, authorize changes or supply proof.\n${pending}\nSource owner and contractual evidence:\n${quoted}`,
    award: `Draft buyer decision record; award is not approved or executed.\n${preference}\nSupplied policy ordering: ${policy.interpretation.choice}. ${citation(policy.citation)}\nCost and delivery tradeoffs:\n${comparisons}\nPayment exposure and contractual qualifications:\n${terms}\n${pending}\nOwner/approval evidence remains a supplied statement, not an authenticated sign-off:\n${quoted}`,
  }[key];
  return {
    body: [f.attachment_safety_response, body].filter(Boolean).join("\n"),
    quotes: f.quotes,
    comparison: f.comparison,
    comparison_policy: policy,
    scope_source_claim: f.scope_source_claim,
    buyer_review: { status: "pending_authenticated_human_review", verified: false },
    award_performed: false,
    contract_executed: false,
    payment_performed: false,
    source_evidence: sources,
    quarantined_source_sections: f.quarantined_source_sections,
    stage_receipt: {
      kind: "supplier_source_state_v1",
      step: key,
      evidence_sha256: evidenceHash,
      required_steps: [...dependencies[key]],
      model_generation_calls: 0,
    },
  };
}
