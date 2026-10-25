import {
  prepareFinanceFacts,
  validateFinanceResponse,
  composeFinanceFacts,
} from "./finance-source-facts.ts";
export async function deriveFinanceSourceFacts(
  inputs: Record<string, unknown>,
  key: string,
  transport: typeof fetch = fetch,
) {
  const prepared = prepareFinanceFacts(inputs);
  const body = JSON.stringify(prepared.request);
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
  if (!response.ok) throw new Error(`Source-facts provider HTTP ${response.status}`);
  const raw = await response.text();
  if (Buffer.byteLength(raw) > 2000000 || raw.includes(key))
    throw new Error("Source-facts response boundary failed");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Source-facts provider JSON invalid");
  }
  const result = validateFinanceResponse(value, prepared);
  const facts = composeFinanceFacts(prepared, result);
  return { request: prepared.request, response: result, facts };
}
