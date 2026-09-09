import { test } from "node:test";
import assert from "node:assert/strict";

const { detectFormat, formatWeights, judgeGuidanceForFormat } =
  await import("../src/lib/skills/format.ts");

const PROCEDURAL_PROMPT = `You are a code reviewer. Follow these steps:
1. Read the diff.
2. Flag bugs with line numbers.
3. Suggest fixes.`;

const REFERENCE_PROMPT = `# The MEDDPICC Framework — Complete Reference

MEDDPICC is a qualification methodology for complex B2B sales. This document
describes each pillar in depth, with definitions, common failure modes and the
evidence a seller should collect.

## Metrics
Economic quantification of the value the solution provides...

## Economic Buyer
The person with discretionary access to funds...

## Decision Criteria
The formal and informal yardsticks by which vendors are compared. Buyers weigh
technical fit, commercial terms and risk. Sellers should document each
criterion and who owns it...

## Decision Process
The sequence of approvals — technical validation, business case review,
procurement, legal. Map every stage and its exit criteria...

## Paper Process
Contracting, security review, vendor onboarding. Often underestimated; start
early and track artifacts...

## Identify Pain
The compelling business problem. Without acute pain, deals stall. Categorize
pain as operational, financial or strategic and tie it to metrics...

## Champion
The internal seller. Test for access, influence and personal motivation.
A champion without influence is a fan, not a champion...

## Competition
Every alternative, including "do nothing". Position against decision criteria
rather than feature lists...`;

test("detectFormat: declared format always wins", () => {
  const d = detectFormat({ format: "reference", system_prompt: PROCEDURAL_PROMPT, tags: [] });
  assert.equal(d.format, "reference");
  assert.equal(d.source, "declared");
});

test("detectFormat: reference tag + prose prompt infers reference", () => {
  const d = detectFormat({ tags: ["sales", "framework"], system_prompt: REFERENCE_PROMPT });
  assert.equal(d.format, "reference");
  assert.equal(d.source, "inferred");
});

test("detectFormat: reference tag + numbered steps infers hybrid", () => {
  const d = detectFormat({ tags: ["reference"], system_prompt: PROCEDURAL_PROMPT });
  assert.equal(d.format, "hybrid");
});

test("detectFormat: long prose without examples or steps infers reference", () => {
  const d = detectFormat({ tags: [], system_prompt: REFERENCE_PROMPT, examples: [] });
  assert.equal(d.format, "reference");
});

test("detectFormat: procedural prompt defaults to procedural", () => {
  const d = detectFormat({
    tags: ["code"],
    system_prompt: PROCEDURAL_PROMPT,
    examples: [{ input: "diff", expected_output: "review" }],
  });
  assert.equal(d.format, "procedural");
});

test("formatWeights: each overlay sums to 1.0 and only applies to skills", () => {
  const base = {
    precision: 0.34,
    health: 0.16,
    safety: 0.22,
    halluc: 0.13,
    trigger: 0.09,
    efficiency: 0.06,
  };
  for (const f of ["procedural", "reference", "hybrid"]) {
    const w = formatWeights("skill", f, base);
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${f} weights sum to ${sum}`);
  }
  // Reference shifts weight away from example-precision into groundedness.
  const ref = formatWeights("skill", "reference", base);
  assert.ok(ref.precision < base.precision);
  assert.ok(ref.halluc > base.halluc);
  // Non-skill types keep their own tables untouched.
  assert.deepEqual(formatWeights("guardrail", "reference", base), base);
});

test("judgeGuidanceForFormat: reference re-defines the axes; procedural adds nothing", () => {
  assert.equal(judgeGuidanceForFormat("procedural"), "");
  const g = judgeGuidanceForFormat("reference");
  assert.ok(g.includes("GROUNDEDNESS"));
  assert.ok(g.includes("COVERAGE"));
  assert.ok(g.includes("does not converse"));
  assert.ok(judgeGuidanceForFormat("hybrid").includes("procedural sections"));
});
