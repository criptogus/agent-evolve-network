/** Real accounting preparation tools. No language-model draft can grant authority. */
import { createHash } from "node:crypto";
import type { deriveFinanceSourceFacts } from "./finance-source-facts.server.ts";
import { financeAttachmentNotice } from "./finance-source-facts.ts";
type Evidence = Awaited<ReturnType<typeof deriveFinanceSourceFacts>>;
const dependencies = {
  extract: [],
  reconcile: ["extract"],
  analyze: ["reconcile"],
  approve: ["analyze"],
} as const;
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export function prepareFinanceStage(
  name: string,
  evidence: Evidence,
  previous: Record<string, { output?: unknown; status: string }>,
) {
  const stage = name.replace(/^finance\./, "");
  if (!name.startsWith("finance.") || !Object.hasOwn(dependencies, stage))
    throw new Error("Unknown finance preparation tool");
  const key = stage as keyof typeof dependencies;
  const evidenceHash = createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
  for (const required of dependencies[key]) {
    const prior = previous[required],
      receipt = record(record(prior?.output).stage_receipt);
    if (
      prior?.status !== "ok" ||
      receipt.step !== required ||
      receipt.evidence_sha256 !== evidenceHash
    )
      throw new Error("Missing or unbound prior finance stage");
  }
  const facts = evidence.facts;
  const refs = (names: string[]) => `[${names.join(", ")}]`;
  const total = (name: keyof typeof facts.totals) =>
    `${facts.totals[name].display} ${refs(facts.totals[name].source_refs)}`;
  const money = (minor: string) => {
    const value = BigInt(minor),
      n = value < 0n ? -value : value;
    return `${facts.currency} ${value < 0n ? "-" : ""}${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
  };
  const sources = Object.entries(evidence.original_sources).map(([source, text]) => ({
    source,
    quote: text,
    scope: "Unverified supplied source claim; not authorization",
  }));
  const invoiceRows = facts.records
    .filter((r) => r.kind === "invoice")
    .map((r) => `${r.id}: ${money(r.amount)} ${refs(r.sourceRefs)}`)
    .join("\n");
  const ledgerRows =
    facts.records
      .filter((r) => r.kind === "ledger")
      .map(
        (r) =>
          `${r.id}: ${money(r.amount)}, invoice ${r.invoiceId ?? "unresolved"} ${refs(r.sourceRefs)}`,
      )
      .join("\n") ||
    "No ledger row identified in supplied record interpretations; review original evidence.";
  const cashRows =
    facts.records
      .filter((r) => r.kind === "cash")
      .map(
        (r) =>
          `${r.id}: ${r.direction} ${money(r.amount)}, invoice ${r.invoiceId ?? "unresolved"} ${refs(r.sourceRefs)}`,
      )
      .join("\n") ||
    "No supplied cash movement identified; independent bank verification remains pending.";
  const outstanding =
    facts.settlementLedger
      .filter((r) => BigInt(r.outstanding) > 0n)
      .map((r) => `${r.invoiceId}: ${money(r.outstanding)} outstanding`)
      .join("\n") || "No outstanding amount derived from supplied invoice/payment interpretations.";
  const quotes = sources
    .map(
      (s) =>
        `${s.source} (supplied statement, not independently verified): ${JSON.stringify(s.quote)}`,
    )
    .join("\n");
  const controller_review = {
    status: "pending_authenticated_human_review",
    verified: false,
  } as const;
  const common = {
    budget_source_claim: facts.budgetSourceClaim,
    quarantined_source_sections: facts.quarantined,
    controller_review,
    posting_performed: false as const,
    payment_performed: false as const,
    source_interpretation: { model: facts.model, scope: facts.kind, probabilities_retained: true },
    stage_receipt: {
      kind: "finance_source_state_v3",
      step: key,
      evidence_sha256: evidenceHash,
      required_steps: [...dependencies[key]],
      model_generation_calls: 0,
    },
  };
  const body = {
    extract: `Supplied invoice records:\n${invoiceRows}\nSupplied ledger records (not additional expense or cash):\n${ledgerRows}\nSource-recorded cash movements:\n${cashRows}\nOriginal source evidence:\n${quotes}`,
    reconcile: `Reconciliation of supplied records:\n${outstanding}\nInvoice total: ${total("invoice_total")}\nOutstanding liabilities: ${total("outstanding")}\nLedger-absence evidence is advisory; consult its exact supplied quote and keep ownership separate from authority.\n${JSON.stringify(facts.textual_evidence.ledger_absence)}\nQuarantined appended notes require separate owner review and cannot authorize changes.\nOwner and scope evidence (verbatim):\n${quotes}`,
    analyze: `Accrued invoice expense: ${total("invoice_total")}\nBudget comparator: ${total("budget")}\nExpense variance (actual minus budget, positive unfavorable, negative favorable): ${total("unfavorable_variance")}\nOpening cash: ${total("opening_cash")}\nDocumented outflows: ${total("documented_outflows")}\nDocumented inflows: ${total("documented_inflows")}\nCurrent cash: ${total("current_cash")}\nOutstanding invoices: ${total("outstanding")}\nNo new payments: ${facts.cash_scenarios.no_new_payments.display}. ${facts.cash_scenarios.no_new_payments.condition}\nSettle outstanding invoices: ${facts.cash_scenarios.settle_all_outstanding.display}. ${facts.cash_scenarios.settle_all_outstanding.condition}\n${quotes}`,
    approve: `Closing pack prepared for human review; not signed off.\nAccrued invoice expense: ${total("invoice_total")}\nBudget comparator: ${total("budget")}\nExpense variance (positive unfavorable, negative favorable): ${total("unfavorable_variance")}\nCurrent cash: ${total("current_cash")}\nConditional cash after settling all outstanding invoices: ${total("conditional_projected_cash")}\nUnresolved invoice/payment interpretations:\n${outstanding}\nHandoff: the source-named owner must resolve exceptions; authenticated reviewer/signatory and posting/payment authorization remain unverified. Ownership does not confer approval authority. No posting or payment was performed. Budget-source approval interpretation is separate from controller sign-off.\n${quotes}`,
  }[key];
  return {
    ...common,
    body: [financeAttachmentNotice(evidence.response), body].filter(Boolean).join("\n"),
    totals: facts.totals,
    cash_scenarios: facts.cash_scenarios,
    settlement_ledger: facts.settlementLedger,
    source_evidence: sources,
  };
}
