// USD provider-equivalent metering; billed credits must be reconciled separately.
import { MATCH_GENERATOR_MODEL, MATCH_MAX_OUTPUT_TOKENS } from "./match-generation.ts";
export const BENCHMARK_MODEL = MATCH_GENERATOR_MODEL;
export const BENCHMARK_OUTPUT_LIMIT = MATCH_MAX_OUTPUT_TOKENS;
export const BENCHMARK_USD_LIMIT = 7;
// Hold the original client error, v8 Jev reservation, v15 schema error and interrupted v16 attempt; never reset the owner cap.
export const BENCHMARK_PRIOR_HELD_USD = 1.08116575;
// Prior native AI checkpoints displayed 0.24 credits (RPC delivery failed)
// and 0.26 credits (completed baseline with a primary quality failure).
// Forty-nine successful native billing checkpoints total 9.89 displayed credits; upper bound (9.89 + 49*0.005) * USD 0.25.
export const BENCHMARK_PRIOR_SPEND_UPPER_USD = 2.53375;
export function generatorCost(input: number, cached: number, output: number) {
  if (![input, cached, output].every((n) => Number.isSafeInteger(n) && n >= 0) || cached > input)
    throw new Error("Missing or invalid usage");
  return ((input - cached) * 1.75 + cached * 0.175 + output * 14) / 1e6;
}
export function reserveGeneration(
  system: string,
  prompt: string,
  schema: string,
  remaining: number,
) {
  // Byte upper bound plus framing allowance; no average chars/token assumption.
  const inputUpperBound = new TextEncoder().encode(system + prompt + schema).length + 4096;
  const reserve = generatorCost(inputUpperBound, 0, BENCHMARK_OUTPUT_LIMIT);
  if (!Number.isFinite(remaining) || remaining < reserve || remaining > BENCHMARK_USD_LIMIT)
    throw new Error("Insufficient authorized budget");
  return { inputUpperBound, reserve };
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
