// Evidence adapter only. Primary reviews and native billing must be supplied;
// this command never creates approval verdicts, calls a model or publishes.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { z } from "zod";
import { MatchSchema } from "../src/lib/match/match-contract.ts";
import {
  evaluatePaired,
  evidenceHash,
  PAIRED_CRITERIA,
  type PairedObservation,
} from "../src/lib/match/paired-evaluation.ts";
const [planFile, journalFile, reviewFile, billingFile, reportFile] = process.argv.slice(2);
if (
  !planFile ||
  !journalFile ||
  !reviewFile ||
  !billingFile ||
  !reportFile ||
  existsSync(reportFile)
)
  throw new Error(
    "Usage: evaluate-agent-match-comparison.ts PLAN JOURNAL PRIMARY_REVIEWS NATIVE_BILLING NEW_REPORT",
  );
const load = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const plan = z
  .object({
    planHash: z.string(),
    criteria: z.unknown(),
    cases: z.array(z.object({ id: z.string(), required: z.array(z.string()) })).length(12),
    sources: z.record(z.string(), z.string()),
  })
  .parse(load(planFile));
if (evidenceHash(plan.criteria) !== evidenceHash(PAIRED_CRITERIA))
  throw new Error("Changed approval criteria");
const number = z.number().finite().nonnegative();
const rowSchema = z.object({
  caseId: z.string(),
  repeat: z.number().int().min(0).max(2),
  arm: z.enum(["baseline", "jev"]),
  clientElapsedMs: z.number().positive().optional(),
  result: z.object({
    attempt: z.string(),
    status: z.string(),
    actualModel: z.string().optional(),
    responseId: z.string().optional(),
    raw: z.string().optional(),
    clean: MatchSchema.nullable().optional(),
    finishReason: z.string().optional(),
    usage: z
      .object({
        input: number.nullable(),
        cachedInput: number.nullable(),
        output: number.nullable(),
      })
      .optional(),
    providerEquivalentUsd: number.nullable().optional(),
    elapsedMs: number,
    selection: z
      .object({
        model: z.string().nullable(),
        mode: z.enum(["off", "shadow", "filter"]),
        usage_complete: z.boolean(),
        cache: z
          .object({
            status: z.enum(["hit", "miss"]),
            age_ms: number,
            source_input_tokens: number,
            source_output_tokens: number,
            source_requests: number,
            source_hash: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .optional(),
        requests: number,
        input_tokens: number,
        output_tokens: number,
      })
      .optional(),
  }),
});
const journal = z
  .object({
    planHash: z.string(),
    status: z.string(),
    inflight: z.unknown().nullable(),
    rows: z.array(rowSchema).max(72),
  })
  .parse(load(journalFile));
if (journal.planHash !== plan.planHash) throw new Error("Changed execution plan");
const reviews = z
  .array(
    z.object({
      outputHash: z.string(),
      dimensions: z.object({
        task_fit: z.boolean(),
        grounded_roles: z.boolean(),
        honest_gaps: z.boolean(),
        scope_and_safety: z.boolean(),
        language: z.boolean(),
        catalog_support: z.boolean(),
      }),
      highOrCritical: z.number().int().nonnegative(),
      evidence: z.string().min(1),
    }),
  )
  .parse(load(reviewFile));
const billing = z
  .array(
    z.object({
      attempt: z.string(),
      responseId: z.string(),
      source: z.string().min(1),
      usdLower: number,
      usdUpper: number,
    }),
  )
  .parse(load(billingFile));
if (new Set(billing.map((b) => b.attempt)).size !== billing.length)
  throw new Error("Duplicate billing evidence");
const observations: PairedObservation[] = [];
const missing: string[] = [];
const rawPlan = z.record(z.string(), z.unknown()).parse(load(planFile));
const { planHash: declaredHash, ...planPayload } = rawPlan;
if (evidenceHash(planPayload) !== declaredHash) throw new Error("Invalid frozen plan hash");
for (const [path, hash] of Object.entries(plan.sources)) {
  if (
    (path !== "scripts/evaluate-agent-match-comparison.ts" &&
      !/^(src\/[\w./-]+\.(?:ts|tsx)|package(?:-lock)?\.json)$/.test(path)) ||
    path.split("/").includes("..")
  )
    throw new Error("Invalid source path");
  if (!existsSync(path) || evidenceHash(readFileSync(path, "utf8")) !== hash)
    missing.push(`stale_source:${path}`);
}

const selectorSources = new Set<string>();
for (const row of journal.rows) {
  const r = row.result;
  const billed = billing.find((b) => b.attempt === r.attempt && b.responseId === r.responseId);
  if (billed && billed.usdLower > billed.usdUpper) throw new Error("Invalid billing interval");
  const required = plan.cases.find((c) => c.id === row.caseId)?.required ?? [];
  if (r.clean) {
    const slugs = Object.values(r.clean.recommended_kit)
      .flat()
      .map((item) => item.slug);
    for (const slug of required)
      if (!slugs.includes(slug)) missing.push(`required_slug_missing:${r.attempt}:${slug}`);
  }
  const usage = r.usage;
  const trace = r.selection;
  if (trace && row.arm === "jev") {
    const cached = trace.cache;
    const source = cached ? `${row.caseId}:${cached.source_hash}` : "";
    if (cached?.status === "miss") {
      if (
        trace.model !== "jev-1.14.0" ||
        trace.mode !== "filter" ||
        !trace.usage_complete ||
        !trace.requests ||
        cached.age_ms !== 0 ||
        cached.source_requests !== trace.requests ||
        cached.source_input_tokens !== trace.input_tokens ||
        cached.source_output_tokens !== trace.output_tokens
      )
        missing.push(`invalid_selector_cache_source:${r.attempt}`);
      else selectorSources.add(source);
    }
    if (cached?.status === "hit") {
      if (
        !selectorSources.has(source) ||
        cached.age_ms >= 300000 ||
        trace.requests !== 0 ||
        trace.input_tokens !== 0 ||
        trace.output_tokens !== 0 ||
        !cached.source_requests
      )
        missing.push(`unverified_selector_cache_hit:${r.attempt}`);
    } else if (trace.requests === 0) missing.push(`selector_usage_without_source:${r.attempt}`);
  }
  const usageComplete =
    !!usage &&
    Object.values(usage).every((v) => v !== null) &&
    !!trace &&
    trace.usage_complete &&
    !!billed;
  if (!billed) missing.push(`native_billing:${r.attempt}`);
  if (!trace) missing.push(`managed_selection:${r.attempt}`);
  if (trace && row.arm === "baseline" && (trace.requests !== 0 || trace.input_tokens !== 0))
    missing.push(`baseline_jev_call:${r.attempt}`);
  if (trace && row.arm === "jev" && (trace.model !== "jev-1.14.0" || trace.mode !== "filter"))
    missing.push(`unqualified_selector:${r.attempt}`);
  if (!row.clientElapsedMs) missing.push(`client_elapsed_missing:${r.attempt}`);
  if (!r.actualModel || !/^(?:openai\/)?gpt-5\.2(?:-|$)/.test(r.actualModel))
    missing.push(`generator_identity:${r.attempt}`);
  observations.push({
    caseId: row.caseId,
    repeat: row.repeat,
    arm: row.arm,
    model: r.actualModel ?? "unknown",
    outputHash: evidenceHash({ raw: r.raw ?? null, clean: r.clean ?? null }),
    complete: r.status === "returned" && r.finishReason === "stop" && !!r.clean,
    usageComplete,
    generatorCostUsd: billed ? (row.arm === "baseline" ? billed.usdLower : billed.usdUpper) : 0,
    jevCostUsd: trace ? (trace.input_tokens * 0.042) / 1e6 : 0,
    elapsedMs: row.clientElapsedMs ?? r.elapsedMs,
  });
}
const decision = evaluatePaired(
  plan.cases.map((c) => c.id),
  observations,
  reviews,
);
const reasons = [...decision.reasons, ...missing];
if (journal.status !== "completed" || journal.inflight !== null)
  reasons.push("journal_not_completed");
const costKnown = (arm: "baseline" | "jev") =>
  observations.some((r) => r.arm === arm) &&
  observations.filter((r) => r.arm === arm).every((r) => r.usageComplete);
const report = {
  ...decision,
  approved: decision.approved && reasons.length === 0,
  baseline: {
    ...decision.baseline,
    totalCostUsd: costKnown("baseline") ? decision.baseline.totalCostUsd : null,
  },
  jev: { ...decision.jev, totalCostUsd: costKnown("jev") ? decision.jev.totalCostUsd : null },
  reasons: [...new Set(reasons)],
  scope:
    "Paired managed-backend comparison; conservative native billing intervals, primary reviews required",
  planHash: plan.planHash,
  inputHashes: {
    plan: evidenceHash(load(planFile)),
    journal: evidenceHash(load(journalFile)),
    reviews: evidenceHash(load(reviewFile)),
    billing: evidenceHash(load(billingFile)),
  },
  observations: observations.map((row) => ({
    ...row,
    generatorCostUsd: missing.includes(
      `native_billing:${journal.rows.find((r) => r.caseId === row.caseId && r.repeat === row.repeat && r.arm === row.arm)?.result.attempt}`,
    )
      ? null
      : row.generatorCostUsd,
  })),
};
writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(
  JSON.stringify({
    approved: report.approved,
    observations: observations.length,
    reasons: report.reasons,
    baseline: report.baseline,
    jev: report.jev,
  }),
);
if (!report.approved) process.exitCode = 4;
