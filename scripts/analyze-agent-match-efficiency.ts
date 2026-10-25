// Offline diagnosis only: never generates, repairs, grades or publishes outputs.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { evidenceHash, PAIRED_CRITERIA } from "../src/lib/match/paired-evaluation.ts";
import {
  BENCHMARK_USD_LIMIT,
  BENCHMARK_PRIOR_LIMIT_USD,
  BENCHMARK_PRIOR_HELD_USD,
  BENCHMARK_PRIOR_SPEND_UPPER_USD,
  generatorCost,
} from "../src/lib/match/benchmark-budget.ts";
import { SELECTION_CACHE_TTL_MS } from "../src/lib/match/jev-selection-cache.server.ts";
const args = process.argv.slice(2);
if (args.length !== 5 || args.some((a) => !a.trim()))
  throw new Error(
    "Usage: analyze-agent-match-efficiency.ts PLAN JOURNAL BILLING PRIOR_SUMMARY NEW_REPORT",
  );
const [planFile, journalFile, billingFile, summaryFile, output] = args;
if (existsSync(output)) throw new Error("Existing report; refusing overwrite");
const load = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const raw = z.record(z.string(), z.unknown()).parse(load(planFile));
const { planHash, ...payload } = raw;
if (
  evidenceHash(payload) !== planHash ||
  evidenceHash(raw.criteria) !== evidenceHash(PAIRED_CRITERIA)
)
  throw new Error("Changed frozen plan or criteria");
const plan = z
  .object({
    planHash: z.string(),
    cases: z.array(z.object({ id: z.string() })).length(12),
    schedule: z
      .array(z.object({ caseId: z.string(), repeat: z.number(), arm: z.enum(["baseline", "jev"]) }))
      .length(72),
  })
  .parse(raw);
const meter = z.number().int().nonnegative();
const journal = z
  .object({
    planHash: z.string(),
    status: z.literal("completed"),
    inflight: z.null(),
    rows: z
      .array(
        z.object({
          caseId: z.string(),
          repeat: z.number(),
          arm: z.enum(["baseline", "jev"]),
          clientElapsedMs: z.number().positive(),
          result: z.object({
            attempt: z.string(),
            status: z.literal("returned"),
            actualModel: z.literal("gpt-5.2-2025-12-11"),
            responseId: z.string(),
            finishReason: z.literal("stop"),
            usage: z.object({ input: meter, cachedInput: meter, output: meter }),
            generatorElapsedMs: z.number().positive(),
            forwardedSlugs: z.array(z.string()).min(1),
            selection: z.object({
              elapsed_ms: z.number().nonnegative(),
              usage_complete: z.literal(true),
              input_tokens: meter,
              output_tokens: meter,
              requests: meter,
            }),
          }),
        }),
      )
      .length(72),
  })
  .parse(load(journalFile));
const billing = z
  .array(
    z.object({
      attempt: z.string(),
      responseId: z.string(),
      usdLower: z.number().nonnegative(),
      usdUpper: z.number().nonnegative(),
      source: z.string().min(1),
    }),
  )
  .length(72)
  .parse(load(billingFile));
if (
  journal.planHash !== plan.planHash ||
  new Set(billing.map((b) => b.attempt)).size !== 72 ||
  new Set(billing.map((b) => b.responseId)).size !== 72
)
  throw new Error("Stale or duplicate native evidence");
journal.rows.forEach((row, i) => {
  const step = plan.schedule[i],
    bill = billing.find((b) => b.attempt === row.result.attempt);
  if (
    !step ||
    step.caseId !== row.caseId ||
    step.repeat !== row.repeat ||
    step.arm !== row.arm ||
    !bill ||
    bill.responseId !== row.result.responseId ||
    bill.usdUpper < bill.usdLower ||
    row.result.usage.cachedInput > row.result.usage.input
  )
    throw new Error("Changed schedule, billing or usage");
});
const summary = z
  .object({
    planHash: z.string(),
    observations: z.literal(72),
    runBilledUpperUsd: z.number(),
    accumulatedBilledUpperUsd: z.number(),
    priorUnknownHeldUsd: z.number(),
    ownerAccumulatedLimitUsd: z.number(),
  })
  .parse(load(summaryFile));
const billed = billing.reduce((n, b) => n + b.usdUpper, 0);
if (
  summary.planHash !== plan.planHash ||
  Math.abs(summary.runBilledUpperUsd - billed) > 1e-9 ||
  Math.abs(summary.accumulatedBilledUpperUsd - BENCHMARK_PRIOR_SPEND_UPPER_USD) > 1e-9 ||
  summary.priorUnknownHeldUsd !== BENCHMARK_PRIOR_HELD_USD ||
  summary.ownerAccumulatedLimitUsd !== BENCHMARK_PRIOR_LIMIT_USD
)
  throw new Error("Unreconciled accumulated authority");
