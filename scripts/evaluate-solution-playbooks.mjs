/** Finite offline execution of real compiled workflows. No automated semantic verdict or publishing. */
import { decodePlaybookCliResult } from "./playbook-cli-result.mjs";
import { createPlaybookEvaluationProxy } from "./playbook-evaluation-proxy.mjs";
import { createHash } from "node:crypto";
import {
  createReadStream,
  readdirSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { parse } from "yaml";
import {
  buildSolutionPlaybookFiles,
  verifySolutionPlaybookSnapshot,
} from "./solution-artifact-files.ts";
const CONTRACT = "content/expansion/playbook-adversarial-cases.json";
const CONTRACT_HASH = "c8361a94d98c18577812e003524b57e2ef25ff7a68cd450c4c7f59a28b3fc63a";
const hash = (s) => createHash("sha256").update(s).digest("hex");
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const save = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", { flag: "wx" });
const [mode, target, ...args] = process.argv.slice(2);
if (!target || !["prepare", "run"].includes(mode))
  throw new Error("Usage: prepare NEW_DIR PYTHON CACHED_MODEL | run DIR --max-cases N");
const dir = resolve(target);
const cases = load(CONTRACT);
if (
  hash(readFileSync(CONTRACT)) !== CONTRACT_HASH ||
  cases.subjects.length !== 4 ||
  cases.subjects.some((s) => s.cases.length !== 18)
)
  throw new Error("Changed frozen 4-playbook/72-case contract");
const sourcePaths = [
  CONTRACT,
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
  "src/lib/adversarial/leak-scanner.ts",
  ...cases.subjects.map((s) => `content/playbooks/${s.slug}.yaml`),
];
const sourceHashes = Object.fromEntries(sourcePaths.map((p) => [p, hash(readFileSync(p))]));
async function fileHash(path) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest("hex");
}
function profileFor(modelPath) {
  const profile = load("content/expansion/playbook-model-profiles.json").find((p) =>
    modelPath.endsWith(`/${p.revision}`),
  );
  if (!profile) throw new Error("Cached exact model revision required");
  return profile;
}
async function fingerprint(python, modelPath) {
  const profile = profileFor(modelPath);
  const weightNames = readdirSync(modelPath)
    .filter((p) => p.endsWith(".safetensors"))
    .sort();
  if (JSON.stringify(weightNames) !== JSON.stringify(Object.keys(profile.weights_sha256).sort()))
    throw new Error("Changed model weight file set");
  const result = spawnSync(
    python,
    [
      "-c",
      "import json,platform,importlib.metadata as m,mlx_vlm.server,pathlib,hashlib; root=pathlib.Path(mlx_vlm.server.__file__).parent; print(json.dumps({'python':platform.python_version(),'architecture':platform.machine(),'mlx':m.version('mlx'),'mlx_vlm':m.version('mlx-vlm'),'server_sources':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*.py'))}}))",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error("Local runtime metadata failed");
  const metadata = JSON.parse(result.stdout);
  for (const k of ["python", "architecture", "mlx", "mlx_vlm"])
    if (metadata[k] !== profile[k]) throw new Error(`Local runtime mismatch: ${k}`);
  const files = { ...profile.weights_sha256, ...profile.model_files_sha256 };
  for (const [p, digest] of Object.entries(files))
    if ((await fileHash(join(modelPath, p))) !== digest)
      throw new Error(`Model fingerprint mismatch: ${p}`);
  return { ...metadata, files };
}
if (mode === "prepare") {
  if (args.length !== 2 || existsSync(dir))
    throw new Error("Explicit Python, cached model and fresh evidence directory required");
  const [python, modelPath] = args.map((p) => resolve(p));
  const runtime = await fingerprint(python, modelPath);
  const financeHost = load("content/expansion/playbook-local-contract.json").finance_host;
  if (financeHost.node !== process.versions.node || financeHost.architecture !== process.arch)
    throw new Error("Exact finance Node/architecture required");
  mkdirSync(dir, { recursive: true });
  for (const source of sourcePaths) {
    const snapshot = join(dir, "source-snapshot", source);
    mkdirSync(resolve(snapshot, ".."), { recursive: true });
    writeFileSync(snapshot, readFileSync(source), { flag: "wx" });
  }
  const subjects = cases.subjects.map((s) => {
    const artifact = buildSolutionPlaybookFiles(
      readFileSync(`content/playbooks/${s.slug}.yaml`, "utf8"),
    );
    for (const [path, body] of Object.entries(artifact.files)) {
      const destination = join(dir, "package-snapshots", s.slug, path);
      mkdirSync(resolve(destination, ".."), { recursive: true });
      writeFileSync(destination, body, { flag: "wx" });
    }
    return {
      ...s,
      version: artifact.version,
      artifact: {
        sha256: artifact.sha256,
        fileHashes: Object.fromEntries(
          Object.entries(artifact.files).map(([p, b]) => [p, hash(b)]),
        ),
      },
    };
  });
  const payload = {
    protocol: "compiled-playbook-gateway-v12-complete-output",
    python,
    modelPath,
    model: profileFor(modelPath).model,
    finance_host: financeHost,
    runtime,
    sourceHashes,
    thresholds: cases.thresholds,
    settings: { temperature: 0, server_max_tokens: 768, server_enable_thinking: false, seed: null },
    subjects,
  };
  save(join(dir, "plan.json"), { ...payload, planHash: hash(JSON.stringify(payload)) });
  console.log(
    JSON.stringify({
      status: "prepared_not_qualified",
      cases: 72,
      model: payload.model,
      inferenceCalls: 0,
    }),
  );
  process.exitCode = 4;
} else {
  if (args.length !== 2 || args[0] !== "--max-cases" || !/^[1-9]\d*$/.test(args[1]))
    throw new Error("Explicit positive --max-cases N required");
  if (existsSync(join(dir, "STOP-AFTER-CURRENT-CASE")))
    throw new Error("Existing stop request; refusing empty or replayed evaluation");
  const { planHash, ...plan } = load(join(dir, "plan.json"));
  if (
    hash(JSON.stringify(plan)) !== planHash ||
    JSON.stringify(plan.sourceHashes) !== JSON.stringify(sourceHashes)
  )
    throw new Error("Changed plan/runtime/source");
  if (
    JSON.stringify(await fingerprint(plan.python, plan.modelPath)) !== JSON.stringify(plan.runtime)
  )
    throw new Error("Changed model/runtime");
  const outputsPath = join(dir, "outputs.jsonl");
  if (
    existsSync(outputsPath) ||
    existsSync(join(dir, "attempts.jsonl")) ||
    existsSync(join(dir, "source-facts-attempts.jsonl"))
  )
    throw new Error("Existing inference attempts are preserved; no replay/resume in this command");
  if (!process.env.TYPESAFE_API_KEY?.trim())
    throw new Error("Finance source-facts qualification requires private TYPESAFE_API_KEY");
  const installations = [];
  for (const s of plan.subjects) {
    const artifact = verifySolutionPlaybookSnapshot(
      readFileSync(`content/playbooks/${s.slug}.yaml`, "utf8"),
      s.artifact,
      join(dir, "package-snapshots", s.slug),
    );
    const root = join(dir, "package-snapshots", s.slug, "skills", s.slug);
    const install = spawnSync(
      "npm",
      ["ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"],
      { cwd: root, encoding: "utf8", timeout: 30000 },
    );
    installations.push({
      slug: s.slug,
      packageSha256: artifact.sha256,
      exitCode: install.status,
      stdout: install.stdout,
      stderr: install.stderr,
    });
    if (install.status !== 0) {
      save(join(dir, "package-installations.json"), installations);
      throw new Error("Packaged dependency installation failed");
    }
  }
  save(join(dir, "package-installations.json"), installations);
  const bind = async (server) => {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    return server.address().port;
  };
  const reservation = createServer();
  const port = await bind(reservation);
  await new Promise((r) => reservation.close(r));
  const serverLog = createWriteStream(join(dir, "local-server.log"), { flags: "wx" });
  const server = spawn(
    plan.python,
    [
      "-m",
      "mlx_vlm.server",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--model",
      plan.modelPath,
      "--max-tokens",
      "768",
      "--log-level",
      "WARNING",
    ],
    {
      env: {
        ...process.env,
        HF_HUB_OFFLINE: "1",
        TRANSFORMERS_OFFLINE: "1",
        MLX_VLM_ENABLE_THINKING: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.pipe(serverLog);
  server.stderr.pipe(serverLog);
  const serverClosed = once(server, "close");
  let health;
  let active = null;
  let requestCount = 0;
  let proxy;
  const rows = [];
  try {
    const start = Date.now();
    while (Date.now() - start < 120000 && server.exitCode === null) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(1000),
        });
        if (r.ok) {
          health = await r.json();
          break;
        }
      } catch {
        /* startup only, never replay inference */
      }
      await delay(500);
    }
    if (!health || health.loaded_model !== plan.modelPath)
      throw new Error("Local model server not ready with exact cached model");
    save(join(dir, "server-start.json"), {
      pid: server.pid,
      port,
      health,
      network: "loopback only; HF offline; no tools",
      planHash,
    });
    proxy = createPlaybookEvaluationProxy({
      upstreamUrl: `http://127.0.0.1:${port}`,
      getActive: () => active,
      nextStep: () => ++requestCount,
      dir,
      planHash,
    });
    const proxyPort = await bind(proxy);
    const schedule = plan.subjects.flatMap((s) => s.cases.map((c) => ({ subject: s, c })));
    for (const { subject, c } of schedule.slice(0, Number(args[1]))) {
      if (existsSync(join(dir, "STOP-AFTER-CURRENT-CASE"))) {
        if (!rows.length) throw new Error("Stopped before first case; no inference started");
        break;
      }
      active = c;
      const inputPath = join(dir, `input-${rows.length + 1}.json`);
      save(inputPath, c.inputs);
      const finance = subject.slug === "solution-monthly-finance-close";
      const factsJournal = join(dir, "source-facts-attempts.jsonl");
      if (finance)
        appendFileSync(
          factsJournal,
          JSON.stringify({ event: "source_facts_started", case_id: c.id, planHash }) + "\n",
        );
      const child = spawn(
        process.execPath,
        [
          "--experimental-strip-types",
          join(
            dir,
            "package-snapshots",
            subject.slug,
            "skills",
            subject.slug,
            "scripts/run-playbook.ts",
          ),
          "--playbook",
          subject.slug,
          "--inputs-file",
          inputPath,
          "--gateway",
          ...(finance ? ["--semantic-source-facts", "--allow-typesafe-source-upload"] : []),
        ],
        {
          env: {
            ...process.env,
            AI_GATEWAY_BASE_URL: `http://127.0.0.1:${proxyPort}`,
            AI_GATEWAY_API_KEY: "offline-loopback-only",
            AI_GATEWAY_MODEL: plan.modelPath,
            LOCAL_MODEL_PYTHON: plan.python,
          },
          cwd: join(dir, "package-snapshots", subject.slug, "skills", subject.slug),
        },
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (b) => {
        stdout += b;
      });
      child.stderr.on("data", (b) => {
        stderr += b;
      });
      const [exitCode, signal] = await once(child, "close");
      const decoded = decodePlaybookCliResult(stdout, exitCode);
      const parsed = decoded.value;
      if (finance)
        appendFileSync(
          factsJournal,
          JSON.stringify({
            event: parsed?.source_facts ? "source_facts_completed" : "source_facts_unknown",
            case_id: c.id,
            planHash,
            ...(parsed?.source_facts
              ? {
                  evidence_sha256: hash(JSON.stringify(parsed.source_facts)),
                  model: parsed.source_facts.response.model,
                  usage: parsed.source_facts.response.usage,
                }
              : {}),
          }) + "\n",
        );
      const row = {
        slug: subject.slug,
        version: subject.version,
        package_sha256: subject.artifact.sha256,
        case_id: c.id,
        planHash,
        exitCode,
        output_error: decoded.error,
        signal,
        stdout,
        stderr,
      };
      appendFileSync(outputsPath, JSON.stringify(row) + "\n");
      rows.push(row);
      console.log(
        JSON.stringify({
          case_id: c.id,
          exitCode,
          graph_steps: parsed?.step_outcomes?.length ?? 0,
          completed_cases: rows.length,
          qualifies: false,
        }),
      );
      if (exitCode !== 0 || decoded.error) break;
    }
    save(join(dir, "execution-summary.json"), {
      planHash,
      scheduled_cases: 72,
      completed_cases: rows.length,
      model_requests: requestCount,
      error_cases: rows.filter((r) => r.exitCode !== 0 || r.output_error).length,
      owner_stop_requested: existsSync(join(dir, "STOP-AFTER-CURRENT-CASE")),
      primary_review: "pending",
      publicationApproved: false,
      complete: rows.length === 72,
      lovable_inference_calls: 0,
    });
    process.exitCode = 4;
  } finally {
    active = null;
    if (proxy) await new Promise((r) => proxy.close(r));
    server.kill("SIGTERM");
    const terminal = await Promise.race([serverClosed, delay(10000).then(() => null)]);
    if (!terminal) {
      server.kill("SIGKILL");
      await serverClosed;
    }
    serverLog.end();
    save(join(dir, "server-stop.json"), {
      pid: server.pid,
      exitCode: server.exitCode,
      signal: server.signalCode,
      shutdownObserved: true,
    });
  }
}
