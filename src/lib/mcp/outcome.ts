export type McpOutcome = "succeeded" | "failed" | "unknown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** A transport 200 is not sufficient: JSON-RPC and tool errors are failures. */
export function rpcOutcome(value: unknown, id: unknown): McpOutcome {
  if (!isRecord(value) || value.id !== id) return "unknown";
  if ("error" in value) return "failed";
  const result = value.result;
  if (!isRecord(result)) return "unknown";
  if (result.isError === true) return "failed";
  // Some existing tools encode an application error in a text content block.
  if (Array.isArray(result.content)) {
    for (const block of result.content) {
      if (!isRecord(block) || block.type !== "text" || typeof block.text !== "string") continue;
      try {
        const data: unknown = JSON.parse(block.text);
        if (isRecord(data) && (data.error || data.ok === false)) return "failed";
      } catch {
        /* Ordinary text output is valid MCP content. */
      }
    }
  }
  return "succeeded";
}

/** Inspect only a bounded clone. Never consume or modify the client's stream. */
export async function responseOutcome(response: Response, id: unknown): Promise<McpOutcome> {
  if (!response.ok) return "failed";
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json") && !type.includes("text/event-stream")) return "unknown";
  const reader = response.clone().body?.getReader();
  if (!reader) return "unknown";
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("telemetry deadline")), 1000);
  });
  try {
    while (true) {
      const part = await Promise.race([reader.read(), deadline]);
      if (part.value) {
        bytes += part.value.byteLength;
        if (bytes > 65536) return "unknown";
        text += decoder.decode(part.value, { stream: true });
      }
      if (type.includes("text/event-stream")) {
        const frames = text.replace(/\r\n/g, "\n").split("\n\n");
        text = frames.pop() ?? "";
        for (const frame of frames) {
          const data = frame
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data) continue;
          try {
            const outcome = rpcOutcome(JSON.parse(data), id);
            if (outcome !== "unknown") return outcome;
          } catch {
            /* Ignore non-result SSE events. */
          }
        }
      }
      if (part.done) {
        if (type.includes("application/json")) return rpcOutcome(JSON.parse(text), id);
        return "unknown";
      }
    }
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
    // Awaiting cancellation of one tee branch can wait for the original consumer.
    void reader.cancel().catch(() => {});
  }
}
