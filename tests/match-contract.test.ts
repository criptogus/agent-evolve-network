import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import {
  MATCH_GENERATOR_MODEL,
  matchGenerationOptions,
  MATCH_PROVIDER_OPTIONS,
} from "../src/lib/match/match-generation.ts";
import { z } from "zod";
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMatchPrompt,
  buildMatchOutputSchema,
  buildMatchWireSchema,
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

test("Agent Match requests the provider-supplied JSON contract with explicit scope classification", () => {
  const { system } = buildMatchPrompt({
    brief: "Conferir notas fiscais com evidências",
    candidates,
    desired,
    catalogSize: 3,
  });
  assert.match(system, /JSON/);
  assert.match(system, /provider-supplied JSON Schema/);
  assert.match(system, /recommended_kit.work_domain/);
  assert.match(system, /same language/);
  assert.match(system, /untrusted evidence/);
});

test("actual SDK transport sends GPT-5.2 completion cap and explicit JSON instructions", async () => {
  let captured: Record<string, unknown> | null = null;
  const provider = createOpenAICompatible({
    name: "lovable",
    ...MATCH_PROVIDER_OPTIONS,
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
              message: {
                role: "assistant",
                content: JSON.stringify({
                  ...sanitizeMatch(output(), candidates, desired),
                  recommended_kit: {
                    ...sanitizeMatch(output(), candidates, desired).recommended_kit,
                    work_domain: "runtime_work",
                  },
                }),
              },
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
    output: Output.object({ schema: buildMatchWireSchema(candidates, desired) }),
  });
  assert.equal(result.finishReason, "stop");
  assert.ok(captured);
  const request = z
    .object({
      model: z.literal("openai/gpt-5.2"),
      max_completion_tokens: z.literal(4096),
      max_tokens: z.never().optional(),
      response_format: z.object({
        type: z.literal("json_schema"),
        json_schema: z.object({
          strict: z.literal(true),
          schema: z.record(z.string(), z.unknown()),
        }),
      }),
      messages: z.array(z.object({ content: z.string() })),
    })
    .parse(captured);
  assert.ok(request.messages.some((m) => m.content.includes("JSON Schema")));
  const wireSchema = z
    .object({ properties: z.record(z.string(), z.unknown()), required: z.array(z.string()) })
    .parse(request.response_format.json_schema.schema);
  assert.deepEqual(new Set(wireSchema.required), new Set(Object.keys(wireSchema.properties)));
  const kitSchema = z
    .object({ anyOf: z.array(z.unknown()).length(2), oneOf: z.never().optional() })
    .parse(wireSchema.properties.recommended_kit);
  assert.equal(kitSchema.anyOf.length, 2);
});

test("explicit zero optional package counts stay empty", () => {
  const result = sanitizeMatch(output(), candidates, { ...desired, guardrails: 0 });
  assert.deepEqual(result.recommended_kit.guardrails, []);
});

test("generation schema rejects wrong-type, absent, weak and over-quota packages before sanitization", () => {
  const schema = buildMatchOutputSchema(candidates, desired);
  const clean = sanitizeMatch(output(), candidates, desired);
  const valid = {
    ...clean,
    recommended_kit: { ...clean.recommended_kit, work_domain: "runtime_work" },
  };
  assert.equal(schema.safeParse(valid).success, true);
  for (const bad of ["policy", "foreign"]) {
    const value = structuredClone(valid);
    value.recommended_kit.skills = [item(bad)];
    assert.equal(schema.safeParse(value).success, false);
  }
  const weak = structuredClone(valid);
  weak.recommended_kit.skills = [item("good", 4)];
  assert.equal(schema.safeParse(weak).success, false);
  const excess = structuredClone(valid);
  excess.recommended_kit.skills = [item("good"), item("weak"), item("good")];
  assert.equal(schema.safeParse(excess).success, false);
  const disabled = buildMatchOutputSchema(candidates, { ...desired, guardrails: 0 });
  assert.equal(disabled.safeParse(valid).success, false);
});

test("runtime selection cannot repurpose documented software-verification capabilities", () => {
  const scoped = [
    ...candidates,
    {
      slug: "fix-proof",
      name: "Fix proof",
      type: "skill" as const,
      description: "Demands first-hand evidence before declaring a fix.",
    },
    {
      slug: "code-gate",
      name: "Code gate",
      type: "skill" as const,
      description: "Build and lint check that gates every code change.",
    },
  ];
  const schema = buildMatchOutputSchema(scoped, desired);
  const clean = sanitizeMatch(output(), candidates, desired);
  for (const slug of ["fix-proof", "code-gate"]) {
    const runtime = {
      ...clean,
      recommended_kit: {
        ...clean.recommended_kit,
        work_domain: "runtime_work",
        skills: [item(slug)],
      },
    };
    assert.equal(schema.safeParse(runtime).success, false);
    assert.equal(
      schema.safeParse({
        ...runtime,
        recommended_kit: { ...runtime.recommended_kit, work_domain: "software_work" },
      }).success,
      true,
    );
  }
});

test("665-candidate scoped wire schema stays below the strict provider enum cap without dropping choices", async () => {
  const large = Array.from({ length: 665 }, (_, i) => ({
    slug: `candidate-${i}`,
    name: `Candidate ${i}`,
    type: "skill" as const,
    description: i < 2 ? "Evidence before declaring a fix." : "General public capability",
  }));
  const wire = await buildMatchWireSchema(large, desired).jsonSchema;
  let enumValues = 0;
  const collected: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (key === "enum" && Array.isArray(child)) {
          enumValues += child.length;
          for (const item of child) if (typeof item === "string") collected.push(item);
        }
        visit(child);
      }
    }
  };
  visit(wire);
  assert.ok(enumValues <= 1000, `Provider enum cap exceeded: ${enumValues}`);
  for (const item of large) assert.ok(collected.includes(item.slug), `Lost candidate ${item.slug}`);
});

test("runtime schema excludes software deployment and placeholders without losing software choices", () => {
  const scoped = [
    ...candidates,
    {
      slug: "deployment-helper",
      name: "Delivery",
      type: "skill" as const,
      description: "Configures deployments, build settings and domains.",
    },
  ];
  const schema = buildMatchOutputSchema(scoped, desired);
  const clean = sanitizeMatch(output(), candidates, desired);
  const runtime = {
    ...clean,
    recommended_kit: {
      ...clean.recommended_kit,
      work_domain: "runtime_work",
      skills: [item("deployment-helper")],
    },
  };
  assert.equal(schema.safeParse(runtime).success, false);
  assert.equal(
    schema.safeParse({
      ...runtime,
      recommended_kit: { ...runtime.recommended_kit, work_domain: "software_work" },
    }).success,
    true,
  );
  const placeholder = {
    ...clean,
    recommended_kit: {
      ...clean.recommended_kit,
      work_domain: "runtime_work",
      skills: [{ ...item("good"), role: "N/A", why: "N/A" }],
    },
  };
  assert.equal(schema.safeParse(placeholder).success, false);
});

test("language evidence and score units follow the large catalog rather than being buried before it", () => {
  const { prompt } = buildMatchPrompt({
    brief: "Analyze production losses with the supplied measurements.",
    candidates,
    desired,
    catalogSize: 3,
  });
  assert.ok(
    prompt.indexOf("FINAL LANGUAGE AND SCALE REQUIREMENTS") >
      prompt.indexOf("EXTERNAL MCP REGISTRY"),
  );
  assert.ok(prompt.endsWith("omit an unsupported package."));
  assert.match(prompt, /0–100 percentage scale/);
});
