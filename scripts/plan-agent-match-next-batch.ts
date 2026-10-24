// Deterministic spending plan only: never calls models, grades quality or publishes.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { evidenceHash } from "../src/lib/match/paired-evaluation.ts";
import { buildMatchPrompt, buildMatchWireSchema } from "../src/lib/match/match-contract.ts";
import {
  BENCHMARK_USD_LIMIT,
  reconcileBenchmarkBudget,
  reserveGeneration,
} from "../src/lib/match/benchmark-budget.ts";
const args = process.argv.slice(2);
if (args.length !== 4 || args.some((a) => !a.trim()))
  throw new Error("Usage: plan-agent-match-next-batch.ts PLAN JOURNAL NATIVE_BILLING NEW_REPORT");
const [planFile, journalFile, billingFile, output] = args.map((a) => resolve(a));
if (existsSync(output)) throw new Error("Existing report; refusing overwrite or no-op success");
const load = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const raw = z.record(z.string(), z.unknown()).parse(load(planFile));
const { planHash, ...payload } = raw;
if (evidenceHash(payload) !== planHash) throw new Error("Changed frozen plan");
const step = z.object({
  caseId: z.string(),
  repeat: z.number().int().min(0).max(2),
  arm: z.enum(["baseline", "jev"]),
});
const plan = z
  .object({
    planHash: z.string(),
    sources: z.record(z.string(), z.string()),
    catalog: z
      .array(
        z.object({
          slug: z.string(),
          name: z.string(),
          type: z.enum(["skill", "playbook", "soul", "guardrail"]),
          description: z.string(),
        }),
      )
      .length(665),
    cases: z.array(z.object({ id: z.string(), brief: z.string() })).length(12),
    desired: z.object({
      skills: z.number(),
      playbooks: z.number(),
      souls: z.number(),
      guardrails: z.number(),
    }),
    schedule: z.array(step).length(72),
  })
  .parse(raw);
for (const [path, hash] of Object.entries(plan.sources))
  if (evidenceHash(readFileSync(path, "utf8")) !== hash)
    throw new Error(`Changed runtime source: ${path}`);
const journal = z
  .object({
    planHash: z.string(),
    status: z.enum(["billing_checkpoint", "completed"]),
    inflight: z.null(),
    reconciledBilledUsd: z.number().nonnegative(),
    rows: z
      .array(
        step.extend({
          result: z.object({
            attempt: z.string(),
            responseId: z.string(),
            status: z.literal("returned"),
            reservation: z.object({
              inputUpperBound: z.number().int().positive(),
              reserve: z.number().positive(),
            }),
          }),
        }),
      )
      .max(72),
  })
  .parse(load(journalFile));
if (journal.planHash !== plan.planHash) throw new Error("Changed journal plan");
const billing = z
  .array(
    z.object({
      attempt: z.string(),
      responseId: z.string(),
      source: z.string().min(1),
      usdLower: z.number().finite().nonnegative(),
      usdUpper: z.number().finite().nonnegative(),
    }),
  )
  .parse(load(billingFile));
if (
  billing.length !== journal.rows.length ||
  new Set(billing.map((b) => b.attempt)).size !== billing.length
)
  throw new Error("Reconcile every observation exactly once");
const reservations = new Map<string, { inputUpperBound: number; reserve: number }>();
const wire = JSON.stringify(await buildMatchWireSchema(plan.catalog, plan.desired).jsonSchema);
for (const c of plan.cases) {
  const p = buildMatchPrompt({
    brief: c.brief,
    candidates: plan.catalog,
    catalogSize: plan.catalog.length,
    desired: plan.desired,
  });
  reservations.set(c.id, reserveGeneration(p.system, p.prompt, wire, BENCHMARK_USD_LIMIT));
}
for (let i = 0; i < journal.rows.length; i++) {
  const row = journal.rows[i],
    expected = plan.schedule[i],
    bill = billing.find((b) => b.attempt === row.result.attempt),
    reserve = reservations.get(row.caseId);
  if (
    !expected ||
    expected.caseId !== row.caseId ||
    expected.repeat !== row.repeat ||
    expected.arm !== row.arm ||
    !bill ||
    bill.responseId !== row.result.responseId ||
    bill.usdUpper < bill.usdLower
  )
    throw new Error("Stale schedule or native billing binding");
  if (
    !reserve ||
    reserve.inputUpperBound !== row.result.reservation.inputUpperBound ||
    reserve.reserve !== row.result.reservation.reserve
  )
    throw new Error("Native reservation differs from frozen local calculation");
}
const billedUsd = billing.reduce((n, b) => n + b.usdUpper, 0);
const remaining = reconcileBenchmarkBudget({
  billedUsd,
  billedObservations: billing.length,
  completed: journal.rows.length,
  previousBilledUsd: journal.reconciledBilledUsd,
});
let afterReservations = remaining;
const next = [];
for (const s of plan.schedule.slice(journal.rows.length, journal.rows.length + 4)) {
  const reserve = reservations.get(s.caseId);
  if (!reserve) throw new Error("Missing frozen case reservation");
  if (afterReservations < reserve.reserve) break;
  afterReservations -= reserve.reserve;
  next.push({ ...s, ...reserve });
}
const report = {
  status: next.length
    ? "budget_plan_only"
    : journal.rows.length === 72
      ? "cohort_complete_no_next_batch"
      : "budget_blocked",
  planHash: plan.planHash,
  completed: journal.rows.length,
  billedUpperUsd: billedUsd,
  remainingUsd: remaining,
  maximumObservations: next.length,
  heldAfterNextBatchUsd: remaining - afterReservations,
  remainingAfterReservationsUsd: afterReservations,
  next,
  qualityApprovalEvaluated: false,
  inferenceCalls: 0,
  inputs: { planFile, journalFile, billingFile },
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(
  JSON.stringify({
    status: report.status,
    completed: report.completed,
    maximumObservations: next.length,
    remainingUsd: remaining,
    inferenceCalls: 0,
  }),
);
process.exitCode = next.length ? 0 : 4;
