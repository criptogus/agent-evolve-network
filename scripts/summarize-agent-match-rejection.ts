// Offline terminal receipt. Does not grade, infer, release holds or publish.
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { evidenceHash } from "../src/lib/match/paired-evaluation.ts";

const args = process.argv.slice(2);
if (args.length !== 6 || args.some((arg) => !arg.trim()))
  throw new Error(
    "Usage: summarize-agent-match-rejection.ts PLAN JOURNAL REVIEWS BILLING REJECTED_REPORT NEW_SUMMARY",
  );
const [planFile, journalFile, reviewsFile, billingFile, reportFile, output] = args;
const load = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const amount = z.number().finite().nonnegative();
const planRaw = load(planFile);
const plan = z
  .object({ planHash: z.string(), schedule: z.array(z.unknown()).length(72) })
  .parse(planRaw);
const journalRaw = load(journalFile);
const journal = z
  .object({
    planHash: z.string(),
    inflight: z.null(),
    limitUsd: amount,
    priorHeldUsd: amount,
    priorSpendUpperUsd: amount,
    rows: z
      .array(z.object({ result: z.object({ attempt: z.string(), responseId: z.string() }) }))
      .min(1)
      .max(72),
  })
  .parse(journalRaw);
const billingRaw = load(billingFile);
const billing = z
  .array(
    z.object({
      attempt: z.string(),
      responseId: z.string(),
      usdLower: amount,
      usdUpper: amount,
      source: z.string().min(1),
    }),
  )
  .min(1)
  .parse(billingRaw);
const reviewsRaw = load(reviewsFile);
const reviews = z
  .array(
    z.object({
      outputHash: z.string(),
      dimensions: z.record(z.string(), z.boolean()),
      highOrCritical: z.number().int().nonnegative(),
    }),
  )
  .min(1)
  .parse(reviewsRaw);
const report = z
  .object({
    approved: z.literal(false),
    reasons: z.array(z.string()).min(1),
    planHash: z.string(),
    inputHashes: z.object({
      plan: z.string(),
      journal: z.string(),
      reviews: z.string(),
      billing: z.string(),
    }),
    baseline: z.unknown(),
    jev: z.unknown(),
    observations: z.array(z.object({ outputHash: z.string() })).min(1),
  })
  .parse(load(reportFile));
const count = journal.rows.length;
if (
  journal.planHash !== plan.planHash ||
  report.planHash !== plan.planHash ||
  Object.entries({
    plan: planRaw,
    journal: journalRaw,
    reviews: reviewsRaw,
    billing: billingRaw,
  }).some(
    ([key, value]) =>
      report.inputHashes[key as keyof typeof report.inputHashes] !== evidenceHash(value),
  ) ||
  billing.length !== count ||
  reviews.length !== count ||
  report.observations.length !== count ||
  new Set(billing.map((bill) => bill.attempt)).size !== count ||
  new Set(billing.map((bill) => bill.responseId)).size !== count ||
  new Set(reviews.map((review) => review.outputHash)).size !== count ||
  report.observations.some(
    (row) => !reviews.some((review) => review.outputHash === row.outputHash),
  ) ||
  journal.rows.some(
    ({ result }) =>
      !billing.some(
        (bill) => bill.attempt === result.attempt && bill.responseId === result.responseId,
      ),
  ) ||
  billing.some((bill) => bill.usdLower > bill.usdUpper)
)
  throw new Error("Stale, incomplete or duplicate rejection evidence");
const roundUpper = billing.reduce((sum, bill) => sum + bill.usdUpper, 0);
const billedUpper = journal.priorSpendUpperUsd + roundUpper;
const committedUpper = billedUpper + journal.priorHeldUsd;
if (committedUpper > journal.limitUsd) throw new Error("Cumulative authorization exceeded");
const summary = {
  status: "rejected_not_published",
  planHash: plan.planHash,
  completed: count,
  required: 72,
  primaryFailed: reviews.filter(
    (review) => review.highOrCritical > 0 || Object.values(review.dimensions).some((v) => !v),
  ).length,
  reasons: report.reasons,
  baseline: report.baseline,
  jev: report.jev,
  roundNativeUpperUsd: roundUpper,
  cumulativeNativeUpperUsd: billedUpper,
  unknownHeldUsd: journal.priorHeldUsd,
  committedUpperUsd: committedUpper,
  ownerLimitUsd: journal.limitUsd,
  availableUsd: journal.limitUsd - committedUpper,
  inputHashes: report.inputHashes,
  reportHash: evidenceHash(load(reportFile)),
  inferenceCalls: 0,
  published: false,
  automaticRetry: false,
};
writeFileSync(output, JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(summary));
process.exitCode = 4; // Receipt succeeded; qualification remains rejected.
