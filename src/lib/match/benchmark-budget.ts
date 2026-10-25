// USD provider-equivalent metering; billed credits must be reconciled separately.
import { MATCH_GENERATOR_MODEL, MATCH_MAX_OUTPUT_TOKENS } from "./match-generation.ts";
export const BENCHMARK_MODEL = MATCH_GENERATOR_MODEL;
export const BENCHMARK_OUTPUT_LIMIT = MATCH_MAX_OUTPUT_TOKENS;
// Owner explicitly raised the accumulated ceiling from USD10 to USD20 on 2026-10-25.
export const BENCHMARK_PRIOR_LIMIT_USD = 7;
export const BENCHMARK_PREVIOUS_AUTHORIZED_LIMIT_USD = 10;
export const BENCHMARK_USD_LIMIT = 20;
// Preserve historical ledgers unchanged. The v8 no-start branch is now proven
// against frozen code and contiguous native counters482/483 with exact usage.
// Only its generator reservation is reconciled; unknown TypeSafe usage remains
// unknown, and the client/schema/interrupt holds remain reserved.
export const BENCHMARK_HISTORICAL_HELD_USD = 1.08116575;
export const BENCHMARK_VERIFIED_NO_START_HOLD_USD = 0.251853;
export const BENCHMARK_PRIOR_HELD_USD =
  BENCHMARK_HISTORICAL_HELD_USD - BENCHMARK_VERIFIED_NO_START_HOLD_USD;
// Prior checkpoints and complete v26 total US$5.48125 upper; the rejected v29
// four-request prefix adds US$0.205 and the rejected v30 44-request prefix
// adds US$1.385 native upper. Rejection never refunds inference. Holds stay intact.
export const BENCHMARK_POST_REFERENCE_SPEND_UPPER_USD = 0.205 + 1.385;
export const BENCHMARK_PRIOR_SPEND_UPPER_USD = 5.48125 + BENCHMARK_POST_REFERENCE_SPEND_UPPER_USD;
// These immutable cohorts terminated with high failures. Rebuilding the preview
// cannot reopen them or make a changed-source continuation valid.
const CLOSED_COHORT_PREFIXES = new Set(["11b307c9", "ecd633f7"]);
export function isClosedBenchmarkCohort(attemptOrPlanHash: string) {
  return CLOSED_COHORT_PREFIXES.has(attemptOrPlanHash.slice(0, 8));
}
export function requireOpenBenchmarkCohort(attempt: string) {
  if (isClosedBenchmarkCohort(attempt))
    throw new Error("Rejected cohort is closed; prepare a new frozen comparison before inference");
}
export function generatorCost(input: number, cached: number, output: number) {
  if (![input, cached, output].every((n) => Number.isSafeInteger(n) && n >= 0) || cached > input)
    throw new Error("Missing or invalid usage");
  return ((input - cached) * 1.75 + cached * 0.175 + output * 14) / 1e6;
}
export function generationReservation(system: string, prompt: string, schema: string) {
  // Pure estimate, never authority: no average chars/token assumption.
  const inputUpperBound = new TextEncoder().encode(system + prompt + schema).length + 4096;
  return { inputUpperBound, reserve: generatorCost(inputUpperBound, 0, BENCHMARK_OUTPUT_LIMIT) };
}
export function reserveGeneration(
  system: string,
  prompt: string,
  schema: string,
  remaining: number,
) {
  const reservation = generationReservation(system, prompt, schema);
  const available =
    BENCHMARK_USD_LIMIT - BENCHMARK_PRIOR_HELD_USD - BENCHMARK_PRIOR_SPEND_UPPER_USD;
  if (!Number.isFinite(remaining) || remaining < reservation.reserve || remaining > available)
    throw new Error("Insufficient authorized budget");
  return reservation;
}
export function requireBenchmarkPreview(url: string) {
  if (
    ![
      "preview--agent-evolve-network.lovable.app",
      "id-preview--b00a8021-9d8d-4f49-a581-628727b71f68.lovable.app",
    ].includes(new URL(url).hostname)
  )
    throw new Error("Benchmark is restricted to the managed preview");
}

export function reconcileBenchmarkBudget(input: {
  billedUsd: number;
  billedObservations: number;
  completed: number;
  previousBilledUsd: number;
}) {
  if (
    !Number.isFinite(input.billedUsd) ||
    input.billedUsd < input.previousBilledUsd ||
    input.billedUsd < 0 ||
    !Number.isSafeInteger(input.billedObservations) ||
    input.billedObservations !== input.completed ||
    (input.completed > 0 && input.billedUsd === 0)
  )
    throw new Error("Reconcile every completed observation with native billing before continuing");
  const remaining =
    BENCHMARK_USD_LIMIT -
    BENCHMARK_PRIOR_HELD_USD -
    BENCHMARK_PRIOR_SPEND_UPPER_USD -
    input.billedUsd;
  if (remaining < 0) throw new Error("Authorized budget exceeded");
  return remaining;
}
