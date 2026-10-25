/** Actual CLI fixtures, never live interpretation or model approval. */
import test from "node:test";
import assert from "node:assert/strict";
import { runSourceStateCli } from "./fixtures/source-state-cli-fixture.ts";
import { financeInputs, financeEvidenceFixture } from "./fixtures/finance-source-fixture.ts";
test("actual finance CLI preserves two dependent provider calls and four source-state outputs", () => {
  const e = financeEvidenceFixture();
  const r = runSourceStateCli(
    "solution-monthly-finance-close",
    financeInputs,
    e.provider_calls.map((c) => c.raw_response),
    true,
  );
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.requests.length, 2);
  assert.deepEqual(
    r.requests.map((c) => c.body),
    e.provider_calls.map((c) => c.request),
  );
  const output = JSON.parse(r.stdout);
  assert.equal(output.status, "ok");
  assert.equal(output.finance_execution.execution, "finance-source-state-v3");
  assert.deepEqual(output.source_facts, e);
  assert.equal(output.source_facts.response.usage.input_tokens, 200);
  assert.equal(output.step_outcomes.length, 4);
  assert.equal(output.outputs.analyze.totals.current_cash.display, "EUR 25.00");
  assert.equal(output.outputs.approve.controller_review.verified, false);
  assert.equal(output.workflow_context, undefined);
});
test("actual finance CLI retains first and second safe responses when dependent interpretation fails", () => {
  const e = financeEvidenceFixture();
  const r = runSourceStateCli(
    "solution-monthly-finance-close",
    financeInputs,
    [e.provider_calls[0].raw_response, "not-json"],
    true,
  );
  assert.equal(r.status, 2);
  assert.equal(r.requests.length, 2);
  const output = JSON.parse(r.stdout);
  assert.equal(output.stage, "source_facts");
  assert.equal(output.source_facts_provider_calls.length, 2);
  assert.equal(
    output.source_facts_provider_calls[0].raw_response,
    e.provider_calls[0].raw_response,
  );
  assert.equal(output.source_facts_provider_calls[1].raw_response, "not-json");
  assert.equal(output.step_outcomes, undefined);
  assert.ok(!r.stdout.includes("fixture-private-key"));
});
