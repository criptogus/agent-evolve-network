import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { check, resolveConfig } from "prettier";

test("version generator produces lint-compatible TypeScript and consistent release metadata", async () => {
  const root = resolve(import.meta.dirname, "..");
  mkdirSync(resolve(root, "artifacts/validation"), { recursive: true });
  const fixture = mkdtempSync(resolve(root, "artifacts/validation/bump-fixture-"));
  const run = (command: string, args: string[]) => {
    const result = spawnSync(command, args, { cwd: fixture, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout;
  };
  try {
    mkdirSync(resolve(fixture, "scripts"));
    mkdirSync(resolve(fixture, "src/lib"), { recursive: true });
    for (const file of [
      "scripts/bump-version.ts",
      "src/lib/version.ts",
      "package.json",
      "package-lock.json",
      "CHANGELOG.md",
      ".prettierrc",
    ])
      copyFileSync(resolve(root, file), resolve(fixture, file));
    run("git", ["init", "-q"]);
    run("git", ["config", "user.name", "Release fixture"]);
    run("git", ["config", "user.email", "fixture@example.test"]);
    run("git", ["add", "."]);
    run("git", ["commit", "-qm", "fixture baseline"]);
    const current = JSON.parse(readFileSync(resolve(fixture, "package.json"), "utf8")).version;
    run("git", ["tag", `v${current}`]);
    writeFileSync(resolve(fixture, "fixture.txt"), "Release validation fixture\n");
    run("git", ["add", "fixture.txt"]);
    run("git", ["commit", "-qm", "fix: preserve typed release contract"]);
    const output = run(process.execPath, ["--experimental-strip-types", "scripts/bump-version.ts"]);
    assert.ok(output.includes("Bumped"));
    const sourcePath = resolve(fixture, "src/lib/version.ts");
    const source = readFileSync(sourcePath, "utf8");
    assert.equal(
      await check(source, { ...(await resolveConfig(sourcePath)), filepath: sourcePath }),
      true,
    );
    const next = current.split(".").map(Number);
    next[2]++;
    const version = next.join(".");
    assert.equal(
      JSON.parse(readFileSync(resolve(fixture, "package.json"), "utf8")).version,
      version,
    );
    const lock = JSON.parse(readFileSync(resolve(fixture, "package-lock.json"), "utf8"));
    assert.equal(lock.version, version);
    assert.equal(lock.packages[""].version, version);
    assert.ok(source.includes(`PLATFORM_VERSION = "${version}"`));
    assert.ok(source.includes("preserve typed release contract"));
    assert.ok(readFileSync(resolve(fixture, "CHANGELOG.md"), "utf8").includes(`## [${version}]`));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