const p95 = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
};
const arms = Object.fromEntries(
  (["baseline", "jev"] as const).map((arm) => {
    const rows = journal.rows.filter((r) => r.arm === arm);
    return [
      arm,
      {
        observations: rows.length,
        inputTokens: rows.reduce((n, r) => n + r.result.usage.input, 0),
        cachedInputTokens: rows.reduce((n, r) => n + r.result.usage.cachedInput, 0),
        outputTokens: rows.reduce((n, r) => n + r.result.usage.output, 0),
        clientP95Ms: p95(rows.map((r) => r.clientElapsedMs)),
        generatorP95Ms: p95(rows.map((r) => r.result.generatorElapsedMs)),
        selectorP95Ms: p95(rows.map((r) => r.result.selection.elapsed_ms)),
      },
    ];
  }),
);
const drift = plan.cases.map((c) => {
  const rows = journal.rows.filter((r) => r.caseId === c.id && r.arm === "jev");
  if (rows.length !== 3) throw new Error("Incomplete repetition");
  return {
    caseId: c.id,
    distinctForwardedSets: new Set(rows.map((r) => evidenceHash(r.result.forwardedSlugs))).size,
    forwarded: rows.map((r) => r.result.forwardedSlugs.length),
  };
});
// The benchmark UI awaits each response before starting the next scheduled observation.
// Intervening client durations alone are a conservative lower bound, excluding UI,
// reconciliation pauses and both endpoint observations; they cannot prove cache hits.
const selectionReuseIntervals = journal.rows.flatMap((row, index) => {
  if (row.arm !== "jev" || row.repeat === 0) return [];
  const prior = journal.rows.findIndex(
    (candidate) =>
      candidate.arm === "jev" &&
      candidate.caseId === row.caseId &&
      candidate.repeat === row.repeat - 1,
  );
  if (prior < 0 || prior >= index) throw new Error("Missing ordered previous repetition");
  return [
    {
      caseId: row.caseId,
      repeat: row.repeat,
      interveningClientElapsedLowerBoundMs: journal.rows
        .slice(prior + 1, index)
        .reduce((sum, observation) => sum + observation.clientElapsedMs, 0),
    },
  ];
});
if (selectionReuseIntervals.length !== 24) throw new Error("Incomplete repeated selection timing");
const available = BENCHMARK_USD_LIMIT - BENCHMARK_PRIOR_HELD_USD - BENCHMARK_PRIOR_SPEND_UPPER_USD;
if (available < 0) throw new Error("Accumulated authority already exceeded");
const report = {
  status: "offline_diagnosis_not_qualification",
  referencePlanHash: plan.planHash,
  inputHashes: {
    plan: evidenceHash(raw),
    journal: evidenceHash(load(journalFile)),
    billing: evidenceHash(load(billingFile)),
    summary: evidenceHash(load(summaryFile)),
  },
  arms,
  subsetDrift: drift,
  casesWithSubsetDrift: drift.filter((d) => d.distinctForwardedSets > 1).length,
  selectionCacheTiming: {
    scope: "Sequential observed-call lower bounds only; no future cache-hit or performance claim",
    legacyTtlMs: 300000,
    guaranteedLegacyExpirations: selectionReuseIntervals.filter(
      (r) => r.interveningClientElapsedLowerBoundMs >= 300000,
    ).length,
    candidateTtlMs: SELECTION_CACHE_TTL_MS,
    candidateSourceSha256: evidenceHash(
      readFileSync("src/lib/match/jev-selection-cache.server.ts", "utf8"),
    ),
    warmWorkerRequired: true,
    pausesAndEndpointObservationsExcluded: true,
    intervals: selectionReuseIntervals,
  },
  budget: {
    limitUsd: BENCHMARK_USD_LIMIT,
    priorBilledUpperUsd: BENCHMARK_PRIOR_SPEND_UPPER_USD,
    unknownHeldUsd: BENCHMARK_PRIOR_HELD_USD,
    availableUsd: available,
    referenceFullCohortBilledUpperUsd: billed,
    referenceOutputOnlyProviderUsd: generatorCost(
      0,
      0,
      journal.rows.reduce((n, r) => n + r.result.usage.output, 0),
    ),
    canAffordReferenceCohort: available >= billed,
    forecastIsNotGuaranteedFutureBilling: true,
  },
  newGeneratorObservations: 0,
  inferenceCalls: 0,
  publicationApproved: false,
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(
  JSON.stringify({
    status: report.status,
    casesWithSubsetDrift: report.casesWithSubsetDrift,
    availableUsd: available,
    referenceCohortUsd: billed,
    inferenceCalls: 0,
    publicationApproved: false,
  }),
);
process.exitCode = available >= billed ? 0 : 4;
