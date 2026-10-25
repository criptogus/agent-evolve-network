import {
  prepareFinanceFacts,
  validateFinanceResponse,
  composeFinanceFacts,
} from "./finance-source-facts.ts";
export async function deriveFinanceSourceFacts(
  inputs: Record<string, unknown>,
  key: string,
  transport: typeof fetch = fetch,
  onResponse?: (evidence: {
    request: ReturnType<typeof prepareFinanceFacts>["request"];
    status: number;
    raw_response: string;
  }) => void,
) {
  const prepared = prepareFinanceFacts(inputs);
  const { value, raw } = await requestSourceInterpretation(
    prepared.request,
    key,
    transport,
    onResponse,
  );
  const result = validateFinanceResponse(value, prepared);
  const facts = composeFinanceFacts(prepared, result);
  return { request: prepared.request, response: result, facts, raw_response: raw };
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
): Promise<{ value: unknown; raw: string }> {
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
  return { value, raw };
}
