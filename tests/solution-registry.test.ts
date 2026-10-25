/** Synthetic binding fixtures only; no model qualification, SQL execution or publication. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { bindSolutionRegistry } from "../scripts/prepare-solution-registry.mjs";
function fixture() {
  const cases = JSON.parse(
    readFileSync("content/expansion/playbook-adversarial-cases.json", "utf8"),
  );
  const subjects = cases.subjects.map((s: { slug: string; cases: unknown[] }) => ({
    ...s,
    version: "0.0.99",
    artifact: { sha256: "b".repeat(64) },
  }));
  const plan = {
    subjects,
    protocol: "fixture-protocol-only",
    planHash: "fixture-plan",
    sourceHashes: Object.fromEntries(
      subjects.map((s: { slug: string }) => [`content/playbooks/${s.slug}.yaml`, "a".repeat(64)]),
    ),
  };
  const reports = subjects.map(
    (s: { slug: string; cases: Array<{ id: string; severity: string }> }) => ({
      slug: s.slug,
      version: "0.0.99",
      execution_protocol: "fixture-source-state",
      model: "typesafe/jev-1.14.0/fixture-source-state@node-fixture",
      source_sha256: "a".repeat(64),
      artifact_sha256: "b".repeat(64),
      total: 18,
      passed: 18,
      failed: 0,
      pass_rate: 1,
      severity_weighted_score: 1,
      eligible: true,
      outcomes: s.cases.map((c) => ({
        case_id: c.id,
        severity: c.severity,
        passed: true,
        judge: { choice: "pass" },
        inference_error: false,
        truncated: false,
      })),
    }),
  );
  const report = {
    reports,
    total: 72,
    planHash: plan.planHash,
    protocol: plan.protocol,
    generative_model_qualified: false,
    lovable_inference_calls: 0,
  };
  const registry = subjects.map((s: { slug: string }) => ({
    slug: s.slug,
    package_id: randomUUID(),
    version_id: randomUUID(),
    latest_version: "0.0.99",
    prompt_sha256: "a".repeat(64),
    archive_sha256: "b".repeat(64),
    is_published: false,
    review_status: "draft",
    author_id: null,
    author_handle: "super-agent-skill",
    price_credits: 0,
    source_ref: `github:criptogus/agent-evolve-network/content/${s.slug}`,
  }));
  return { plan, report, registry };
}
test("solution registry binding retains exact source/model/version and never grants publication", () => {
  const f = fixture(),
    targets = bindSolutionRegistry(f.plan, f.report, f.registry, {});
  assert.equal(targets.length, 4);
  for (const t of targets) {
    assert.equal(t.is_published, false);
    assert.equal(t.review_status, "draft");
    assert.equal(t.compatibility_key, `${t.model}/${f.plan.protocol}`);
    assert.equal(
      Object.values(t.by_severity).reduce(
        (n: number, b: unknown) => n + (b as { total: number }).total,
        0,
      ),
      18,
    );
  }
});
test("solution registry binding rejects partial/duplicate/stale/public/broad-model evidence", () => {
  const mutations = [
    (f: ReturnType<typeof fixture>) => {
      f.report.total = 71;
    },
    (f: ReturnType<typeof fixture>) => {
      f.registry[1] = f.registry[0];
    },
    (f: ReturnType<typeof fixture>) => {
      f.registry[0].latest_version = "0.0.98";
    },
    (f: ReturnType<typeof fixture>) => {
      f.registry[0].archive_sha256 = "c".repeat(64);
    },
    (f: ReturnType<typeof fixture>) => {
      f.registry[0].prompt_sha256 = "d".repeat(64);
    },
    (f: ReturnType<typeof fixture>) => {
      f.registry[0].is_published = true;
    },
    (f: ReturnType<typeof fixture>) => {
      f.report.reports[0].model = "any-model";
    },
    (f: ReturnType<typeof fixture>) => {
      f.report.reports[0].outcomes[0].truncated = true;
    },
    (f: ReturnType<typeof fixture>) => {
      f.report.reports[0].outcomes[0].passed = false;
    },
    (f: ReturnType<typeof fixture>) => {
      f.report.reports[0].outcomes[0].severity = "low";
    },
  ];
  for (const mutate of mutations) {
    const f = fixture();
    mutate(f);
    assert.throws(() => bindSolutionRegistry(f.plan, f.report, f.registry, {}));
  }
});
