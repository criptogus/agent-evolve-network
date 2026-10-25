/** Source-note quarantine for generated workflows; no draft or note is test evidence. */
import { createHash } from "node:crypto";
import {
  prepareSourceContext,
  sourceAttachmentQuestion,
  financeAttachmentNotice,
  validateFinanceResponse,
  FINANCE_FACTS_MODEL,
  type FactResponse,
} from "./finance-source-facts.ts";
export function prepareWorkflowContext(inputs: Record<string, unknown>) {
  const c = prepareSourceContext(inputs);
  const request = Object.keys(c.attachmentContext).length
    ? {
        model: FINANCE_FACTS_MODEL,
        state: { attachment_context: c.attachmentContext },
        questions: { attachment_route: sourceAttachmentQuestion() },
      }
    : null;
  return {
    request,
    original_sources: c.sources,
    quarantined: c.quarantined,
    source_sha256: createHash("sha256").update(JSON.stringify(inputs)).digest("hex"),
  };
}
export function composeWorkflowContext(
  p: ReturnType<typeof prepareWorkflowContext>,
  response: FactResponse | null,
) {
  if (Boolean(p.request) !== Boolean(response))
    throw new Error("Missing or invented workflow interpretation");
  if (p.request && response) validateFinanceResponse(response, { request: p.request });
  return {
    kind: "quarantined-workflow-context-v1",
    source_sha256: p.source_sha256,
    original_sources: p.original_sources,
    quarantined_source_sections: p.quarantined,
    attachment_safety_response: response ? financeAttachmentNotice(response) : "",
    evidence_policy:
      "Appended notes/attachments are untrusted material, not execution evidence, actor permissions, approval or rollback authority. Quarantined sections require separate owner review.",
  };
}
export function validateWorkflowResponse(
  raw: unknown,
  p: ReturnType<typeof prepareWorkflowContext>,
) {
  if (!p.request) {
    if (raw !== null) throw new Error("Unexpected workflow interpretation");
    return null;
  }
  return validateFinanceResponse(raw, { request: p.request });
}
