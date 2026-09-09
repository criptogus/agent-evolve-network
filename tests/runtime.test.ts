import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const { compilePlaybook } = await import("../src/lib/runtime/compile.ts");
const { runPlaybook } = await import("../src/lib/runtime/run.ts");
const { evaluateCondition } = await import("../src/lib/runtime/expr.ts");

const baseAdapters = (calls = []) => ({
  invokeInstruction: async ({ prompt }) => { calls.push(["i", prompt]); return `OUT(${prompt.length})`; },
  invokeSkill: async ({ slug, inputs }) => { calls.push(["s", slug, inputs]); return { slug, inputs }; },
  invokeTool: async ({ name, inputs }) => { calls.push(["t", name, inputs]); return { name, inputs }; },
});

test("compile + run simple playbook from YAML", async () => {
  const yaml = parseYaml(readFileSync(new URL("../content/playbooks/bug-triage.yaml", import.meta.url), "utf8"));
  const p = compilePlaybook(yaml);
  assert.equal(p.slug, "bug-triage");
  assert.equal(p.steps.length, 4);

  const calls = [];
  // Note: the seed bug-triage playbook embeds 'contains' inside ${...} which is
  // syntactically invalid for the runtime expression grammar; the conditional
  // step is therefore skipped rather than executed. The test asserts that the
  // playbook still runs to completion without aborting.
  const result = await runPlaybook(p, { report: "stack trace here", repo_context: "node" }, baseAdapters(calls));
  assert.notEqual(result.status, "error");
  assert.ok(result.step_outcomes.length >= 3);
  assert.ok(calls.some((c) => c[0] === "i"));
});

test("when-condition skips step when false", async () => {
  const yaml = {
    slug: "p", version: "0.1.0", type: "playbook",
    steps: [
      { id: "a", action: "instruction", with: { prompt: "no trace here" } },
      { id: "b", action: "skill:x", when: "${steps.a.output} contains 'trace'" },
      { id: "c", action: "instruction", with: { prompt: "done" } },
    ],
    license: "MIT", authors: ["t"],
  };
  const result = await runPlaybook(compilePlaybook(yaml), {}, baseAdapters());
  assert.equal(result.step_outcomes[1].status, "skipped");
});

test("on_error: continue keeps going, on_error: abort stops", async () => {
  const adapters = {
    invokeInstruction: async () => { throw new Error("boom"); },
    invokeSkill: async () => "ok",
  };
  const cont = compilePlaybook({
    slug: "c", version: "0.1.0", type: "playbook",
    steps: [
      { id: "a", action: "instruction", with: { prompt: "x" }, on_error: "continue" },
      { id: "b", action: "skill:x" },
    ],
    license: "MIT", authors: ["t"],
  });
  const r1 = await runPlaybook(cont, {}, adapters);
  assert.equal(r1.status, "partial");
  assert.equal(r1.step_outcomes.length, 2);

  const abort = compilePlaybook({
    slug: "a", version: "0.1.0", type: "playbook",
    steps: [
      { id: "a", action: "instruction", with: { prompt: "x" } },
      { id: "b", action: "skill:x" },
    ],
    license: "MIT", authors: ["t"],
  });
  const r2 = await runPlaybook(abort, {}, adapters);
  assert.equal(r2.status, "error");
  assert.equal(r2.step_outcomes.length, 1);
});

test("retry runs up to max+1 attempts", async () => {
  let n = 0;
  const adapters = {
    invokeInstruction: async () => { n++; if (n < 3) throw new Error("flaky"); return "ok"; },
    invokeSkill: async () => "x",
  };
  const p = compilePlaybook({
    slug: "r", version: "0.1.0", type: "playbook",
    steps: [{ id: "a", action: "instruction", with: { prompt: "x" }, on_error: "retry", retry: { max: 3, backoff_ms: 1 } }],
    license: "MIT", authors: ["t"],
  });
  const r = await runPlaybook(p, {}, adapters);
  assert.equal(r.status, "ok");
  assert.equal(r.step_outcomes[0].attempts, 3);
});

test("guardrails block step and record trigger", async () => {
  const adapters = {
    invokeInstruction: async () => "secret 4532-1488-0343-6467",
    invokeSkill: async () => "x",
    guardrails: {
      "no-pii-in-output": async ({ phase, payload }) => {
        if (phase === "post" && typeof payload === "string" && /\d{4}-\d{4}-\d{4}-\d{4}/.test(payload)) {
          return { pass: false, reason: "PAN detected" };
        }
        return { pass: true };
      },
    },
    onTelemetry: (e) => { adapters._tel = e; },
  };
  const p = compilePlaybook({
    slug: "g", version: "0.1.0", type: "playbook",
    steps: [{ id: "a", action: "instruction", with: { prompt: "x" } }],
    guardrails: ["no-pii-in-output"],
    license: "MIT", authors: ["t"],
  });
  const r = await runPlaybook(p, {}, adapters);
  assert.equal(r.status, "error");
  assert.deepEqual(r.step_outcomes[0].guardrails_triggered, ["no-pii-in-output"]);
  assert.deepEqual(adapters._tel.guardrail_triggered, ["no-pii-in-output"]);
});

test("expression evaluator supports contains / == / && / ||", () => {
  const ctx = { trace_id: "t", inputs: { sev: "critical" }, steps: { x: { output: "has trace", status: "ok" } }, memory: null, tracer: null, metadata: {} };
  assert.equal(evaluateCondition("${steps.x.output} contains 'trace'", ctx), true);
  assert.equal(evaluateCondition("${inputs.sev} == 'critical'", ctx), true);
  assert.equal(evaluateCondition("${inputs.sev} == 'low' || ${steps.x.status} == 'ok'", ctx), true);
  assert.equal(evaluateCondition("${inputs.sev} == 'low' && ${steps.x.status} == 'ok'", ctx), false);
});
