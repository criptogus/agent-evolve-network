import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generatorCost,
  reserveGeneration,
  requireBenchmarkPreview,
} from "../src/lib/match/benchmark-budget.ts";
test("benchmark metering rejects unknown/negative/cache inconsistencies", () => {
  assert.equal(generatorCost(1000000, 0, 0), 1.75);
  assert.equal(generatorCost(1000000, 1000000, 0), 0.175);
  assert.throws(() => generatorCost(2, 3, 0));
  assert.throws(() => generatorCost(NaN, 0, 1));
});
test("benchmark reserves output and byte bound before any paid call", () => {
  const result = reserveGeneration("s", "p", "{}", 5);
  assert.ok(result.reserve > 0);
  assert.throws(() => reserveGeneration("s", "p", "{}", result.reserve - 0.00001));
  assert.throws(() => reserveGeneration("s", "p", "{}", 6));
});
test("benchmark is unavailable on production or spoofed suffix hostnames", () => {
  requireBenchmarkPreview(
    "https://preview--agent-evolve-network.lovable.app/admin/match-benchmark",
  );
  for (const url of [
    "https://superagentskill.com/admin/match-benchmark",
    "https://preview--agent-evolve-network.lovable.app.evil.example/",
    "https://agent-evolve-network.lovable.app/",
  ])
    assert.throws(() => requireBenchmarkPreview(url));
});
