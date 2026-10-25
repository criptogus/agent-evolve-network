import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPlaybookEvaluationProxy } from "../scripts/playbook-evaluation-proxy.mjs";
async function listen(server: Server) {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const a = server.address();
  assert.ok(a && typeof a !== "string");
  return `http://127.0.0.1:${a.port}`;
}
const close = (server: Server) =>
  new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
test("actual proxy retains original case after owner clears active case during shutdown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "playbook-proxy-"));
  let release: () => void = () => {};
  const released = new Promise<void>((r) => {
    release = r;
  });
  let started: () => void = () => {};
  const arrived = new Promise<void>((r) => {
    started = r;
  });
  const upstream = createServer(async (req, res) => {
    for await (const chunk of req) void chunk;
    started();
    await released;
    res.setHeader("content-type", "application/json");
    res.end('{"choices":[]}');
  });
  let active: { id: string } | null = { id: "original-case" };
  let n = 0;
  const proxy = createPlaybookEvaluationProxy({
    upstreamUrl: await listen(upstream),
    getActive: () => active,
    nextStep: () => ++n,
    dir,
    planHash: "frozen",
  });
  try {
    const response = fetch(`${await listen(proxy)}/chat/completions`, {
      method: "POST",
      body: '{"model":"fixture-only"}',
    });
    await arrived;
    active = null;
    const draining = close(proxy);
    release();
    assert.equal((await response).status, 200);
    await draining;
    const attempts = readFileSync(join(dir, "attempts.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((s) => JSON.parse(s));
    assert.deepEqual(
      attempts.map((a) => a.event),
      ["step_started", "step_completed"],
    );
    assert.ok(attempts.every((a) => a.case_id === "original-case" && a.planHash === "frozen"));
    assert.equal(
      JSON.parse(readFileSync(join(dir, "transport.jsonl"), "utf8")).case_id,
      "original-case",
    );
  } finally {
    release();
    if (proxy.listening) await close(proxy);
    await close(upstream);
    rmSync(dir, { recursive: true });
  }
});
