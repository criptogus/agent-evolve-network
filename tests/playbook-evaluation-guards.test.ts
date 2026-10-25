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
      "content/expansion/playbook-model-profiles.json",
      "content/expansion/playbook-local-contract.json",
      "scripts/run-playbook.ts",
      "scripts/evaluate-solution-playbooks.mjs",
      "scripts/playbook-evaluation-proxy.mjs",
      "scripts/playbook-cli-result.mjs",
      "scripts/report-solution-playbooks.mjs",
      "scripts/adversarial-approval.mjs",
      "src/lib/adversarial/scorer.ts",
      "scripts/solution-artifact-files.ts",
      "src/lib/solutions/catalog.ts",
      "src/lib/plugins/agent-plugins.ts",
      "src/lib/plugins/artifacts.ts",
      "src/lib/plugins/conformance.ts",
      "src/lib/json.ts",
      "src/lib/errors.ts",
      "package-lock.json",
      "LICENSE",
      "src/lib/runtime/compile.ts",
      "src/lib/runtime/run.ts",
      "src/lib/runtime/types.ts",
      "src/lib/runtime/expr.ts",
      "src/lib/runtime/gateway-messages.ts",
      "src/lib/runtime/local-model-contract.ts",
      "src/lib/runtime/finance-source-facts.ts",
      "src/lib/runtime/finance-stages.ts",
      "src/lib/runtime/finance-source-facts.server.ts",
      "src/lib/runtime/supplier-source-facts.ts",
      "src/lib/runtime/supplier-source-facts.server.ts",
      "src/lib/runtime/supplier-stages.ts",
      "src/lib/runtime/security-source-facts.ts",
      "src/lib/runtime/security-source-facts.server.ts",
      "src/lib/runtime/security-stages.ts",
      "src/lib/runtime/workflow-source-context.ts",
      "src/lib/runtime/workflow-source-context.server.ts",
      "src/lib/adversarial/leak-scanner.ts",
      ...contract.subjects.map((s: { slug: string }) => `content/playbooks/${s.slug}.yaml`),
    ];
    const payload = {
      protocol: "compiled-playbook-gateway-v24-record-focused-amounts",
      model: profile.model,
      workflow_interpreter: { model: "jev-1.14.0", protocol: "quarantine-source-notes-v1" },
      security_host: {
        execution: "security-source-state-v1",
        model: "jev-1.14.0",
        node: "24.22.0",
        architecture: "arm64",
      },
      supplier_host: {
        execution: "supplier-source-state-v1",
        model: "jev-1.14.0",
        node: "24.22.0",
        architecture: "arm64",
      },
      finance_host: {
        execution: "finance-source-state-v2",
        model: "jev-1.14.0",
        node: "24.22.0",
        architecture: "arm64",
      },
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

test("compiled graph evaluation rejects an unlisted model before runtime execution", () => {
  const dir = mkdtempSync(join(tmpdir(), "playbook-model-"));
  try {
    const result = execute([
      "prepare",
      join(dir, "new-evidence"),
      "/nonexistent-python",
      "/local/unlisted-revision",
    ]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cached exact model revision/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("compiled graph evaluation rejects extra model weights even with a listed revision", () => {
  const dir = mkdtempSync(join(tmpdir(), "playbook-weights-"));
  try {
    const profile = JSON.parse(
      readFileSync("content/expansion/playbook-model-profiles.json", "utf8"),
    )[0];
    const modelPath = join(dir, profile.revision);
    mkdirSync(modelPath);
    for (const name of [...Object.keys(profile.weights_sha256), "alien.safetensors"])
      writeFileSync(join(modelPath, name), "fixture-not-a-model");
    const result = execute([
      "prepare",
      join(dir, "new-evidence"),
      "/nonexistent-python",
      modelPath,
    ]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Changed model weight file set/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("existing owner stop request rejects evaluation before starting a model or replaying work", () => {
  const dir = mkdtempSync(join(tmpdir(), "playbook-stopped-"));
  try {
    writeFileSync(join(dir, "STOP-AFTER-CURRENT-CASE"), "primary review requires correction");
    const result = execute(["run", dir, "--max-cases", "72"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Existing stop request/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
