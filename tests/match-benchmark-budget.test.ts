import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BENCHMARK_USD_LIMIT,
  BENCHMARK_RECONCILED_HISTORICAL_HELD_USD,
  BENCHMARK_V33_UNKNOWN_HELD_USD,
  BENCHMARK_V33_DIAGNOSTIC_HELD_USD,
  BENCHMARK_V34_RETAINED_ATTEMPT_USD,
  BENCHMARK_V36_NATIVE_SPEND_UPPER_USD,
  BENCHMARK_V37_NATIVE_SPEND_UPPER_USD,
  BENCHMARK_PRIOR_HELD_USD,
  BENCHMARK_PRIOR_SPEND_UPPER_USD,
  generatorCost,
  reserveGeneration,
  requireBenchmarkPreview,
  isClosedBenchmarkCohort,
  requireOpenBenchmarkCohort,
} from "../src/lib/match/benchmark-budget.ts";
test("benchmark metering rejects unknown/negative/cache inconsistencies", () => {
  assert.equal(generatorCost(1000000, 0, 0), 1.75);
  assert.equal(generatorCost(1000000, 1000000, 0), 0.175);
  assert.throws(() => generatorCost(2, 3, 0));
  assert.throws(() => generatorCost(NaN, 0, 1));
});
test("benchmark reserves output and byte bound before any paid call", () => {
  const result = reserveGeneration(
    "s",
    "p",
    "{}",
    BENCHMARK_USD_LIMIT - BENCHMARK_PRIOR_HELD_USD - BENCHMARK_PRIOR_SPEND_UPPER_USD,
  );
  assert.ok(result.reserve > 0);
  assert.throws(() => reserveGeneration("s", "p", "{}", result.reserve - 0.00001));
  assert.throws(() => reserveGeneration("s", "p", "{}", BENCHMARK_USD_LIMIT + 1));
});
test("benchmark is unavailable on production or spoofed suffix hostnames", () => {
  requireBenchmarkPreview(
    "https://preview--agent-evolve-network.lovable.app/admin/match-benchmark",
  );
  requireBenchmarkPreview(
    "https://id-preview--b00a8021-9d8d-4f49-a581-628727b71f68.lovable.app/admin/match-benchmark",
  );
  for (const url of [
    "https://superagentskill.com/admin/match-benchmark",
    "https://preview--agent-evolve-network.lovable.app.evil.example/",
    "https://agent-evolve-network.lovable.app/",
  ])
    assert.throws(() => requireBenchmarkPreview(url));
});

test("native reconciliation cannot reset spending or release unaccounted reservations", async () => {
  const { reconcileBenchmarkBudget, BENCHMARK_PRIOR_HELD_USD, BENCHMARK_PRIOR_SPEND_UPPER_USD } =
    await import("../src/lib/match/benchmark-budget.ts");
  for (const value of [
    { billedUsd: 0, billedObservations: 4, completed: 4, previousBilledUsd: 0 },
    { billedUsd: 0.2, billedObservations: 3, completed: 4, previousBilledUsd: 0.1 },
    { billedUsd: 0.1, billedObservations: 4, completed: 4, previousBilledUsd: 0.2 },
  ])
    assert.throws(() => reconcileBenchmarkBudget(value));
  assert.equal(
    reconcileBenchmarkBudget({
      billedUsd: 0.2,
      billedObservations: 4,
      completed: 4,
      previousBilledUsd: 0.1,
    }),
    BENCHMARK_USD_LIMIT - BENCHMARK_PRIOR_HELD_USD - BENCHMARK_PRIOR_SPEND_UPPER_USD - 0.2,
  );
});

test("caller cannot reset remaining authority to the full authorized ceiling after reconciled cohorts", () => {
  assert.throws(() => reserveGeneration("s", "p", "{}", BENCHMARK_USD_LIMIT));
});

