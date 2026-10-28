import { z } from "zod";
export const EMBEDDING_DIMENSIONS = 1536;
const ResponseSchema = z.object({
  model: z.string(),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    })
    .optional(),
  data: z
    .array(
      z.object({
        index: z.number().int(),
        embedding: z.array(z.number().finite()).length(EMBEDDING_DIMENSIONS),
      }),
    )
    .min(1)
    .max(25),
});
export type EmbeddingConfig = {
  endpoint: string;
  key: string;
  model: string;
  provider?: "lovable" | "openai-compatible";
};
/** Fixed managed provider: never forward the Lovable credential to a configurable URL. */
export function resolveEmbeddingConfig(env: Record<string, string | undefined>): EmbeddingConfig {
  const provider = env.SEARCH_EMBEDDING_PROVIDER || "lovable";
  if (provider === "lovable") {
    if (!env.LOVABLE_API_KEY) throw new Error("Managed Lovable embedding credential unavailable");
    return {
      provider,
      endpoint: "https://ai.gateway.lovable.dev/v1/embeddings",
      key: env.LOVABLE_API_KEY,
      model: "openai/text-embedding-3-small",
    };
  }
  if (provider !== "openai-compatible") throw new Error("Unsupported embedding provider");
  const endpoint = env.SEARCH_EMBEDDING_ENDPOINT;
  const key = env.SEARCH_EMBEDDING_API_KEY;
  const model = env.SEARCH_EMBEDDING_MODEL;
  if (!endpoint || !key || !model) throw new Error("Embedding configuration incomplete");
  return { provider, endpoint, key, model };
}
export function embeddingSourceInput(source: {
  name: string;
  description: string | null;
  long_description: string | null;
}) {
  return Array.from([source.name, source.description, source.long_description].join("\n"))
    .slice(0, 2000)
    .join("");
}
export async function embedQueries(
  inputs: string[],
  config: EmbeddingConfig,
  transport: typeof fetch = fetch,
  timeoutMs = 5000,
) {
  const url = new URL(config.endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash)
    throw new Error("Trusted HTTPS embedding endpoint required");
  if (
    !inputs.length ||
    inputs.length > 25 ||
    !config.key ||
    !config.model ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 15000 ||
    inputs.some(
      (input) =>
        !input.trim() ||
        Array.from(input).length > 2000 ||
        new TextEncoder().encode(input).length > 8000,
    )
  )
    throw new Error("Invalid embedding request");
  if (
    config.provider === "lovable" &&
    (url.href !== "https://ai.gateway.lovable.dev/v1/embeddings" ||
      config.model !== "openai/text-embedding-3-small")
  )
    throw new Error("Managed embedding profile mismatch");
  const response = await transport(url, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      ...(config.provider === "lovable"
        ? { "Lovable-API-Key": config.key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }
        : { Authorization: `Bearer ${config.key}` }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      input: inputs.length === 1 ? inputs[0] : inputs,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: "float",
    }),
  });
  if (!response.ok)
    throw new Error(`Embedding provider rejected the request (HTTP ${response.status})`);
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 2000000) throw new Error("Oversized embedding response");
        chunks.push(chunk.value);
      }
    }
  } finally {
    if (reader) {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  const result = ResponseSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  if (
    (result.model !== config.model &&
      !(config.provider === "lovable" && result.model === "text-embedding-3-small")) ||
    result.data.length !== inputs.length ||
    new Set(result.data.map((r) => r.index)).size !== inputs.length ||
    result.data.some(
      (r) => r.index < 0 || r.index >= inputs.length || !r.embedding.some((v) => v !== 0),
    )
  )
    throw new Error("Embedding profile mismatch");
  return {
    vectors: result.data.sort((a, b) => a.index - b.index).map((r) => r.embedding),
    model: config.model,
    reportedModel: result.model,
    usage: result.usage ?? null,
  };
}
export async function embedQuery(
  input: string,
  config: EmbeddingConfig,
  transport: typeof fetch = fetch,
): Promise<number[]> {
  return (await embedQueries([input], config, transport)).vectors[0];
}
