export type MatchStreamEvent<T> =
  { type: "heartbeat" } | { type: "result"; value: T } | { type: "error"; message: string };

// Return the typed stream immediately, retaining the server's 20s handler
// deadline. Heartbeats keep the pending response active; work is still finite.
export function streamMatchResult<T>(
  work: (signal: AbortSignal) => Promise<T>,
  options: { timeoutMs?: number; heartbeatMs?: number } = {},
): ReadableStream<MatchStreamEvent<T>> {
  const abort = new AbortController();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval>;
  let deadline: ReturnType<typeof setTimeout>;
  const cleanup = () => {
    clearInterval(heartbeat);
    clearTimeout(deadline);
  };
  return new ReadableStream<MatchStreamEvent<T>>({
    start(controller) {
      const finish = (event: MatchStreamEvent<T>) => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.enqueue(event);
        controller.close();
      };
      controller.enqueue({ type: "heartbeat" });
      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue({ type: "heartbeat" });
      }, options.heartbeatMs ?? 5000);
      deadline = setTimeout(() => {
        abort.abort();
        finish({ type: "error", message: "Agent Match deadline exceeded; no automatic retry." });
      }, options.timeoutMs ?? 190000);
      Promise.resolve()
        .then(() => work(abort.signal))
        .then((value) => finish({ type: "result", value }))
        .catch(() => finish({ type: "error", message: "Agent Match failed; no automatic retry." }));
    },
    cancel() {
      closed = true;
      cleanup();
      abort.abort();
    },
  });
}

export async function readMatchResult<T>(
  source: ReadableStream<MatchStreamEvent<T>> | PromiseLike<ReadableStream<MatchStreamEvent<T>>>,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  let reader: ReadableStreamDefaultReader<MatchStreamEvent<T>> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const opened = Promise.resolve(source);
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error("Agent Match client deadline exceeded; reconcile usage; no automatic retry."),
        ),
      options.timeoutMs ?? 195000,
    );
  });
  try {
    const stream = await Promise.race([opened, deadline]);
    reader = stream.getReader();
    while (true) {
      const item = await Promise.race([reader.read(), deadline]);
      if (item.done)
        throw new Error("Agent Match transport ended without a result; reconcile usage.");
      if (item.value.type === "error") throw new Error(item.value.message);
      if (item.value.type === "result") return item.value.value;
    }
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (reader) {
      // Remote cancellation can itself stall; it must not hide the result/error.
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    } else {
      // If opening lost the race, cancel a late transport without awaiting it.
      void opened.then((stream) => stream.cancel()).catch(() => {});
    }
  }
}

// Consume the provider body once. A tee/clone can leave one branch unread while
// evidence capture waits for EOF in a managed Worker. Replay the same bytes to
// the SDK instead; the finite bound is well above the pinned 4096-token output.
export async function bufferMatchProviderResponse(response: Response) {
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (reader) {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > 2000000) throw new Error("Oversized Agent Match provider response");
        chunks.push(next.value);
      }
    }
  } finally {
    if (reader) {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const headers = new Headers(response.headers);
  for (const name of ["content-length", "content-encoding", "transfer-encoding"])
    headers.delete(name);
  return {
    text: new TextDecoder().decode(bytes),
    response: new Response([204, 205, 304].includes(response.status) ? null : bytes, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  };
}
