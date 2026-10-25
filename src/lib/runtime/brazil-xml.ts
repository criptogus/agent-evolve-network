import { createHash } from "node:crypto";
export const BRAZIL_XML_RUNTIME = {
  python: "3.12.15",
  architecture: "arm64",
  expat: "expat_2.7.4",
};
export type BrazilXmlInvoice = {
  id: string;
  amount_minor: string;
  xml_quote: string;
  xml_sha256: string;
  fiscal_authorization_verified: false;
};
export type BrazilXmlReceipt = {
  runtime: typeof BRAZIL_XML_RUNTIME;
  source_sha256: string;
  invoices: BrazilXmlInvoice[];
  fiscal_authorization_verified: false;
  raw_response: string;
};
export function validateBrazilXmlReceipt(text: string, raw: string): BrazilXmlReceipt {
  const value: unknown = JSON.parse(raw);
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid XML receipt");
    return v as Record<string, unknown>;
  };
  const data = object(value),
    hash = (s: string) => createHash("sha256").update(s).digest("hex");
  if (
    JSON.stringify(data.runtime) !== JSON.stringify(BRAZIL_XML_RUNTIME) ||
    data.source_sha256 !== hash(text) ||
    data.fiscal_authorization_verified !== false ||
    !Array.isArray(data.invoices) ||
    !data.invoices.length ||
    data.invoices.length > 32
  )
    throw new Error("Unbound XML source/runtime");
  const invoices = data.invoices.map((v) => {
    const i = object(v);
    if (
      typeof i.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,80}$/.test(i.id) ||
      typeof i.amount_minor !== "string" ||
      !/^\d{1,18}$/.test(i.amount_minor) ||
      typeof i.xml_quote !== "string" ||
      !text.includes(i.xml_quote) ||
      i.xml_sha256 !== hash(i.xml_quote) ||
      i.fiscal_authorization_verified !== false
    )
      throw new Error("Invalid XML invoice identity/value");
    return {
      id: i.id,
      amount_minor: i.amount_minor,
      xml_quote: i.xml_quote,
      xml_sha256: hash(i.xml_quote),
      fiscal_authorization_verified: false as const,
    };
  });
  return {
    runtime: BRAZIL_XML_RUNTIME,
    source_sha256: hash(text),
    invoices,
    fiscal_authorization_verified: false,
    raw_response: raw,
  };
}
