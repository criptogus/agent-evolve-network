import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import {
  MATCH_GENERATOR_MODEL,
  matchGenerationOptions,
} from "../src/lib/match/match-generation.ts";
import { z } from "zod";
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMatchPrompt,
  MatchSchema,
  sanitizeMatch,
  type AgentMatchResult,
} from "../src/lib/match/match-contract.ts";
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

test("Agent Match supplies the JSON contract to gateways without native schema support", () => {
  const { system } = buildMatchPrompt({
    brief: "Conferir notas fiscais com evidências",
    candidates,
    desired,
    catalogSize: 3,
  });
  assert.match(system, /JSON/);
  assert.ok(system.includes(JSON.stringify(z.toJSONSchema(MatchSchema))));
  assert.match(system, /same language/);
  assert.match(system, /untrusted evidence/);
});

test("actual SDK transport sends GPT-5.2 completion cap and explicit JSON instructions", async () => {
  let captured: Record<string, unknown> | null = null;
  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://gateway.test/v1",
    fetch: async (_url, init) => {
      captured = z.record(z.string(), z.unknown()).parse(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          id: "fixture",
          model: "gpt-5.2",
          created: 1,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: JSON.stringify(output()) },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
            prompt_tokens_details: { cached_tokens: 0 },
          },
        }),
        { headers: { "content-type": "application/json" } },
      );
    },
  });
  const { system, prompt } = buildMatchPrompt({
    brief: "Conferir notas fiscais com evidências",
    candidates,
    desired,
    catalogSize: 3,
  });
  const result = await generateText({
    model: provider(MATCH_GENERATOR_MODEL),
    ...matchGenerationOptions(),
    system,
    prompt,
    output: Output.object({ schema: MatchSchema }),
  });
  assert.equal(result.finishReason, "stop");
  assert.ok(captured);
  const request = z
    .object({
      model: z.literal("openai/gpt-5.2"),
      max_completion_tokens: z.literal(4096),
      max_tokens: z.never().optional(),
      messages: z.array(z.object({ content: z.string() })),
    })
    .parse(captured);
  assert.ok(request.messages.some((m) => m.content.includes("JSON Schema")));
});

test("explicit zero optional package counts stay empty", () => {
  const result = sanitizeMatch(output(), candidates, { ...desired, guardrails: 0 });
  assert.deepEqual(result.recommended_kit.guardrails, []);
});
