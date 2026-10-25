import {
  prepareWorkflowContext,
  validateWorkflowResponse,
  composeWorkflowContext,
} from "./workflow-source-context.ts";
import { requestSourceInterpretation } from "./finance-source-facts.server.ts";
export async function deriveWorkflowContext(
  inputs: Record<string, unknown>,
  key: string,
  transport: typeof fetch = fetch,
  onResponse?: Parameters<typeof requestSourceInterpretation>[3],
) {
  const p = prepareWorkflowContext(inputs);
  if (!p.request)
    return {
      request: null,
      response: null,
      raw_response: null,
      facts: composeWorkflowContext(p, null),
    };
  const { value, raw } = await requestSourceInterpretation(p.request, key, transport, onResponse);
  const response = validateWorkflowResponse(value, p);
  return {
    request: p.request,
    response,
    raw_response: raw,
    facts: composeWorkflowContext(p, response),
  };
}
