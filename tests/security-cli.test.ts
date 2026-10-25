/** Actual CLI transport fixture, never real inference or model qualification. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { securityInputs, securityEvidenceFixture } from "./fixtures/security-source-fixture.ts";
function run(consent: boolean) {
  const dir = mkdtempSync(join(tmpdir(), "sas security #cli-"));
  try {
    const evidence = securityEvidenceFixture();
    const log = join(dir, "provider-request.json");
    const preload = join(dir, "transport.mjs");
    writeFileSync(
      preload,
      `import { writeFileSync } from 'node:fs';\nglobalThis.fetch = async (url, init) => { if (String(url) !== 'https://api.typesafe.ai/v1/systemone') throw new Error('Unexpected generator or external transport'); writeFileSync(${JSON.stringify(log)}, JSON.stringify({url:String(url),body:JSON.parse(init.body)})); return new Response(${JSON.stringify(evidence.raw_response)}, {status:200}); };\n`,
    );
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--import",
        pathToFileURL(preload).href,
        "scripts/run-playbook.ts",
        "--playbook",
        "solution-secure-agent-launch",
        "--inputs",
        JSON.stringify(securityInputs),
        "--gateway",
        ...(consent ? ["--semantic-source-facts", "--allow-typesafe-source-upload"] : []),
      ],
      {
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          TYPESAFE_API_KEY: "fixture-private-key",
          AI_GATEWAY_BASE_URL: "http://127.0.0.1:1",
          AI_GATEWAY_API_KEY: "fixture-only",
          AI_GATEWAY_MODEL: "fixture-only",
        },
      },
    );
    return {
      ...result,
      expectedEvidence: evidence,
      request: existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : null,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
  assert.deepEqual(r.request.body, r.expectedEvidence.request);
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
  assert.equal(r.request, null);
  assert.match(r.stderr, /explicit source upload consent/);
});
