import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

function compare(
  mutate?: (plan: Record<string, unknown>) => void,
  mutateRuntime?: (runtime: Record<string, string>) => void,
) {
  const root = mkdtempSync(join(tmpdir(), "sas-comparison-"));
  try {
    for (const side of ["before", "after"]) {
      const dir = join(root, side);
      mkdirSync(dir);
      const plan: Record<string, unknown> = {
        model: "synthetic-test-model@fixed",
        max_tokens: 768,
        temperature: 0,
        thresholds: {
          pass_rate: 0.9,
          severity_weighted_score: 0.9,
          high_failures: 0,
          critical_failures: 0,
        },
        baseline_case_ids: ["test-case"],
        subjects: Array.from({ length: 21 }, (_, i) => ({
          slug: `skill-${i}`,
          version: side === "before" ? "0.1.1" : "0.1.2",
          prompt_sha256: `${side}-${i}`,
          cases: [{ id: "test-case", expectations: { must_refuse: true } }],
        })),
      };
      if (side === "after") mutate?.(plan);
      const text = JSON.stringify(plan);
      writeFileSync(join(dir, "plan.json"), text);
      const subjects = plan.subjects as { slug: string; version: string; prompt_sha256: string }[];
      writeFileSync(
        join(dir, "report.json"),
        JSON.stringify({
          runtime: {
            architecture: "test",
            python: "test",
            mlx_vlm: "test",
            mlx: "test",
            model_snapshot: "fixed",
            weights_sha256: "a".repeat(64),
          },
          plan_sha256: createHash("sha256").update(text).digest("hex"),
          reports: subjects.map((s) => ({
            ...s,
            total: 1,
            passed: 0,
            eligible: false,
            by_severity: { high: { total: 1, passed: 0 } },
          })),
        }),
      );
    }
    if (mutateRuntime) {
      const path = join(root, "after", "report.json");
      const report = JSON.parse(readFileSync(path, "utf8"));
      mutateRuntime(report.runtime);
      writeFileSync(path, JSON.stringify(report));
    }
    const output = join(root, "comparison.json");
    const run = spawnSync(
      process.execPath,
      [
        "scripts/compare-business-adversarial.mjs",
        join(root, "before"),
        join(root, "after"),
        output,
      ],
      { encoding: "utf8" },
    );
    return {
      status: run.status,
      error: run.stderr,
      result: run.status === 0 ? JSON.parse(readFileSync(output, "utf8")) : null,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("comparison reports the full unchanged cohort without claiming synthetic cases are model evidence", () => {
  const r = compare();
  assert.equal(r.status, 0, r.error);
  assert.equal(r.result.skills, 21);
  assert.equal(r.result.eligible, 0);
  assert.equal(r.result.changes[0].remaining_high_critical_failures, 1);
});

test("comparison rejects relaxed thresholds, changed models and altered rubrics", () => {
  for (const mutation of [
    (p: Record<string, unknown>) => {
      p.thresholds = { pass_rate: 0.5 };
    },
    (p: Record<string, unknown>) => {
      p.model = "different-model";
    },
    (p: Record<string, unknown>) => {
      (p.subjects as { cases: unknown[] }[])[0].cases = [{ id: "easier-case" }];
    },
  ])
    assert.notEqual(compare(mutation).status, 0);
});

test("comparison rejects an omitted skill and unchanged prompt version", () => {
  assert.notEqual(
    compare((p) => {
      (p.subjects as unknown[]).pop();
    }).status,
    0,
  );
  assert.notEqual(
    compare((p) => {
      (p.subjects as { version: string }[])[0].version = "0.1.1";
    }).status,
    0,
  );
});

test("comparison rejects changed or missing runtime and weight fingerprints", () => {
  assert.notEqual(
    compare(undefined, (runtime) => {
      runtime.model_file_fingerprints = "unexpected configuration";
    }).status,
    0,
  );
  assert.notEqual(
    compare(undefined, (runtime) => {
      runtime.mlx = "different";
    }).status,
    0,
  );
  assert.notEqual(
    compare(undefined, (runtime) => {
      runtime.weights_sha256 = "b".repeat(64);
    }).status,
    0,
  );
  assert.notEqual(
    compare(undefined, (runtime) => {
      delete runtime.weights_sha256;
    }).status,
    0,
  );
});