test("a new cohort retains the rejected v29 and v30 native charges", () => {
  assert.equal(
    BENCHMARK_PRIOR_SPEND_UPPER_USD -
      BENCHMARK_V36_NATIVE_SPEND_UPPER_USD -
      BENCHMARK_V37_NATIVE_SPEND_UPPER_USD,
    7.07125,
  );
  const available =
    BENCHMARK_USD_LIMIT - BENCHMARK_PRIOR_HELD_USD - BENCHMARK_PRIOR_SPEND_UPPER_USD;
  assert.throws(() => reserveGeneration("s", "p", "{}", available + 0.00000001));
  assert.doesNotThrow(() => reserveGeneration("s", "p", "{}", available - 0.00000001));
});

test("a verified no-generator reservation releases only that hold while retaining native charges and the owner cap", () => {
  assert.equal(BENCHMARK_USD_LIMIT, 20);
  assert.equal(
    BENCHMARK_PRIOR_SPEND_UPPER_USD -
      BENCHMARK_V36_NATIVE_SPEND_UPPER_USD -
      BENCHMARK_V37_NATIVE_SPEND_UPPER_USD,
    7.07125,
  );
  assert.ok(Math.abs(BENCHMARK_RECONCILED_HISTORICAL_HELD_USD - 0.82931275) < 1e-12);
  assert.doesNotThrow(() => reserveGeneration("s", "p", "{}", 11.33514124));
});

test("rejected immutable cohorts cannot resume inference after a preview rebuild", () => {
  for (const prefix of ["11b307c9", "ecd633f7", "b42da394", "62b5c0b4", "2f979881", "04cf091b"]) {
    assert.equal(isClosedBenchmarkCohort(prefix + "0".repeat(56)), true);
    assert.throws(() => requireOpenBenchmarkCohort(`${prefix}:nfe-pt:1:jev`), /cohort is closed/);
  }
  // This helper is a terminal-cohort guard, not authorization for unknown plans.
  assert.equal(isClosedBenchmarkCohort("new-plan"), false);
});

test("v33 schema failure and finite diagnostic remain reserved across a new cohort", () => {
  assert.equal(BENCHMARK_V33_UNKNOWN_HELD_USD, 0.3246565);
  assert.equal(BENCHMARK_V33_DIAGNOSTIC_HELD_USD, 0.001);
  assert.equal(
    BENCHMARK_PRIOR_HELD_USD,
    BENCHMARK_RECONCILED_HISTORICAL_HELD_USD +
      BENCHMARK_V33_UNKNOWN_HELD_USD +
      BENCHMARK_V33_DIAGNOSTIC_HELD_USD +
      BENCHMARK_V34_RETAINED_ATTEMPT_USD,
  );
  assert.throws(() => reserveGeneration("s", "p", "{}", 12.09943724));
});

test("v34 client-delivery failure keeps its full first-attempt reservation", () => {
  assert.equal(BENCHMARK_V34_RETAINED_ATTEMPT_USD, 0.3286395);
  assert.throws(() => reserveGeneration("s", "p", "{}", 11.77378074));
});

test("v36 rejected quality result retains its actual native upper charge", () => {
  assert.equal(BENCHMARK_V36_NATIVE_SPEND_UPPER_USD, 0.03125);
  assert.equal(BENCHMARK_PRIOR_SPEND_UPPER_USD - BENCHMARK_V37_NATIVE_SPEND_UPPER_USD, 7.1025);
  assert.throws(() => reserveGeneration("s", "p", "{}", 11.44514124));
});

test("v37 failed primary quality result retains the new native charge without releasing holds", () => {
  assert.equal(BENCHMARK_V37_NATIVE_SPEND_UPPER_USD, 0.07875);
  assert.equal(BENCHMARK_PRIOR_SPEND_UPPER_USD, 7.18125);
  assert.throws(() => reserveGeneration("s", "p", "{}", 11.41389124));
});
