import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const checks = [
  "test:all",
  "check:types",
  "check:dependencies",
  "build",
  "lint",
  "validate:content",
  "check:skills-mirror",
  "check:agent-plugin",
];
if (process.argv.includes("--security")) checks.push("check:security");
if (process.argv.includes("--ui")) checks.push("test:ui");
if (process.argv.slice(2).some((arg) => !["--security", "--ui"].includes(arg)))
  throw new Error("Unknown option");
const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
if (!checks.length || checks.some((check) => !scripts[check]))
  throw new Error("Incomplete check batch");
mkdirSync("artifacts/validation", { recursive: true });
const results = [];
for (const check of checks) {
  const run = spawnSync("npm", ["run", check], { encoding: "utf8", timeout: 240000 });
  const log = `artifacts/validation/${check.replaceAll(":", "-")}.log`;
  writeFileSync(log, (run.stdout ?? "") + (run.stderr ?? "") + (run.error?.message ?? ""));
  results.push({ check, code: run.status ?? 2, log });
  console.log(`${check}: ${run.status === 0 ? "PASS" : "FAIL"} (${log})`);
}
const failed = results.filter((result) => result.code !== 0).length;
writeFileSync(
  "artifacts/validation/results.json",
  JSON.stringify({ results, passed: results.length - failed, failed }, null, 2),
);
process.exitCode = failed ? 1 : 0;
