import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  ArtifactFilesSchema,
  artifactDigest,
  verifyArtifact,
} from "../src/lib/plugins/artifacts.ts";
import { readPluginZip, pluginToDraft } from "../src/lib/plugins/upload.server.ts";
import { runPluginConformance } from "../src/lib/plugins/conformance.ts";
import { SOLUTIONS, planSolution } from "../src/lib/solutions/catalog.ts";
import { compareEvidence } from "../src/lib/evidence/compare.ts";
import { PROJECT_TYPES, projectFitScore } from "../src/lib/marketplace/project-profile.ts";

test("complete bundle integrity includes scripts, fixtures and every skill", async () => {
  const files = {
    "plugin.json": JSON.stringify({
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      name: "fixture-plugin",
      version: "1.0.0",
      description: "Two useful skills with complete source files",
      license: "MIT",
    }),
    "skills/first/SKILL.md":
      "---\nname: first\ndescription: Use when reviewing supplied source records and reporting exceptions.\n---\n\n# First\nValidate supplied inputs, cite each source and report unresolved exceptions without taking external action. Keep a source inventory, verify the reporting period and preserve each unresolved exception with an owner and next action. Never infer successful execution from a valid input contract.\n",
    "skills/second/SKILL.md":
      "---\nname: second\ndescription: Use when normalizing supplied records into a structured report.\n---\n\n# Second\nPreserve original values and source references; stop on missing evidence and report the remaining work. Retain a source inventory, verify the reporting period, check arithmetic against supplied values and distinguish observed facts from assumptions before delivering the final structured report.\n",
    "skills/first/scripts/check.py": "print('fixture')\n",
    "skills/first/references/schema.json": '{"type":"object"}\n',
  };
  const zip = new JSZip();
  for (const [p, c] of Object.entries(files)) zip.file(p, c);
  const decoded = await readPluginZip(await zip.generateAsync({ type: "base64" }));
  assert.deepEqual(Object.fromEntries(decoded), files);
  const digest = artifactDigest(files);
  assert.equal(artifactDigest(Object.fromEntries(Object.entries(files).reverse())), digest);
  assert.deepEqual(verifyArtifact(files, digest), files);
  assert.throws(() =>
    verifyArtifact({ ...files, "skills/first/scripts/check.py": "changed" }, digest),
  );
  const report = runPluginConformance(decoded);
  assert.equal(
    report.conformant,
    true,
    JSON.stringify(report.checks.filter((c) => c.status === "fail")),
  );
  assert.equal(report.skills.length, 2);
  assert.equal(pluginToDraft(decoded, report).slug, "fixture-plugin");
});
test("bundle rejects traversal, absolute paths, VCS metadata and oversize inputs", async () => {
  for (const path of [
    "../secret",
    "/absolute",
    "C:/secret",
    "a\\b",
    "a/./b",
    "a//b",
    "a\u0000b",
    ".git/config",
    ".env",
    "node_modules/run.js",
  ]) {
    assert.equal(ArtifactFilesSchema.safeParse({ [path]: "x" }).success, false, path);
  }
  assert.equal(ArtifactFilesSchema.safeParse({}).success, false);
  assert.equal(ArtifactFilesSchema.safeParse({ "large.txt": "x".repeat(250001) }).success, false);
  const zip = new JSZip();
  zip.file("../escape.md", "unsafe");
  const bytes = await zip.generateAsync({ type: "base64" });
  await assert.rejects(() => readPluginZip(bytes));
});
test("solution dependencies are ordered, budgets enforced and cycles rejected", () => {
  for (const s of SOLUTIONS) {
    const plan = planSolution(s, 20);
    assert.equal(plan.within_budget, true);
    const seen = new Set<string>();
    for (const step of plan.steps) {
      assert.ok(step.depends_on.every((d) => seen.has(d)));
      seen.add(step.id);
    }
    assert.equal(new Set(plan.packages).size, plan.packages.length);
  }
  assert.equal(planSolution(SOLUTIONS[0], 1).within_budget, false);
  assert.throws(
    () =>
      planSolution(
        { ...SOLUTIONS[0], steps: [{ id: "a", title: "a", deliverable: "a", depends_on: ["b"] }] },
        4,
      ),
    /Missing dependency/,
  );
  assert.throws(
    () =>
      planSolution(
        { ...SOLUTIONS[0], steps: [{ id: "a", title: "a", deliverable: "a", depends_on: ["a"] }] },
        4,
      ),
    /cycle/,
  );
});
test("evidence never pools different models, versions or experiments; unknown outcomes stay out", () => {
  const row = {
    arm: "control",
    version: "1.0.0",
    model: "m1",
    experiment_key: "test",
    executions: 20,
    measured: 10,
    completed: 5,
    avg_latency_ms: 100,
    total_tokens: 1000,
  };
  const groups = compareEvidence([
    row,
    { ...row, arm: "treatment", completed: 8 },
    { ...row, model: "m2" },
    { ...row, version: "2.0.0" },
  ]);
  assert.equal(groups.length, 3);
  assert.ok(Math.abs(groups[0].completion_delta_pp! - 30) < 0.00001);
  assert.equal(groups[1].comparable, false);
  assert.equal(groups[2].comparable, false);
  assert.ok(groups[0].control_interval!.low < 0.5 && groups[0].control_interval!.high > 0.5);
  assert.equal(
    compareEvidence([
      { ...row, experiment_key: null },
      { ...row, experiment_key: null, arm: "treatment" },
    ])[0].comparable,
    false,
  );
  assert.equal(compareEvidence([{ ...row, measured: 0, completed: 0 }])[0].control_interval, null);
  assert.throws(() => compareEvidence([{ ...row, completed: 11 }]));
  assert.throws(() => compareEvidence([row, row]), /Duplicate/);
});
test("business profiles cover six new domains with a meaningful fit signal", () => {
  for (const value of [
    "brazil_ops",
    "agent_security",
    "procurement",
    "industrial_ops",
    "corporate_knowledge",
    "game_dev",
  ]) {
    assert.ok(PROJECT_TYPES.some((t) => t.value === value));
  }
  assert.ok(
    projectFitScore(
      { name: "Supplier bid comparison", description: "Procurement supplier sourcing" },
      "procurement",
    ) > projectFitScore({ name: "React UI", description: "Frontend components" }, "procurement"),
  );
});

