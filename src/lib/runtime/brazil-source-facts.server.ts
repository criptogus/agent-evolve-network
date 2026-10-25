import { prepareSourceContext, validateFinanceResponse } from "./finance-source-facts.ts";
import {
  prepareBrazilRoles,
  prepareBrazilFields,
  reconstructBrazilInterpretation,
} from "./brazil-source-facts.ts";
import { parseBrazilXml } from "./brazil-xml.server.ts";
import { requestSourceInterpretation } from "./finance-source-facts.server.ts";
import type { FinanceProviderCall } from "./finance-interpretation.ts";
export async function deriveBrazilSourceFacts(
  inputs: Record<string, unknown>,
  key: string,
  transport: typeof fetch = fetch,
  onResponse?: (e: FinanceProviderCall) => void,
  python = process.env.LOCAL_MODEL_PYTHON ?? "",
) {
  const original = prepareSourceContext(inputs);
  const xml = parseBrazilXml(original.sources.source_1, python);
  const roles = prepareBrazilRoles(inputs, xml);
  const first = await requestSourceInterpretation(roles.request, key, transport, onResponse);
  const roleResponse = validateFinanceResponse(first.value, roles);
  const fields = prepareBrazilFields(roles, roleResponse);
  const second = await requestSourceInterpretation(fields.request, key, transport, onResponse);
  return reconstructBrazilInterpretation(inputs, xml, [
    { request: roles.request, status: first.status, raw_response: first.raw },
    { request: fields.request, status: second.status, raw_response: second.raw },
  ]);
}
