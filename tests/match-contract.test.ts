import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMatch, type AgentMatchResult } from "../src/lib/match/match-contract.ts";
const candidates = [
  { slug: "good", name: "Good", type: "skill" as const, description: "Source-grounded analysis" },
  { slug: "weak", name: "Weak", type: "skill" as const, description: "Unrelated" },
  { slug: "policy", name: "Policy", type: "guardrail" as const, description: "Safety policy" },
];
const desired = { skills: 1, playbooks: 0, souls: 0, guardrails: 1 };
const item = (slug: string, score = 9) => ({
  slug,
  score,
  why: "Fits supplied evidence",
  role: "Analyze",
});
function output(): AgentMatchResult {
  return {
    agent_summary: {
      one_liner: "Analyst",
      primary_jobs: ["Analyze"],
      target_user: "Operator",
      success_metric: "Grounded output",
    },
    recommended_kit: {
      skills: [item("good"), item("good"), item("weak", 4), item("foreign"), item("policy")],
      playbooks: [],
      souls: [],
      guardrails: [item("policy")],
    },
    coverage: { overall_fit_score: 90, strengths: [], risks: [] },
    gaps: [],
    recommended_mcps: [{ id: "sentry-mcp", score: 8, why: "Read errors", pairs_with: ["foreign"] }],
    rationale: "Fixture for output validation",
  };
}
test("Agent Match enforces existing minimum score, distinct catalog slugs and package types", () => {
  const result = sanitizeMatch(output(), candidates, desired);
  assert.deepEqual(
    result.recommended_kit.skills.map((i) => i.slug),
    ["good"],
  );
  assert.deepEqual(
    result.recommended_kit.guardrails.map((i) => i.slug),
    ["policy"],
  );
});
test("MCP pairings reference the sanitized kit and retain the original registry/score checks", () => {
  const result = output();
  result.recommended_mcps.push(
    { id: "sentry-mcp", score: 8, why: "Read errors", pairs_with: ["good", "foreign"] },
    { id: "invented-mcp", score: 10, why: "Invalid", pairs_with: ["good"] },
    { id: "tavily", score: 5, why: "Below minimum", pairs_with: ["good"] },
  );
  const clean = sanitizeMatch(result, candidates, desired);
  assert.deepEqual(clean.recommended_mcps, [
    { id: "sentry-mcp", score: 8, why: "Read errors", pairs_with: ["good"] },
  ]);
});