// Curation is an advisory screen: unrelated workflows remain separate and no mutation is returned.
import { findCatalogOverlap } from "../src/lib/marketplace/catalog-curation.ts";
test("catalog overlap reports provenance and license differences without merging", () => {
  const p = {
    slug: "first",
    name: "Source linked procurement report",
    description: "Compare supplier bids against delivery scope and buyer requirements",
    type: "skill",
    license: "MIT",
    author_handle: "one",
  };
  const pairs = findCatalogOverlap([
    p,
    { ...p, slug: "second", license: "Apache-2.0", author_handle: "two" },
    {
      ...p,
      slug: "game",
      name: "Frame profiler",
      description: "Compute frame time percentiles from engine captures",
    },
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].exact_name, true);
  assert.equal(pairs[0].same_license, false);
  assert.equal(pairs[0].same_author, false);
});

import { rankRecommended } from "../src/lib/marketplace/recommend.ts";
test("business relevance beats unrelated popularity while preserving the trust filter", () => {
  const base = { type: "skill", vertical: null, rating_count: 1, rating_avg: 5, trust_score: 0.8 };
  const ranked = rankRecommended(
    [
      {
        ...base,
        slug: "web",
        name: "React web app",
        description: "Build a website",
        install_count: 999999,
      },
      {
        ...base,
        slug: "pix",
        name: "Pix reconciliation",
        description: "Brazil operations payment reconciliation",
        install_count: 1,
      },
      {
        ...base,
        slug: "bad",
        name: "Pix reconciler",
        description: "Brazil finance",
        install_count: 99999,
        trust_score: 0.1,
      },
    ],
    6,
    "brazil_ops",
  );
  assert.equal(ranked[0].slug, "pix");
  assert.equal(
    ranked.some((p) => p.slug === "bad"),
    false,
  );
});

import { bindManifestVersion } from "../src/lib/plugins/artifacts.ts";
test("optional source manifest version uses the reviewed registry version without rewriting source", () => {
  const source = { name: "portable-skill" };
  assert.deepEqual(bindManifestVersion(source, "0.1.0"), {
    name: "portable-skill",
    version: "0.1.0",
  });
  assert.deepEqual(source, { name: "portable-skill" });
  assert.throws(
    () => bindManifestVersion({ version: "2.0.0" }, "0.1.0"),
    /reviewed registry version/,
  );
});
