import test from "node:test";
import assert from "node:assert/strict";
import { publicCompatibility } from "../src/lib/plugins/public-compatibility.server.ts";
function fixture() {
  const binding = {
    packageId: "pkg-current",
    versionId: "ver-current",
    version: "0.1.31",
    promptSha256: "source-current",
    archiveSha256: "archive-current",
  };
  const provenance = {
    prompt_sha256: binding.promptSha256,
    archive_sha256: binding.archiveSha256,
    prompt_protocol: "exact-packaged-protocol",
  };
  const run = {
    package_id: binding.packageId,
    version_id: binding.versionId,
    model: "actual-pinned-model@exact-runtime",
    total: 2,
    passed: 2,
    failed: 0,
    pass_rate: 1,
    severity_weighted_score: 1,
    by_severity: { high: { total: 1, passed: 1 }, critical: { total: 1, passed: 1 } },
    outcomes: [
      {
        case_id: "original-domain",
        severity: "high",
        passed: true,
        judge: { choice: "pass" },
        provenance: { ...provenance },
      },
      {
        case_id: "original-attack",
        severity: "critical",
        passed: true,
        judge: { choice: "pass" },
        provenance: { ...provenance },
      },
    ],
  };
  const records = [
    {
      package_id: binding.packageId,
      version: binding.version,
      model: `${run.model}/${provenance.prompt_protocol}`,
      status: "pass",
      total_cases: 2,
      passed_cases: 2,
      pass_rate: 1,
    },
  ];
  return { binding, run, records };
}
test("public API compatibility exposes only the current source/archive-bound passing runtime", () => {
  const f = fixture(),
    result = publicCompatibility([], f.records, f.run, f.binding);
  assert.equal(result.length, 1);
  assert.equal(result[0].status, "supported");
  assert.equal(result[0].runtime, f.records[0].model);
  const scoped = publicCompatibility(
    [{ runtime: "unqualified-other-model", status: "supported" }],
    f.records,
    f.run,
    f.binding,
  );
  assert.equal(scoped.filter((c) => c.status === "supported").length, 1);
  assert.equal(scoped.find((c) => c.runtime === "unqualified-other-model")?.status, "unsupported");
});
test("foreign versions, stale archives, unreviewed output and inconsistent severity/count/score cannot add public compatibility", () => {
  const mutations = [
    (f: ReturnType<typeof fixture>) => {
      f.records[0].version = "old-version";
    },
    (f: ReturnType<typeof fixture>) => {
      f.run.version_id = "other-version";
    },
    (f: ReturnType<typeof fixture>) => {
      f.records[0].package_id = "other-package";
    },
    (f: ReturnType<typeof fixture>) => {
      f.binding.archiveSha256 = "substituted-archive";
    },
    (f: ReturnType<typeof fixture>) => {
      f.binding.promptSha256 = "substituted-source";
    },
    (f: ReturnType<typeof fixture>) => {
      f.records[0].model = "other-model";
    },
    (f: ReturnType<typeof fixture>) => {
      f.run.outcomes[0].judge.choice = "fail";
    },
    (f: ReturnType<typeof fixture>) => {
      f.run.outcomes[0].passed = false;
    },
    (f: ReturnType<typeof fixture>) => {
      f.run.outcomes[0].provenance.prompt_protocol = "other-protocol";
    },
    (f: ReturnType<typeof fixture>) => {
      f.run.outcomes[1].case_id = f.run.outcomes[0].case_id;
    },
    (f: ReturnType<typeof fixture>) => {
      f.run.by_severity.high.total = 2;
    },
    (f: ReturnType<typeof fixture>) => {
      f.run.severity_weighted_score = 0.95;
    },
    (f: ReturnType<typeof fixture>) => {
      f.records[0].passed_cases = 1;
    },
  ];
  for (const mutate of mutations) {
    const f = fixture();
    mutate(f);
    assert.deepEqual(publicCompatibility([], f.records, f.run, f.binding), []);
  }
  const f = fixture();
  assert.deepEqual(publicCompatibility([], [], f.run, f.binding), []);
  assert.deepEqual(publicCompatibility([], f.records, null, f.binding), []);
});
