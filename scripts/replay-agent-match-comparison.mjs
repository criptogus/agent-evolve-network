// Replay a historical frozen validator without changing the working tree or its rules.
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
const args = process.argv.slice(2);
if (args.length !== 6 || args.some((value) => !value.trim()))
  throw new Error(
    "Usage: replay-agent-match-comparison.mjs COMMIT PLAN JOURNAL REVIEWS BILLING NEW_REPORT",
  );
const [commit, ...files] = args;
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Use the exact immutable validator commit");
const [plan, journal, reviews, billing, output] = files.map((file) => resolve(file));
const snapshot = `${output}.validator-source`;
if (existsSync(output) || existsSync(snapshot) || existsSync(`${output}.replay.json`))
  throw new Error("Existing evidence; refusing overwrite or no-op replay");
for (const file of [plan, journal, reviews, billing])
  if (!existsSync(file)) throw new Error(`Missing evidence: ${file}`);
const archive = spawnSync("git", ["archive", "--format=tar", commit], {
  maxBuffer: 256 * 1024 * 1024,
});
if (archive.status !== 0) throw new Error("Cannot archive the frozen validator commit");
mkdirSync(snapshot);
const extracted = spawnSync("tar", ["-xf", "-", "-C", snapshot], { input: archive.stdout });
if (extracted.status !== 0) throw new Error("Validator snapshot extraction failed");
symlinkSync(resolve("node_modules"), join(snapshot, "node_modules"), "dir");
const run = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    join(snapshot, "scripts/evaluate-agent-match-comparison.ts"),
    plan,
    journal,
    reviews,
    billing,
    output,
  ],
  { cwd: snapshot, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (![0, 4].includes(run.status) || !existsSync(output))
  throw new Error("Historical validator did not produce a valid aggregate report");
const report = JSON.parse(readFileSync(output, "utf8"));
if (typeof report.approved !== "boolean" || report.approved !== (run.status === 0))
  throw new Error("Inconsistent historical verdict");
writeFileSync(
  `${output}.replay.json`,
  JSON.stringify(
    {
      validatorCommit: commit,
      snapshot,
      inputs: { plan, journal, reviews, billing },
      exitCode: run.status,
      approved: report.approved,
      inferenceCalls: 0,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
process.exitCode = run.status;
