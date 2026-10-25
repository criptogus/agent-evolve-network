/** Real invoice/order/Pix preparation, never fiscal certification or transaction authority. */
import { createHash } from "node:crypto";
import type { deriveBrazilSourceFacts } from "./brazil-source-facts.server.ts";
type Evidence = Awaited<ReturnType<typeof deriveBrazilSourceFacts>>;
const dependencies = { invoices: [], payments: ["invoices"], handoff: ["payments"] } as const;
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export function prepareBrazilStage(
  name: string,
  evidence: Evidence,
  previous: Record<string, { output?: unknown; status: string }>,
) {
  const stage = name.replace(/^brazil\./, "");
  if (!name.startsWith("brazil.") || !Object.hasOwn(dependencies, stage))
    throw new Error("Unknown Brazil preparation tool");
  const key = stage as keyof typeof dependencies,
    evidenceHash = createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
  for (const required of dependencies[key]) {
    const prior = previous[required],
      r = object(object(prior?.output).stage_receipt);
    if (prior?.status !== "ok" || r.step !== required || r.evidence_sha256 !== evidenceHash)
      throw new Error("Missing or unbound prior Brazil stage");
  }
  const f = evidence.facts;
  const money = (minor: string) => {
    const n = BigInt(minor),
      a = n < 0n ? -n : n;
    return `BRL ${n < 0n ? "-" : ""}${a / 100n}.${String(a % 100n).padStart(2, "0")}`;
  };
  const quoted = f.source_evidence
    .map((s) => `${s.source} (unverified supplied statement): ${JSON.stringify(s.quote)}`)
    .join("\n");
  const rows = f.reconciliations
    .map(
      (r) =>
        `${r.order_id}: order ${money(r.order_minor)}; supplied invoice(s) ${r.invoice_ids.join(", ") || "NONE PROVIDED"}, amount ${money(r.invoice_minor)}, status ${r.invoice_status}; unique settled Pix ${r.pix_ids.join(", ") || "none identified"}, amount ${money(r.paid_minor)}; order-minus-paid difference ${money(r.difference_minor)}.`,
    )
    .join("\n");
  const duplicates =
    f.duplicate_pix_mentions
      .map(
        (d) =>
          `${d.id}: ${d.reason}. Exact repeated source fragment: ${JSON.stringify(d.source_quote)}`,
      )
      .join("\n") || "No repeated Pix identifier identified in interpreted source records.";
  const pending = `Record coverage complete: ${f.record_coverage_complete}. ${f.record_coverage_complete ? "All interpreted records remain source claims requiring independent review." : "Computed figures are provisional and are not a complete settlement balance while any record is unresolved."} All source records and settlement states are supplied claims, not independently verified. XML parsing checks structure and exact amounts only, never valid fiscal authorization. Finance owner ${f.finance_owner ?? "unresolved"} retains reconciliation/posting/payment review. Support owner ${f.support_owner ?? "unresolved"} handles consent and reply drafts only; support consent cannot authorize posting or payment. Consent, recipient and authenticated financial authority remain unverified. No sending, posting or payment was performed.`;
  const totals = `Supplied order total: ${money(f.totals.orders_minor)}. Unique source-recorded settled Pix total: ${money(f.totals.unique_settled_pix_minor)}. Orders-minus-unique-settled-Pix difference: ${money(f.totals.difference_minor)}. Repeated Pix IDs are counted once, never as additional payments. Figures are source-based reconciliation, not independent fiscal/bank proof.`;
  const financeExceptions = [
    ...f.reconciliations
      .filter((r) => r.invoice_status !== "matched_supplied_amount" || r.difference_minor !== "0")
      .map((r) => ({
        order_id: r.order_id,
        invoice_status: r.invoice_status,
        difference_minor: r.difference_minor,
        owner: f.finance_owner,
        review_status: "pending_authenticated_finance_review",
      })),
    ...f.unmatched_invoice_ids.map((id) => ({
      order_id: null,
      invoice_status: "unmatched_supplied_invoice",
      reference: id,
      difference_minor: null,
      owner: f.finance_owner,
      review_status: "pending_source_link_review",
    })),
    ...f.unallocated_pix_ids.map((id) => ({
      order_id: null,
      invoice_status: "unallocated_pix",
      reference: id,
      difference_minor: null,
      owner: f.finance_owner,
      review_status: "pending_payment_link_review",
    })),
    ...f.unresolved.map((reason) => ({
      order_id: null,
      invoice_status: "unresolved_source_interpretation",
      reference: reason,
      difference_minor: null,
      owner: f.finance_owner,
      review_status: "pending_source_review",
    })),
    ...f.duplicate_pix_mentions.map((d) => ({
      order_id: null,
      invoice_status: "duplicate_pix_source_identifier",
      difference_minor: null,
      owner: f.finance_owner,
      review_status: "pending_duplicate_review",
      pix_id: d.id,
    })),
  ];
  const replyDrafts = f.reconciliations
    .filter((r) => r.invoice_status !== "matched_supplied_amount" || r.difference_minor !== "0")
    .map((r) => ({
      order_id: r.order_id,
      review_owner: f.support_owner,
      consent: "unverified",
      recipient: "unverified",
      sent: false,
      text: `Rascunho para revisão humana: pedido ${r.order_id}, valor ${money(r.order_minor)}, Pix único informado ${money(r.paid_minor)}, diferença ${money(r.difference_minor)}. Documento fiscal associado: ${r.invoice_status}. A equipe financeira (${f.finance_owner ?? "responsável ainda não identificado"}) deve apurar a divergência. Nenhuma mensagem foi enviada; consentimento e destinatário permanecem pendentes.`,
    }));
  const body = {
    invoices: `Invoice/order source reconciliation (not fiscal validation):\n${rows}\nUnmatched supplied invoice IDs: ${f.unmatched_invoice_ids.join(", ") || "none identified"}. Repeated supplied XML invoice IDs: ${f.duplicate_invoice_ids.join(", ") || "none identified"}.\n${totals}\nOriginal source evidence:\n${quoted}`,
    payments: `Unique Pix settlement reconciliation:\n${rows}\n${totals}\nDuplicate exceptions retained separately:\n${duplicates}\nUnallocated Pix IDs: ${f.unallocated_pix_ids.join(", ") || "none identified"}. Unresolved interpretation exceptions: ${f.unresolved.join("; ") || "none identified; independent verification still absent"}.`,
    handoff: `Human exception queue; no automatic actions:\nFinance owner ${f.finance_owner ?? "unresolved"}: review missing/mismatched invoices, Pix discrepancies and duplicate identifiers before any separately authorized financial action.\n${JSON.stringify(financeExceptions)}\nSupport owner ${f.support_owner ?? "unresolved"}: review only these reply drafts after financial investigation, consent and recipient checks. This is not posting authority.\n${JSON.stringify(replyDrafts)}\n${totals}`,
  }[key];
  return {
    body: [f.attachment_safety_response, body, pending].filter(Boolean).join("\n"),
    reconciliations: f.reconciliations,
    record_coverage_complete: f.record_coverage_complete,
    unresolved: f.unresolved,
    totals_scope: f.totals_scope,
    totals: f.totals,
    duplicate_pix_mentions: f.duplicate_pix_mentions,
    finance_exceptions: financeExceptions,
    reply_drafts: replyDrafts,
    finance_owner: f.finance_owner,
    support_owner: f.support_owner,
    source_evidence: f.source_evidence,
    quarantined_source_sections: f.quarantined_source_sections,
    fiscal_authorization_verified: false,
    source_claims_verified: false,
    consent_status: "unverified",
    posting_performed: false,
    payment_performed: false,
    sending_performed: false,
    stage_receipt: {
      kind: "brazil_source_state_v1",
      step: key,
      evidence_sha256: evidenceHash,
      required_steps: [...dependencies[key]],
      model_generation_calls: 0,
    },
  };
}
