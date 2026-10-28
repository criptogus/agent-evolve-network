import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { z } from "zod";
const [selectionFile, planFile, outputFile] = process.argv.slice(2);
if (!selectionFile || !planFile || !outputFile || existsSync(outputFile))
  throw new Error("Usage: summarize-agent-match-selection.ts SELECTIONS PLAN NEW_REPORT");
const candidate = z.object({
  slug: z.string(),
  type: z.enum(["skill", "playbook", "soul", "guardrail"]),
});
const input = z
  .object({
    planHash: z.string(),
    completed: z.literal(36),
    total: z.literal(36),
    results: z
      .array(
        z.object({
          caseId: z.string(),
          repeat: z.number(),
          candidates: z.array(candidate).min(1),
          trace: z.object({
            protocol: z.string(),
            model: z.literal("jev-1.14.0"),
            reason: z.string(),
            requests: z.number().int().positive(),
            input_tokens: z.number().int().nonnegative(),
            output_tokens: z.number().int().nonnegative(),
            usage_complete: z.literal(true),
            elapsed_ms: z.number().positive(),
            catalog_count: z.literal(665),
          }),
        }),
      )
      .length(36),
  })
  .parse(JSON.parse(readFileSync(selectionFile, "utf8")));
const plan = z
  .object({
    planHash: z.string(),
    cases: z.array(z.object({ id: z.string(), required: z.array(z.string()) })).length(12),
  })
  .parse(JSON.parse(readFileSync(planFile, "utf8")));
if (
  plan.planHash !== input.planHash ||
  new Set(input.results.map((r) => `${r.caseId}:${r.repeat}`)).size !== 36
)
  throw new Error("Changed plan or duplicate observations");
for (const item of plan.cases)
  for (let repeat = 0; repeat < 3; repeat++)
    if (!input.results.some((r) => r.caseId === item.id && r.repeat === repeat))
      throw new Error("Missing observation");
const missingRequired = input.results.flatMap((r) =>
  (plan.cases.find((c) => c.id === r.caseId)?.required ?? [])
    .filter((s) => !r.candidates.some((c) => c.slug === s))
    .map((slug) => ({ caseId: r.caseId, repeat: r.repeat, slug })),
);
const sorted = input.results.map((r) => r.trace.elapsed_ms).sort((a, b) => a - b);
const tokens = input.results.reduce(
  (a, r) => ({ input: a.input + r.trace.input_tokens, output: a.output + r.trace.output_tokens }),
  { input: 0, output: 0 },
);
const report = {
  status: "selection_stage_only_not_qualification",
  planHash: plan.planHash,
  protocols: [...new Set(input.results.map((r) => r.trace.protocol))],
  model: "jev-1.14.0",
  observations: 36,
  requests: input.results.reduce((n, r) => n + r.trace.requests, 0),
  tokens,
  providerEquivalentUsd: (tokens.input * 0.042) / 1e6,
  invoiceReconciled: false,
  fullCatalogObservations: input.results.filter((r) => r.candidates.length === 665).length,
  meanForwarded: input.results.reduce((n, r) => n + r.candidates.length, 0) / 36,
  p95SelectionMs: sorted[Math.ceil(sorted.length * 0.95) - 1],
  reasons: input.results.reduce<Record<string, number>>((a, r) => {
    a[r.trace.reason] = (a[r.trace.reason] ?? 0) + 1;
    return a;
  }, {}),
  missingRequired,
  generatorCalls: 0,
  publicationApproved: false,
};
writeFileSync(outputFile, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
if (missingRequired.length) process.exitCode = 4;
