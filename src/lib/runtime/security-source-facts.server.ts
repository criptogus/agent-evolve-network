import {
  prepareSecurityFacts,
  validateSecurityResponse,
  composeSecurityFacts,
} from "./security-source-facts.ts";
import { requestSourceInterpretation } from "./finance-source-facts.server.ts";
export async function deriveSecuritySourceFacts(
  inputs: Record<string, unknown>,
  key: string,
  transport: typeof fetch = fetch,
  onResponse?: Parameters<typeof requestSourceInterpretation>[3],
) {
  const p = prepareSecurityFacts(inputs);
  const { value, raw } = await requestSourceInterpretation(p.request, key, transport, onResponse);
  const response = validateSecurityResponse(value, p);
  return {
    request: p.request,
    response,
    facts: composeSecurityFacts(p, response),
    raw_response: raw,
  };
}
