import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

test("business source imports exclude local request/output files from published archives", () => {
  const directory = mkdtempSync(join(tmpdir(), "business-archive-"));
  const extra = "skills/br-pix-reconciler/references/local-output.json";
  const marker = "PRIVATE_LOCAL_RESULT_83627";
  try {
    writeFileSync(extra, JSON.stringify({ output: marker }), { flag: "wx" });
    const sql = join(directory, "source.sql");
    const run = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/sync-content-to-registry.ts",
        "--slugs",
        "br-pix-reconciler",
        "--sql-output",
        sql,
        "--new-version",
      ],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const body = readFileSync(sql, "utf8");
    assert.doesNotMatch(body, new RegExp(marker));
    assert.match(body, /scripts\/local_runtime.py/);
    assert.match(body, /references\/model-profile.json/);
  } finally {
    rmSync(extra, { force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});
