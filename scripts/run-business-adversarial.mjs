/** One finite batch using the existing scorer, local model worker and official Jev integration. No automatic publishing. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const raw = process.argv.slice(2);
const resume = raw.includes("--resume");
const protocolIndex = raw.indexOf("--prompt-protocol");
const protocol = protocolIndex < 0 ? "system-first-v1" : raw[protocolIndex + 1];
if (!["system-first-v1", "redact-route-generate-v1"].includes(protocol))
  throw new Error("Unsupported prompt protocol");
const args = raw.filter(
    (a, i) =>
      a !== "--resume" && (protocolIndex < 0 || (i !== protocolIndex && i !== protocolIndex + 1)),
  ),
  required = ["--workdir", "--python", "--model-path", "--model-id", "--jev-helper"];
if (
  args.length !== required.length * 2 ||
  args.some((a, i) => i % 2 === 0 && !required.includes(a))
)
  throw new Error(
    "Supply --workdir DIR --python PYTHON --model-path CACHED_DIR --model-id ID@REVISION --jev-helper SCRIPT",
  );
const options = Object.fromEntries(required.map((k) => [k, args[args.indexOf(k) + 1]]));
if (
  Object.values(options).some((v) => !v || v.startsWith("--")) ||
  required.some((k) => !args.includes(k))
)
  throw new Error("Incomplete explicit inputs");
const dir = options["--workdir"];
if (existsSync(join(dir, "plan.json")) && !resume)
  throw new Error("Choose a fresh evidence directory; original runs are immutable");
mkdirSync(dir, { recursive: true });
const steps = [];
function run(name, executable, argv, advisory = false) {
  const result = spawnSync(executable, argv, { stdio: "inherit", timeout: 3600000 });
  steps.push({ name, exit: result.status ?? 2 });
  writeFileSync(
    join(dir, "batch-execution.json"),
    JSON.stringify(
      { steps, completed: steps.length, failed: steps.filter((s) => s.exit !== 0).length },
      null,
      2,
    ),
  );
  if (result.status !== 0 && !advisory)
    throw new Error(`${name} failed; inspect preserved partial evidence`);
}
const nodeArgs = ["--experimental-strip-types", "scripts/eval-business-adversarial.mjs"];
if (resume) {
  const plan = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8"));
  const rows = readFileSync(join(dir, "outputs.jsonl"), "utf8").trim().split("\n");
  if (
    plan.model !== options["--model-id"] ||
    (plan.prompt_protocol ?? "system-first-v1") !== protocol ||
    rows.length !== plan.subjects.reduce((n, s) => n + s.cases.length, 0) ||
    existsSync(join(dir, "report.json"))
  )
    throw new Error(
      "Resume requires complete original inference, matching model and no prior report",
    );
  steps.push({ name: "reuse completed original inference", exit: 0, rows: rows.length });
} else {
  run("freeze plan", process.execPath, [
    ...nodeArgs,
    "prepare",
    options["--model-id"],
    "--prompt-protocol",
    protocol,
    "--workdir",
    dir,
  ]);
  run("real local inference", options["--python"], [
    "scripts/local-adversarial-model.py",
    "--plan",
    join(dir, "plan.json"),
    "--model-path",
    options["--model-path"],
    "--output",
    join(dir, "outputs.jsonl"),
  ]);
}
run("prepare independent judging", process.execPath, [
  ...nodeArgs,
  "judge-input",
  "--workdir",
  dir,
]);
for (const number of [1, 2])
  run(
    `semantic judgment ${number}`,
    "python3",
    [
      options["--jev-helper"],
      join(dir, `judge-input-${number}.json`),
      "--output",
      join(dir, `judge-result-${number}.json`),
    ],
    true,
  );
if (!existsSync(join(dir, "reviews.json"))) {
  run("prepare primary review", process.execPath, [...nodeArgs, "review-input", "--workdir", dir]);
  console.log(
    "Inference and advisory judging completed. Primary trace review is required; no package is approved. Create hash-bound reviews.json, then run the report phase.",
  );
  process.exit(4);
}
run("strict aggregate report", process.execPath, [...nodeArgs, "report", "--workdir", dir]);
console.log(
  "Complete evidence preserved. Publication still requires exact version/hash checks and the live approval gate.",
);
