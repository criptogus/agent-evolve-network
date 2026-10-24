import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("publication verifier rejects an empty cohort before public API requests", () => {
  const dir = mkdtempSync(join(tmpdir(), "sas-empty-publication-"));
  try {
    const model = JSON.parse(readFileSync("content/expansion/model-profile.json", "utf8")).model;
    const prepare = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/eval-business-adversarial.mjs",
        "prepare",
        model,
        "--prompt-protocol",
        "redact-route-generate-v1",
        "--workdir",
        dir,
      ],
      { encoding: "utf8" },
    );
    assert.equal(prepare.status, 0, prepare.stdout + prepare.stderr);
    writeFileSync(join(dir, "registry.json"), "[]");
    const output = join(dir, "result.json");
    const run = spawnSync(
      process.execPath,
      ["scripts/check-business-publication.mjs", dir, "https://not-contacted.invalid", output],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Exactly 21 unique immutable registry bindings required/);
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publication verifier preserves existing reports instead of overwriting evidence", () => {
  const dir = mkdtempSync(join(tmpdir(), "sas-preserved-publication-"));
  try {
    const output = join(dir, "result.json");
    writeFileSync(output, "original failed evidence");
    const run = spawnSync(
      process.execPath,
      ["scripts/check-business-publication.mjs", dir, "https://not-contacted.invalid", output],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 1);
    assert.match(run.stderr, /NEW_REPORT_JSON/);
    assert.equal(readFileSync(output, "utf8"), "original failed evidence");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
