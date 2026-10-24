import { test } from "node:test";
import assert from "node:assert/strict";
import { withTimeout } from "../src/lib/server/response-deadline.ts";
import { readMatchResult, streamMatchResult } from "../src/lib/match/result-stream.ts";
test("Agent Match returns its transport before the handler deadline while inference remains pending", async () => {
  let release: (value: { ok: boolean }) => void = () => {};
  const inference = new Promise<{ ok: boolean }>((resolve) => {
    release = resolve;
  });
  const transport = streamMatchResult(async () => inference);
  const initial = await withTimeout(Promise.resolve(transport), 10);
  release({ ok: true });
  assert.notEqual(
    initial,
    "__timeout__",
    "The awaited generator hit the unchanged handler deadline before returning a response",
  );
  if (initial !== "__timeout__") assert.deepEqual(await readMatchResult(initial), { ok: true });
});

test("stream errors close without raw provider errors or credentials", async () => {
  const stream = streamMatchResult(async () => {
    throw new Error("secret-provider-body");
  });
  await assert.rejects(
    readMatchResult(stream),
    (e) => e instanceof Error && e.message === "Agent Match failed; no automatic retry.",
  );
});
test("stream cancellation aborts the pending work", async () => {
  let signal: AbortSignal | undefined;
  const stream = streamMatchResult(async (s) => {
    signal = s;
    return await new Promise<never>(() => {});
  });
  await Promise.resolve();
  await stream.cancel();
  assert.equal(signal?.aborted, true);
});
test("stream deadline ends unknown work without automatic retry", async () => {
  const stream = streamMatchResult(async () => new Promise<never>(() => {}), {
    timeoutMs: 5,
    heartbeatMs: 2,
  });
  await assert.rejects(readMatchResult(stream), /deadline exceeded/);
});

test("framework serializer supports the actual typed result stream", async () => {
  const { toCrossJSONStream } = await import("seroval");
  const { defaultSerovalDeserializerPlugins } = await import("@tanstack/router-core/ssr/server");
  const stream = streamMatchResult(async () => ({ ok: true }));
  let records = 0;
  await new Promise<void>((resolve, reject) => {
    toCrossJSONStream(stream, {
      refs: new Map(),
      plugins: defaultSerovalDeserializerPlugins,
      onParse() {
        records++;
      },
      onDone() {
        resolve();
      },
      onError(error) {
        reject(error);
      },
    });
  });
  assert.ok(records > 0);
});
