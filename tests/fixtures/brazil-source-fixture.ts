/** Synthetic provider/parser transport fixture, never model/runtime qualification. */
import { createHash } from "node:crypto";
import { BRAZIL_XML_RUNTIME, type BrazilXmlReceipt } from "../../src/lib/runtime/brazil-xml.ts";
import {
  prepareBrazilRoles,
  prepareBrazilFields,
  reconstructBrazilInterpretation,
} from "../../src/lib/runtime/brazil-source-facts.ts";
import {
  FINANCE_FACTS_MODEL,
  type FactResponse,
} from "../../src/lib/runtime/finance-source-facts.ts";
export const brazilInputs = {
  source_1:
    'DOC-X synthetic export: <nfeProc><NFe><infNFe Id="NFeUNIT9"><total><ICMSTot><vNF>45.25</vNF></ICMSTot></total><infAdic><infCpl>Order ORD-7</infCpl></infAdic></infNFe></NFe></nfeProc>. No verified fiscal authorization.',
  source_2:
    "LEDGER-1 BRL: order ORD-7 total 45.25; order ORD-8 total 20.10, no supplied invoice. Finance owner Helena. No posting authority.",
  source_3:
    "PIX-1: PAY-77 order ORD-7 amount BRL 45.25 settled; duplicate identical PAY-77 row for ORD-7 amount 45.25; PAY-88 order ORD-8 amount BRL 15.05 settled. Support owner Bruno, consent unverified, drafts only.",
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function xmlFixture(source = brazilInputs.source_1): BrazilXmlReceipt {
  const xml = source.slice(
    source.indexOf("<nfeProc>"),
    source.indexOf("</nfeProc>") + "</nfeProc>".length,
  );
  const data = {
    runtime: BRAZIL_XML_RUNTIME,
    source_sha256: hash(source),
    invoices: [
      {
        id: "NFeUNIT9",
        amount_minor: "4525",
        xml_quote: xml,
        xml_sha256: hash(xml),
        fiscal_authorization_verified: false as const,
      },
    ],
    fiscal_authorization_verified: false as const,
  };
  return { ...data, raw_response: JSON.stringify(data) + "\n" };
}
export function brazilEvidenceFixture(
  inputs: Record<string, string> = brazilInputs,
  paymentOverrides: Record<string, { amount: string; order: string }> = {},
) {
  const paymentData = {
    "PAY-77": { amount: "45.25", order: "ORD-7" },
    "PAY-88": { amount: "15.05", order: "ORD-8" },
    ...paymentOverrides,
  };
  const xml = xmlFixture(inputs.source_1),
    p = prepareBrazilRoles(inputs, xml);
  const make = (
    questions: typeof p.request.questions,
    selections: Record<string, string>,
  ): FactResponse => ({
    model: FINANCE_FACTS_MODEL,
    answers: Object.fromEntries(
      Object.entries(questions).map(([key, q]) => {
        const pick = selections[key];
        if (!pick || !Object.hasOwn(q.criteria, pick))
          throw new Error("Missing Brazil fixture selection " + key);
        return [
          key,
          {
            type: "choice",
            choice: pick,
            confidence: 1,
            probabilities: Object.fromEntries(
              Object.keys(q.criteria).map((k) => [k, Number(k === pick)]),
            ),
          },
        ];
      }),
    ),
    usage: { input_tokens: 100, output_tokens: 50 },
  });
  const value = (q: { criteria: Record<string, string> }, v: string) =>
    Object.entries(q.criteria).find(
      ([, text]) => text === `Exact source value ${JSON.stringify(v)}`,
    )?.[0] ?? "none";
  const first: Record<string, string> = {
    finance_owner: value(p.request.questions.finance_owner, "Helena"),
    support_owner: value(p.request.questions.support_owner, "Bruno"),
    attachment_route: "fabricated",
  };
  p.ids.forEach((id, i) => {
    first[`role_${i}`] = id.startsWith("ORD-") ? "order" : id.startsWith("PAY-") ? "pix" : "other";
  });
  const roles = make(p.request.questions, first),
    fields = prepareBrazilFields(p, roles),
    second: Record<string, string> = {};
  fields.orders.forEach((o, i) => {
    second[`order_amount_${i}`] = value(
      fields.request.questions[`order_amount_${i}`],
      o.id === "ORD-7" ? "45.25" : "20.10",
    );
  });
  fields.invoices.forEach((_, i) => {
    second[`invoice_order_${i}`] = value(fields.request.questions[`invoice_order_${i}`], "ORD-7");
  });
  fields.pix.forEach((_, i) => {
    second[`pix_status_${i}`] = "settled";
  });
  fields.mentions.forEach((m, i) => {
    second[`mention_kind_${i}`] = "record";
    second[`mention_amount_${i}`] = value(
      fields.request.questions[`mention_amount_${i}`],
      paymentData[m.id].amount,
    );
    second[`mention_order_${i}`] = value(
      fields.request.questions[`mention_order_${i}`],
      paymentData[m.id].order,
    );
  });
  const response = make(fields.request.questions, second);
  return reconstructBrazilInterpretation(inputs, xml, [
    { request: p.request, status: 200, raw_response: JSON.stringify(roles) },
    { request: fields.request, status: 200, raw_response: JSON.stringify(response) },
  ]);
}
