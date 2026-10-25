/** Two dependent, source-bound interpretations. Aggregation never fabricates a missing answer. */
import {
  prepareFinanceFacts,
  validateFinanceResponse,
  composeFinanceFacts,
  type FactQuestion,
  type FactResponse,
} from "./finance-source-facts.ts";
export function prepareFinanceRoles(inputs: Record<string, unknown>) {
  const prepared = prepareFinanceFacts(inputs);
  return {
    prepared,
    request: {
      ...prepared.request,
      questions: Object.fromEntries(
        Object.entries(prepared.request.questions).filter(
          ([key]) => key.startsWith("type_") || key === "attachment_route",
        ),
      ),
    },
  };
}
export function prepareFinanceFields(
  p: ReturnType<typeof prepareFinanceRoles>,
  roles: FactResponse,
) {
  const checked = validateFinanceResponse(roles, p);
  if (checked.usage.input_tokens <= 0 || checked.usage.output_tokens <= 0)
    throw new Error("Missing actual role interpretation usage");
  const records = p.prepared.ids.map((id, index) => {
    const answer = checked.answers[`type_${index}`];
    if (answer.type !== "choice") throw new Error("Missing interpreted record type");
    return { id, index, interpreted_record_type: answer.choice };
  });
  const questions: Record<string, FactQuestion> = {};
  for (const [key, question] of Object.entries(p.prepared.request.questions)) {
    if (key.startsWith("type_") || key === "attachment_route") continue;
    const match = /^(amount|direction|invoice)_(\d+)$/.exec(key);
    if (!match) {
      questions[key] = question;
      continue;
    }
    const record = records[Number(match[2])];
    if (record.interpreted_record_type === "other") continue;
    if (match[1] === "direction" && record.interpreted_record_type !== "cash") continue;
    if (match[1] === "invoice" && record.interpreted_record_type === "invoice") continue;
    questions[key] = {
      ...question,
      instructions: `The first source interpretation identifies ${record.id} as a ${record.interpreted_record_type} record. This is an advisory premise, not verification. ${match[1] === "amount" ? `Select the monetary amount explicitly documented for this ${record.interpreted_record_type} record itself. An absent ledger entry does not erase an invoice, and missing posting approval does not erase historical ledger or bank values. Do not aggregate, infer a new transaction or substitute budget/opening cash. If no unique recorded value exists choose none.` : question.instructions}`,
    };
  }
  return {
    model: p.request.model,
    state: {
      original_sources: p.request.state.original_sources,
      interpreted_record_roles: records,
    },
    questions,
  };
}
export type FinanceProviderCall = { request: unknown; status: number; raw_response: string };
export function reconstructFinanceInterpretation(
  inputs: Record<string, unknown>,
  calls: readonly FinanceProviderCall[],
) {
  if (
    calls.length !== 2 ||
    calls.some((c) => c.status !== 200 || typeof c.raw_response !== "string")
  )
    throw new Error("Exactly two successful original provider calls required");
  const roles = prepareFinanceRoles(inputs);
  if (JSON.stringify(calls[0].request) !== JSON.stringify(roles.request))
    throw new Error("Changed finance role request");
  const roleResponse = validateFinanceResponse(JSON.parse(calls[0].raw_response), roles);
  const fieldRequest = prepareFinanceFields(roles, roleResponse);
  if (JSON.stringify(calls[1].request) !== JSON.stringify(fieldRequest))
    throw new Error("Changed dependent finance field request");
  const fieldResponse = validateFinanceResponse(JSON.parse(calls[1].raw_response), {
    request: fieldRequest,
  });
  for (const response of [roleResponse, fieldResponse])
    if (response.usage.input_tokens <= 0 || response.usage.output_tokens <= 0)
      throw new Error("Missing actual interpretation usage");
  const response: FactResponse = {
    model: roleResponse.model,
    answers: { ...roleResponse.answers, ...fieldResponse.answers },
    usage: {
      input_tokens: roleResponse.usage.input_tokens + fieldResponse.usage.input_tokens,
      output_tokens: roleResponse.usage.output_tokens + fieldResponse.usage.output_tokens,
    },
  };
  // Only actually asked questions are combined; ignored branches have no invented placeholders.
  validateFinanceResponse(response, {
    request: { questions: { ...roles.request.questions, ...fieldRequest.questions } },
  });
  const facts = composeFinanceFacts(roles.prepared, response);
  return {
    protocol: "finance-role-fields-v1" as const,
    original_sources: roles.prepared.request.state.original_sources,
    provider_calls: calls.map((c) => ({
      request: c.request,
      status: c.status,
      raw_response: c.raw_response,
    })),
    response_scope: "aggregate_of_two_validated_provider_calls" as const,
    response,
    facts,
  };
}
