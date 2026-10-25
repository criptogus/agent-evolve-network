// Evidence-only reconciliation of one reviewed historical no-start guard.
// Never releases an unknown TypeSafe charge, changes a cap, infers or publishes.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import { evidenceHash } from "../src/lib/match/paired-evaluation.ts";
const args = process.argv.slice(2);
if (args.length !== 7 || args.some((arg) => !arg.trim()))
  throw new Error(
    "Usage: reconcile-match-no-generation.ts PLAN FAILED_JOURNAL NEXT_JOURNAL PREVIOUS_BILL NEXT_BILL NATIVE_UI NEW_REPORT",
  );
const [planFile, journalFile, nextFile, previousBillFile, nextBillFile, nativeFile, output] = args;
const load = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const rawPlan = z.record(z.string(), z.unknown()).parse(load(planFile));
const { planHash, ...payload } = rawPlan;
const plan = z
  .object({
    planHash: z.literal("d8de6867034bda9860dfcb48b6cdc2ecb5dd12afe828045e082f57dbca7b88e9"),
    sources: z.record(z.string(), z.string()),
  })
  .parse(rawPlan);
if (evidenceHash(payload) !== planHash) throw new Error("Changed original plan");
const reviewedCommit = "241a5ac5692dd6c1556047a3804ff5175c826b8d";
const reviewedGuard = "b2b41fb47a71afc1cef4f0adaaed95c5e037308b4b79ba47ea1ada84079b4fc6";
if (plan.sources["src/lib/match/benchmark.functions.ts"] !== reviewedGuard)
  throw new Error("Unreviewed no-start implementation");
for (const path of [
  "src/lib/match/benchmark.functions.ts",
  "src/lib/match/jev-agent-match.server.ts",
]) {
  const source = execFileSync("git", ["show", `${reviewedCommit}:${path}`], { encoding: "utf8" });
  if (evidenceHash(source) !== plan.sources[path]) throw new Error("Changed reviewed control flow");
}
const returned = z.object({
  attempt: z.string(),
  status: z.literal("returned"),
  generatorStarted: z.literal(true),
  responseId: z.string().min(1),
  usage: z.object({ input: z.number().int().positive(), output: z.number().int().positive() }),
});
const journal = z
  .object({
    planHash: z.string(),
    status: z.literal("stopped_unknown_usage"),
    inflight: z.object({ attempt: z.string() }),
    rows: z.array(z.object({ result: z.unknown() })).length(2),
  })
  .parse(load(journalFile));
const before = returned.parse(journal.rows[0].result);
const stopped = z
  .object({
    attempt: z.literal("d8de6867:nfe-pt:0:jev"),
    status: z.literal("unknown"),
    generatorStarted: z.literal(false),
    responseId: z.never().optional(),
    actualModel: z.never().optional(),
    usage: z.never().optional(),
    transportEvidence: z.never().optional(),
    error: z.literal(
      "TypeSafe usage incomplete; generator not started. Stop without automatic retry.",
    ),
    selection: z.object({ usage_complete: z.literal(false) }),
    reservation: z.object({ reserve: z.literal(0.251853) }),
  })
  .parse(journal.rows[1].result);
if (journal.planHash !== plan.planHash || journal.inflight.attempt !== stopped.attempt)
  throw new Error("Changed stopped attempt");
const next = z
  .object({ rows: z.array(z.object({ result: z.unknown() })).min(1) })
  .parse(load(nextFile));
const after = returned.parse(next.rows[0].result);
const bills = z
  .array(
    z.object({
      attempt: z.string(),
      responseId: z.string(),
      source: z.string(),
      usdLower: z.number().nonnegative(),
      usdUpper: z.number().nonnegative(),
    }),
  )
  .min(1);
const beforeBill = bills
  .parse(load(previousBillFile))
  .find((bill) => bill.attempt === before.attempt && bill.responseId === before.responseId);
const afterBill = bills
  .parse(load(nextBillFile))
  .find((bill) => bill.attempt === after.attempt && bill.responseId === after.responseId);
if (!beforeBill || !afterBill) throw new Error("Missing successful adjacent bills");
const counter = (source: string) => Number(source.match(/\bcount (\d+)\b/)?.[1]);
const beforeCounter = counter(beforeBill.source),
  afterCounter = counter(afterBill.source);
if (beforeCounter !== 482 || afterCounter !== beforeCounter + 1)
  throw new Error("Unknown native request gap");
const native = z
  .object({
    projectId: z.literal("b00a8021-9d8d-4f49-a581-628727b71f68"),
    totalRequests: z.number().int().positive(),
    pageFirstOrdinal: z.number().int().positive(),
    rows: z
      .array(
        z.object({
          counter: z.number().int(),
          tableRow: z.number().int().positive(),
          summary: z.string(),
        }),
      )
      .length(3),
  })
  .parse(load(nativeFile));
for (const [response, bill, count] of [
  [before, beforeBill, beforeCounter],
  [after, afterBill, afterCounter],
] as const) {
  const row = native.rows.find((row) => row.counter === count);
  const meter = row?.summary.match(
    /^chat_completionsopenai\/gpt-5\.2in ([\d.]+)·out ([\d.]+)·([\d,]+) credits·/,
  );
  if (
    !row ||
    !meter ||
    native.totalRequests - count + 1 !== native.pageFirstOrdinal + row.tableRow - 1
  )
    throw new Error("Changed native row identity");
  const credits = Number(meter[3].replace(",", "."));
  if (
    Number(meter[1].replaceAll(".", "")) !== response.usage.input ||
    Number(meter[2].replaceAll(".", "")) !== response.usage.output ||
    Math.abs(bill.usdLower - (credits - 0.005) * 0.25) > 1e-12 ||
    Math.abs(bill.usdUpper - (credits + 0.005) * 0.25) > 1e-12
  )
    throw new Error("Native usage or preserved billing mismatch");
}
const report = {
  status: "verified_no_lovable_generator_request",
  attempt: stopped.attempt,
  reviewedCommit,
  reviewedGuard,
  nativeCounters: [beforeCounter, afterCounter],
  generatorReservationNoLongerNeededUsd: stopped.reservation.reserve,
  retainedBaselineBillUpperUsd: beforeBill.usdUpper,
  retainedNextBillUpperUsd: afterBill.usdUpper,
  unknownTypeSafeUsageStillUnreconciled: true,
  ownerCapChangeUsd: 0,
  inferenceCalls: 0,
  qualification: false,
  published: false,
  inputHashes: Object.fromEntries(args.slice(0, 6).map((file) => [file, evidenceHash(load(file))])),
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(report));
