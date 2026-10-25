/** Actual CLI transport regressions; synthetic receipts never qualify a runtime/model. */
import test from "node:test";
import assert from "node:assert/strict";
import { runSourceStateCli } from "./fixtures/source-state-cli-fixture.ts";
import { brazilInputs, brazilEvidenceFixture } from "./fixtures/brazil-source-fixture.ts";
test("actual Brazil CLI binds isolated XML parsing, dependent interpretation and all three phases", () => {
  const e = brazilEvidenceFixture();
  const r = runSourceStateCli(
    "solution-brazil-reconciliation",
    brazilInputs,
    e.provider_calls.map((c) => c.raw_response),
    true,
    { raw: e.xml_parser.raw_response, status: 0 },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.xmlRequest, { text: brazilInputs.source_1 });
  assert.deepEqual(
    r.requests.map((c) => c.body),
    e.provider_calls.map((c) => c.request),
  );
  const output = JSON.parse(r.stdout);
  assert.equal(output.status, "ok");
  assert.equal(output.brazil_execution.execution, "brazil-source-state-v1");
  assert.deepEqual(output.brazil_execution.xml_runtime, e.xml_parser.runtime);
  assert.deepEqual(output.source_facts, e);
  assert.equal(output.step_outcomes.length, 3);
  for (const phase of ["invoices", "payments", "handoff"]) {
    assert.equal(output.outputs[phase].source_claims_verified, false);
    assert.equal(output.outputs[phase].posting_performed, false);
    assert.equal(output.outputs[phase].payment_performed, false);
    assert.equal(output.outputs[phase].sending_performed, false);
  }
  assert.ok(
    output.outputs.handoff.finance_exceptions.every((x: { owner: string }) => x.owner === "Helena"),
  );
  assert.ok(
    output.outputs.handoff.reply_drafts.every(
      (x: { review_owner: string }) => x.review_owner === "Bruno",
    ),
  );
});
test("actual Brazil CLI rejects XML failure before any provider call", () => {
  const e = brazilEvidenceFixture();
  const r = runSourceStateCli(
    "solution-brazil-reconciliation",
    brazilInputs,
    e.provider_calls.map((c) => c.raw_response),
    true,
    { raw: "", status: 2 },
  );
  assert.equal(r.status, 2);
  assert.equal(r.requests.length, 0);
  const output = JSON.parse(r.stdout);
  assert.equal(output.stage, "source_facts");
  assert.equal(output.step_outcomes, undefined);
});
test("actual Brazil CLI preserves both provider receipts and stops on malformed dependent response", () => {
  const e = brazilEvidenceFixture();
  const r = runSourceStateCli(
    "solution-brazil-reconciliation",
    brazilInputs,
    [e.provider_calls[0].raw_response, "not-json"],
    true,
    { raw: e.xml_parser.raw_response, status: 0 },
  );
  assert.equal(r.status, 2);
  assert.equal(r.requests.length, 2);
  const output = JSON.parse(r.stdout);
  assert.equal(output.source_facts_provider_calls.length, 2);
  assert.equal(output.source_facts_provider_calls[1].raw_response, "not-json");
  assert.equal(output.step_outcomes, undefined);
  assert.ok(!r.stdout.includes("fixture-private-key"));
});
