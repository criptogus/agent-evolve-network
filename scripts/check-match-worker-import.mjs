// Actual workerd import/handler regression. No provider calls or credentials.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const [output, sourceArg, ...extra] = process.argv.slice(2);
if (!output || extra.length)
  throw new Error("Usage: check-match-worker-import.mjs NEW_REPORT [SELECTOR_SOURCE]");
try {
  await access(output);
  throw new Error("Refusing report overwrite");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const source = resolve(sourceArg ?? "src/lib/match/jev-agent-match.server.ts");
const sourceHash = createHash("sha256")
  .update(await readFile(source))
  .digest("hex");
const temporary = await mkdtemp(join(tmpdir(), "sas-worker-import-"));
const freePort = () =>
  new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject).listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address
          ? resolvePort(address.port)
          : reject(new Error("Missing loopback port")),
      );
    });
  });
const port = await freePort(),
  inspectorPort = await freePort();
await writeFile(
  join(temporary, "worker.ts"),
  `import {selectionCacheDiagnostics} from ${JSON.stringify(source)};\nexport default {fetch(request: Request) { return Response.json(selectionCacheDiagnostics(request, "worker-import-regression")); }};\n`,
);
await writeFile(
  join(temporary, "wrangler.json"),
  JSON.stringify({
    name: "sas-match-import-regression",
    main: "worker.ts",
    compatibility_date: "2025-09-24",
    compatibility_flags: ["nodejs_compat"],
  }),
);
let log = "",
  child;
const result = {
  passed: false,
  source,
  sourceHash,
  runtime: "workerd",
  inferenceCalls: 0,
  errors: [],
};
try {
  child = spawn(
    process.execPath,
    [
      resolve("node_modules/wrangler/bin/wrangler.js"),
      "dev",
      "--local",
      "--config",
      join(temporary, "wrangler.json"),
      "--port",
      String(port),
      "--inspector-port",
      String(inspectorPort),
    ],
    {
      cwd: temporary,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
        CLOUDFLARE_SEND_METRICS: "false",
        CI: "true",
      },
    },
  );
  const ready = new Promise((done, fail) => {
    const deadline = setTimeout(() => fail(new Error("Worker startup deadline exceeded")), 30000);
    const collect = (chunk) => {
      log += chunk.toString();
      if (log.length > 1000000) {
        clearTimeout(deadline);
        fail(new Error("Worker log bound exceeded"));
      }
      if (/Ready on http/.test(log)) {
        clearTimeout(deadline);
        done();
      }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", (error) => {
      clearTimeout(deadline);
      fail(error);
    });
    child.once("exit", (code) => {
      clearTimeout(deadline);
      fail(new Error(`Worker exited ${code}`));
    });
  });
  await ready;
  const receipts = [];
  for (let i = 0; i < 2; i++) {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: { authorization: `Bearer ${"synthetic-worker-probe-".repeat(3)}` },
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    assert.equal(response.status, 200, "Worker handler must succeed after actual module import");
    receipts.push(await response.json());
  }
  assert.equal(receipts[0].instanceId, receipts[1].instanceId);
  assert.match(receipts[0].instanceId, /^[a-f0-9-]{36}$/);
  assert.match(receipts[0].partition, /^[a-f0-9]{64}$/);
  assert.equal(receipts[0].partition, receipts[1].partition);
  for (const receipt of receipts) {
    assert.equal(receipt.providerRequests, 0);
    assert.equal(receipt.generatorStarted, false);
    assert.equal(receipt.entries, 0);
    assert.ok(Number.isSafeInteger(receipt.firstObservedAt) && receipt.firstObservedAt > 0);
    assert.ok(receipt.observedAt >= receipt.firstObservedAt);
    assert.equal(receipt.ttlMs, 1800000);
  }
  result.receipts = receipts;
  result.passed = true;
} catch (error) {
  result.errors.push(error.message);
  process.exitCode = 1;
} finally {
  if (child?.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  await writeFile(output + ".log", log, { flag: "wx" });
  await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  await rm(temporary, { recursive: true, force: true });
}
console.log(JSON.stringify({ passed: result.passed, errors: result.errors, inferenceCalls: 0 }));
