import { z } from "zod";
export const EMBEDDING_DIMENSIONS = 1536;
const ResponseSchema = z.object({
  model: z.string(),
  data: z
    .array(
      z.object({
        index: z.number().int(),
        embedding: z.array(z.number().finite()).length(EMBEDDING_DIMENSIONS),
      }),
    )
    .length(1),
});
export type EmbeddingConfig = { endpoint: string; key: string; model: string };
export async function embedQuery(
  input: string,
  config: EmbeddingConfig,
  transport: typeof fetch = fetch,
): Promise<number[]> {
  const url = new URL(config.endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash)
    throw new Error("Trusted HTTPS embedding endpoint required");
  if (!input.trim() || input.length > 2000 || !config.key || !config.model)
    throw new Error("Invalid embedding request");
  const response = await transport(url, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      input,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: "float",
    }),
  });
  if (!response.ok) throw new Error("Embedding provider rejected the request");
  const raw = await response.text();
  if (raw.length > 100000) throw new Error("Oversized embedding response");
  const result = ResponseSchema.parse(JSON.parse(raw));
  if (
    result.model !== config.model ||
    result.data[0].index !== 0 ||
    !result.data[0].embedding.some((v) => v !== 0)
  )
    throw new Error("Embedding profile mismatch");
  return result.data[0].embedding;
}
