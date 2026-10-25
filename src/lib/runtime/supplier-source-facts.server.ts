import {
  prepareSupplierFacts,
  validateSupplierResponse,
  composeSupplierFacts,
} from "./supplier-source-facts.ts";
import { requestSourceInterpretation } from "./finance-source-facts.server.ts";
export async function deriveSupplierSourceFacts(
  inputs: Record<string, unknown>,
  key: string,
  transport: typeof fetch = fetch,
  onResponse?: Parameters<typeof requestSourceInterpretation>[3],
) {
  const p = prepareSupplierFacts(inputs);
  const { value, raw } = await requestSourceInterpretation(p.request, key, transport, onResponse);
  const response = validateSupplierResponse(value, p);
  return {
    request: p.request,
    response,
    facts: composeSupplierFacts(p, response),
    raw_response: raw,
  };
}
