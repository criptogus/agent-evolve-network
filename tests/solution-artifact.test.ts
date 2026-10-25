import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";
import { SOLUTIONS } from "../src/lib/solutions/catalog.ts";
import {
  buildSolutionPlaybookFiles,
  verifySolutionPlaybookSnapshot,
} from "../scripts/solution-artifact-files.ts";
import { verifyArtifact } from "../src/lib/plugins/artifacts.ts";

const observations: Array<{
  slug: string;
  passed: boolean;
  files?: number;
  steps?: number;
  error?: string;
}> = [];
after(() => {
  mkdirSync("artifacts/validation", { recursive: true });
  writeFileSync(
    "artifacts/validation/solution-artifacts.json",
    JSON.stringify(
      {
        expected: 4,
        executed: observations.length,
        passed: observations.filter((o) => o.passed).length,
        failed: observations.filter((o) => !o.passed).length,
        model_calls: 0,
        production_writes: 0,
        qualification: false,
        observations,
      },
      null,
      2,
    ),
  );
});

test("all four standalone archives execute their actual CLI outside the repository", async (t) => {
  assert.equal(SOLUTIONS.length, 4, "Empty or narrowed solution batches cannot pass");
  for (const s of SOLUTIONS)
    await t.test(s.id, () => {
      const slug = `solution-${s.id}`;
      const temp = mkdtempSync(join(tmpdir(), "sas solution #archive-"));
      try {
        const source = readFileSync(`content/playbooks/${slug}.yaml`, "utf8");
        const artifact = buildSolutionPlaybookFiles(source);
        const files = verifyArtifact(artifact.files, artifact.sha256);
        assert.equal(buildSolutionPlaybookFiles(source).sha256, artifact.sha256);
        assert.ok(Object.keys(files).length > 10);
        assert.ok(
          !Object.keys(files).some(
            (p) => p.includes("node_modules") || p.includes("artifacts/") || p.includes(".env"),
          ),
        );
        for (const [path, body] of Object.entries(files)) {
          const target = join(temp, path);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, body);
        }
        const root = join(temp, "skills", slug);
        assert.ok(!root.startsWith(process.cwd()));
        const install = spawnSync(
          "npm",
          ["ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"],
          { cwd: root, encoding: "utf8", timeout: 30000 },
        );
        assert.equal(install.status, 0, install.stderr);
        const run = spawnSync(
          process.execPath,
          [
            "--experimental-strip-types",
            "scripts/run-playbook.ts",
            "--playbook",
            slug,
            "--inputs",
            JSON.stringify({
              source_1: "PACKAGED_SOURCE_1",
              source_2: "PACKAGED_SOURCE_2",
              source_3: "PACKAGED_SOURCE_3",
            }),
          ],
          { cwd: root, encoding: "utf8", timeout: 10000 },
        );
        assert.equal(run.status, 0, run.stderr);
        const result = JSON.parse(run.stdout);
        assert.equal(result.status, "ok");
        assert.equal(result.version, artifact.version);
        assert.equal(result.step_outcomes.length, parse(source).steps.length);
        assert.ok(
          result.step_outcomes.every((step: { output: string }) =>
            step.output.startsWith(
              ["solution-monthly-finance-close", "solution-supplier-selection"].includes(slug)
                ? "[mock-tool]"
                : "[mock-llm]",
            ),
          ),
          "Transport fixtures never qualify model outputs",
        );
        const denied = spawnSync(
          process.execPath,
          [
            "--experimental-strip-types",
            "scripts/run-playbook.ts",
            "--playbook",
            slug,
            "--gateway",
          ],
          {
            cwd: root,
            encoding: "utf8",
            timeout: 10000,
            env: {
              ...process.env,
              AI_GATEWAY_BASE_URL: "",
              AI_GATEWAY_MODEL: "",
              LOCAL_MODEL_PYTHON: "",
              TYPESAFE_API_KEY: "synthetic-never-transmitted",
            },
          },
        );
        assert.equal(denied.status, 2);
        assert.match(denied.stderr, /Packaged local model\/runtime contract rejected/);
        assert.equal(denied.stdout, "");
        observations.push({
          slug,
          passed: true,
          files: Object.keys(files).length,
          steps: result.step_outcomes.length,
        });
      } catch (error) {
        observations.push({
          slug,
          passed: false,
          error: error instanceof Error ? error.message : "unknown",
        });
        throw error;
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
    });
});

test("solution archives reject changed source versions and unknown package targets", () => {
  const source = readFileSync("content/playbooks/solution-monthly-finance-close.yaml", "utf8");
  assert.throws(
    () => buildSolutionPlaybookFiles(source.replace(/version: \d+\.\d+\.\d+/, "version: 9.9.9")),
    /Stale or substituted/,
  );
  assert.throws(
    () =>
      buildSolutionPlaybookFiles(
        source.replace("slug: solution-monthly-finance-close", "slug: arbitrary-package"),
      ),
    /Unknown solution/,
  );
});

test("package verification rejects modified runtime and falsified archive bindings", () => {
  const temp = mkdtempSync(join(tmpdir(), "sas-solution-tamper-"));
  try {
    const source = readFileSync("content/playbooks/solution-monthly-finance-close.yaml", "utf8");
    const archive = buildSolutionPlaybookFiles(source);
    const binding = {
      sha256: archive.sha256,
      fileHashes: Object.fromEntries(
        Object.entries(archive.files).map(([p, b]) => [
          p,
          createHash("sha256").update(b).digest("hex"),
        ]),
      ),
    };
    for (const [path, body] of Object.entries(archive.files)) {
      const target = join(temp, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body);
    }
    assert.equal(verifySolutionPlaybookSnapshot(source, binding, temp).sha256, archive.sha256);
    assert.throws(
      () => verifySolutionPlaybookSnapshot(source, { ...binding, sha256: "0".repeat(64) }, temp),
      /Changed package artifact binding/,
    );
    writeFileSync(
      join(temp, "skills/solution-monthly-finance-close/scripts/run-playbook.ts"),
      "throw new Error('altered runtime');",
    );
    assert.throws(
      () => verifySolutionPlaybookSnapshot(source, binding, temp),
      /Changed packaged runtime snapshot/,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
