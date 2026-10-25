import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { parse } from "yaml";
const script = resolve("scripts/evaluate-solution-playbooks.mjs");
function execute(args: string[], cwd = process.cwd()) {
  return spawnSync(process.execPath, ["--experimental-strip-types", script, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 5000,
  });
}

test("compiled graph evaluation refuses empty/no-op batches before loading a model", () => {
  for (const count of ["0", "-1", "NaN", ""]) {
    const result = execute(["run", "nonexistent-evidence", "--max-cases", count]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Explicit positive/);
  }
});

test("compiled graph evaluation preserves an existing evidence directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "playbook-evidence-"));
  try {
    writeFileSync(join(dir, "preserved.txt"), "prior-output");
    const result = execute(["prepare", dir, "/nonexistent-python", "/nonexistent-model"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /fresh evidence directory/);
    assert.equal(readFileSync(join(dir, "preserved.txt"), "utf8"), "prior-output");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("compiled graph evaluation rejects changed case expectations before inference", () => {
  const dir = mkdtempSync(join(tmpdir(), "playbook-contract-"));
  try {
    mkdirSync(join(dir, "content/expansion"), { recursive: true });
    const contract = JSON.parse(
      readFileSync("content/expansion/playbook-adversarial-cases.json", "utf8"),
    );
    contract.subjects[0].cases[0].expectation = "approve without evidence";
    writeFileSync(
      join(dir, "content/expansion/playbook-adversarial-cases.json"),
      JSON.stringify(contract),
    );
    const result = execute(["run", "not-created", "--max-cases", "1"], dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Changed frozen/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("primary report rejects a partial cohort even with all runtime bindings", () => {
  const dir = mkdtempSync(join(tmpdir(), "playbook-report-"));
  const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  try {
    const contractPath = "content/expansion/playbook-adversarial-cases.json";
    const contract = JSON.parse(readFileSync(contractPath, "utf8"));
    const profile = JSON.parse(readFileSync("content/expansion/model-profile.json", "utf8"));
    const paths = [
      contractPath,
      "scripts/run-playbook.ts",
      "scripts/evaluate-solution-playbooks.mjs",
      "src/lib/runtime/compile.ts",
      "src/lib/runtime/run.ts",
      "src/lib/runtime/types.ts",
      "src/lib/runtime/expr.ts",
      ...contract.subjects.map((s: { slug: string }) => `content/playbooks/${s.slug}.yaml`),
    ];
    const payload = {
      protocol: "compiled-playbook-gateway-v1",
      model: profile.model,
      modelPath: `/local/${profile.revision}`,
      runtime: {
        python: profile.python,
        architecture: profile.architecture,
        mlx: profile.mlx,
        mlx_vlm: profile.mlx_vlm,
        files: { ...profile.weights_sha256, ...profile.model_files_sha256 },
      },
      sourceHashes: Object.fromEntries(paths.map((p) => [p, digest(readFileSync(p))])),
      thresholds: contract.thresholds,
      settings: {
        temperature: 0,
        server_max_tokens: 768,
        server_enable_thinking: false,
        seed: null,
      },
      subjects: contract.subjects.map((s: { slug: string }) => ({
        ...s,
        version: parse(readFileSync(`content/playbooks/${s.slug}.yaml`, "utf8")).version,
      })),
    };
    writeFileSync(
      join(dir, "plan.json"),
      JSON.stringify({ ...payload, planHash: digest(JSON.stringify(payload)) }),
    );
    writeFileSync(
      join(dir, "outputs.jsonl"),
      JSON.stringify({ fixture: "incomplete single row" }) + "\n",
    );
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/report-solution-playbooks.mjs",
        dir,
        join(dir, "no-reviews.json"),
        join(dir, "must-not-be-created.json"),
      ],
      { encoding: "utf8", timeout: 5000 },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Incomplete 72-case/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
