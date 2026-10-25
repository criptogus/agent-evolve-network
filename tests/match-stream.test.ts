import { test } from "node:test";
import assert from "node:assert/strict";
import { withTimeout } from "../src/lib/server/response-deadline.ts";
import {
  readMatchResult,
  streamMatchResult,
  bufferMatchProviderResponse,
} from "../src/lib/match/result-stream.ts";
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

test("a pending cleanup cannot hide a delivered result", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "result" as const, value: { ok: true } });
    },
    cancel() {
      return new Promise<void>(() => {});
    },
  });
  const actual = await Promise.race([
    readMatchResult(stream),
    new Promise((resolve) => setTimeout(() => resolve("cleanup_stalled"), 20)),
  ]);
  assert.deepEqual(actual, { ok: true });
});

test("client deadline covers a transport that never opens", async () => {
  await assert.rejects(
    readMatchResult(new Promise<ReadableStream<never>>(() => {}), { timeoutMs: 5 }),
    /client deadline exceeded/,
  );
});

test("client deadline ends a stalled reader without awaiting its cleanup", async () => {
  let canceled = false;
  const stream = new ReadableStream<never>({
    cancel() {
      canceled = true;
      return new Promise<void>(() => {});
    },
  });
  await assert.rejects(readMatchResult(stream, { timeoutMs: 5 }), /client deadline exceeded/);
  assert.equal(canceled, true);
});

test("provider evidence and SDK receive identical chunked bytes without cloning", async () => {
  const raw = JSON.stringify({ content: "á🌍".repeat(40000), usage: { input: 123, output: 456 } });
  const bytes = new TextEncoder().encode(raw);
  let offset = 0;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= bytes.length) {
          controller.close();
          return;
        }
        controller.enqueue(bytes.slice(offset, offset + 4093));
        offset += 4093;
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": String(bytes.length),
        "content-encoding": "gzip",
      },
    },
  );
  response.clone = () => {
    throw new Error("An unconsumed tee branch must not be created");
  };
  const buffered = await bufferMatchProviderResponse(response);
  assert.equal(buffered.text, raw);
  assert.equal(await buffered.response.text(), raw);
  assert.equal(buffered.response.status, 200);
  assert.equal(buffered.response.headers.get("content-type"), "application/json");
  assert.equal(buffered.response.headers.has("content-length"), false);
  assert.equal(buffered.response.headers.has("content-encoding"), false);
  assert.equal(response.bodyUsed, true);
});

test("provider body bound stops oversized input without waiting for stalled cleanup", async () => {
  let canceled = false;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2000001));
      },
      cancel() {
        canceled = true;
        return new Promise<void>(() => {});
      },
    }),
  );
  await assert.rejects(bufferMatchProviderResponse(response), /Oversized/);
  assert.equal(canceled, true);
});
