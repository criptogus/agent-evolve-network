import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { inspectSolutionEvaluation } from "../scripts/inspect-solution-evaluation.mjs";
function fixture(run: (dir: string, planHash: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "solution-inspect-"));
  const plan = {
    subjects: Array.from({ length: 4 }, (_, s) => ({
      slug: `s${s}`,
      version: "1.0.0",
      artifact: { sha256: `archive${s}` },
      cases: Array.from({ length: 18 }, (_, c) => ({ id: `s${s}:${c}` })),
    })),
  };
  const planHash = createHash("sha256").update(JSON.stringify(plan)).digest("hex");
  writeFileSync(join(dir, "plan.json"), JSON.stringify({ ...plan, planHash }));
  try {
    run(dir, planHash);
  } finally {
    rmSync(dir, { recursive: true });
  }
}
test("progress inspection rejects empty preparation instead of approving a no-op", () =>
  fixture((dir) => {
    assert.throws(() => inspectSolutionEvaluation(dir), /No execution evidence/);
  }));
test("inflight records are diagnostics, never proof of liveness or qualification", () =>
  fixture((dir, planHash) => {
    writeFileSync(
      join(dir, "attempts.jsonl"),
      JSON.stringify({ event: "step_started", case_id: "s0:0", planHash }) + "\n",
    );
    const report = inspectSolutionEvaluation(dir);
    assert.equal(report.steps.inflight_or_unaccounted, 1);
    assert.equal(report.recorded_cases, 0);
    assert.equal(report.pending_cases, 72);
    assert.equal(report.publicationApproved, false);
    assert.equal(report.shutdown_observed, false);
  }));
test("progress inspection preserves unknown work and rejects substituted evidence", () =>
  fixture((dir, planHash) => {
    writeFileSync(
      join(dir, "attempts.jsonl"),
      [
        { event: "step_started", case_id: "s0:0", planHash },
        { event: "step_unknown", case_id: "s0:0", planHash },
      ]
        .map((r) => JSON.stringify(r))
        .join("\n"),
    );
    assert.equal(inspectSolutionEvaluation(dir).steps.unknown, 1);
    writeFileSync(
      join(dir, "outputs.jsonl"),
      JSON.stringify({
        case_id: "s0:0",
        slug: "s0",
        version: "1.0.0",
        package_sha256: "forged",
        planHash,
        exitCode: 0,
        stdout: "{}",
      }),
    );
    assert.throws(() => inspectSolutionEvaluation(dir), /substituted/);
  }));

test("cancelled CLI output remains an error rather than empty success", () =>
  fixture((dir, planHash) => {
    writeFileSync(
      join(dir, "outputs.jsonl"),
      JSON.stringify({
        case_id: "s0:0",
        slug: "s0",
        version: "1.0.0",
        package_sha256: "archive0",
        planHash,
        exitCode: null,
        signal: "SIGTERM",
        stdout: "",
      }),
    );
    const report = inspectSolutionEvaluation(dir);
    assert.equal(report.error_cases, 1);
    assert.equal(report.cases[0].graph_status, "no_result");
    assert.equal(report.publicationApproved, false);
  }));
