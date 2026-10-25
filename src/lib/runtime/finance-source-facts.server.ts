import { validateFinanceResponse } from "./finance-source-facts.ts";
import {
  prepareFinanceRoles,
  prepareFinanceFields,
  reconstructFinanceInterpretation,
  type FinanceProviderCall,
} from "./finance-interpretation.ts";
export async function deriveFinanceSourceFacts(
  inputs: Record<string, unknown>,
  key: string,
  transport: typeof fetch = fetch,
  onResponse?: (evidence: FinanceProviderCall) => void,
) {
  const roles = prepareFinanceRoles(inputs);
  const first = await requestSourceInterpretation(roles.request, key, transport, onResponse);
  const roleResponse = validateFinanceResponse(first.value, roles);
  const fields = prepareFinanceFields(roles, roleResponse);
  const second = await requestSourceInterpretation(fields, key, transport, onResponse);
  return reconstructFinanceInterpretation(inputs, [
    { request: roles.request, status: first.status, raw_response: first.raw },
    { request: fields, status: second.status, raw_response: second.raw },
  ]);
}

export async function requestSourceInterpretation<
  Request extends {
    model: string;
    state: unknown;
    questions: Record<string, import("./finance-source-facts.ts").FactQuestion>;
  },
>(
  request: Request,
  key: string,
  transport: typeof fetch = fetch,
  onResponse?: (evidence: {
    request: typeof request;
    status: number;
    raw_response: string;
  }) => void,
): Promise<{ value: unknown; raw: string; status: number }> {
  const body = JSON.stringify(request);
  if (!key.trim() || body.includes(key)) throw new Error("Source-facts credential boundary failed");
  let response: Response;
  try {
    response = await transport("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error("Source-facts provider transport failed");
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > 2000000 || raw.includes(key))
    throw new Error("Source-facts response boundary failed");
  onResponse?.({ request: request, status: response.status, raw_response: raw });
  if (!response.ok) throw new Error(`Source-facts provider HTTP ${response.status}`);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Source-facts provider JSON invalid");
  }
  return { value, raw, status: response.status };
}
