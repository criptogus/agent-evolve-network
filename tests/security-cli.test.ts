/** Actual CLI transport fixture, never real inference or model qualification. */
import test from "node:test";
import assert from "node:assert/strict";
import { securityInputs, securityEvidenceFixture } from "./fixtures/security-source-fixture.ts";
import { runSourceStateCli } from "./fixtures/source-state-cli-fixture.ts";
function run(consent: boolean) {
  const evidence = securityEvidenceFixture();
  return {
    ...runSourceStateCli(
      "solution-secure-agent-launch",
      securityInputs,
      [evidence.raw_response],
      consent,
    ),
    expectedEvidence: evidence,
  };
}

test("actual security CLI runs four source-state tools with one explicit interpreter transport and no generator", () => {
  const r = run(true);
  assert.equal(r.status, 0, r.stderr);
  const output = JSON.parse(r.stdout);
  assert.equal(output.status, "ok");
  assert.deepEqual(
    output.step_outcomes.map((s: { step_id: string }) => s.step_id),
    ["inventory", "fixtures", "test", "release"],
  );
  assert.equal(output.security_execution.execution, "security-source-state-v1");
  assert.equal(output.security_execution.model, "jev-1.14.0");
  assert.equal(output.workflow_context, undefined);
  assert.deepEqual(output.source_facts, r.expectedEvidence);
  assert.deepEqual(r.requests[0].body, r.expectedEvidence.request);
  assert.match(output.outputs.release.body, /RELEASE BLOCKED/);
  assert.match(output.outputs.release.body, /rollback\/recovery/);
  assert.equal(output.outputs.release.authenticated_release_approval, false);
  assert.equal(output.outputs.test.tests_executed, false);
  assert.ok(
    output.step_outcomes.every(
      (s: { output: { stage_receipt: { model_generation_calls: number } } }) =>
        s.output.stage_receipt.model_generation_calls === 0,
    ),
  );
});
test("actual security CLI rejects missing upload consent before provider or generation calls", () => {
  const r = run(false);
  assert.equal(r.status, 2);
  assert.equal(r.requests.length, 0);
  assert.match(r.stderr, /explicit source upload consent/);
});
