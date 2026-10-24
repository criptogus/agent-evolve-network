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

export async function readMatchResult<T>(stream: ReadableStream<MatchStreamEvent<T>>): Promise<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const item = await reader.read();
      if (item.done)
        throw new Error("Agent Match transport ended without a result; reconcile usage.");
      if (item.value.type === "error") throw new Error(item.value.message);
      if (item.value.type === "result") return item.value.value;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
