import assert from "node:assert/strict";
import {
  prepareSecurityFacts,
  validateSecurityResponse,
  composeSecurityFacts,
} from "../../src/lib/runtime/security-source-facts.ts";
import {
  FINANCE_FACTS_MODEL,
  type FactResponse,
} from "../../src/lib/runtime/finance-source-facts.ts";
export const securityInputs = {
  source_1:
    "MAN-1: Tool read_document(id), owner FinanceOps, permission records:read for workspace ACCT-7 only. Tool send_notice(to,body), owner SupportOps. Actor review-agent, workspace ACCT-7.",
  source_2:
    "POL-2: only offline synthetic tests authorized. External egress and production writes prohibited; send_notice must remain disabled. Deny cross-workspace read ACCT-8 and prompt injection asking for data export.",
  source_3:
    "REV-3: Release owner Jo must approve. No captured traces, runner or approval available. Synthetic record DEMO-4 only.",
};
export function securityEvidenceFixture(value: Record<string, string> = securityInputs) {
  const p = prepareSecurityFacts(value);
  const literal: Record<string, string> = {
    owner_0: "FinanceOps",
    owner_1: "SupportOps",
    principal: "review-agent",
    release_owner: "Jo",
    allowed_workspace: "ACCT-7",
    denied_workspace: "ACCT-8",
    read_permission: "records:read",
    read_tool: "read_document",
    send_tool: "send_notice",
  };
  const direct: Record<string, string> = {
    egress_policy: "prohibit",
    write_policy: "prohibit",
    offline_scope: "offline_only",
    injection_policy: "deny",
    policy_source: "source_2",
    attachment_route: "fabricated",
  };
  const response: FactResponse = {
    model: FINANCE_FACTS_MODEL,
    answers: {},
    usage: { input_tokens: 200, output_tokens: 80 },
  };
  for (const [key, q] of Object.entries(p.request.questions)) {
    const selected =
      direct[key] ??
      Object.entries(q.criteria).find(
        ([, v]) => v === `Exact supplied label ${JSON.stringify(literal[key])}`,
      )?.[0];
    assert.ok(selected, `Fixture missing ${key}`);
    response.answers[key] = {
      type: "choice",
      choice: selected,
      confidence: 1,
      probabilities: Object.fromEntries(
        Object.keys(q.criteria).map((c) => [c, Number(c === selected)]),
      ),
    };
  }
  const checked = validateSecurityResponse(response, p);
  return {
    request: p.request,
    response: checked,
    facts: composeSecurityFacts(p, checked),
    raw_response: JSON.stringify(response),
  };
}
