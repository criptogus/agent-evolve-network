export interface RpcEnvelope {
  result?: Record<string, unknown> & { content?: Array<{ type: string; text?: string }> };
  error?: { message?: string; code?: number; data?: unknown };
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export function parseEnvelope(text: string): RpcEnvelope | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!record(value)) return null;
  const out: RpcEnvelope = {};
  if (record(value.error)) {
    out.error = {
      message: typeof value.error.message === "string" ? value.error.message : undefined,
      code: typeof value.error.code === "number" ? value.error.code : undefined,
      data: value.error.data,
    };
  }
  if (record(value.result)) {
    out.result = { ...value.result };
    if (Array.isArray(value.result.content))
      out.result.content = value.result.content
        .filter(record)
        .filter((item) => typeof item.type === "string")
        .map((item) => ({
          type: String(item.type),
          text: typeof item.text === "string" ? item.text : undefined,
        }));
  }
  return out;
}
