import { createHash } from "node:crypto";
import type { AppDatabaseClient } from "../../integrations/supabase/database.ts";
import { embedQuery } from "./embedding.ts";
const cache = new Map<string, { expires: number; vector: number[] }>();
export async function semanticSearch(
  client: AppDatabaseClient,
  actor: string,
  query: string,
  limit: number,
  offset: number,
  type?: string | null,
) {
  const endpoint = process.env.SEARCH_EMBEDDING_ENDPOINT;
  const key = process.env.SEARCH_EMBEDDING_API_KEY;
  const model = process.env.SEARCH_EMBEDDING_MODEL;
  if (process.env.SEMANTIC_SEARCH_ENABLED !== "true" || !endpoint || !key || !model)
    throw new Error("Semantic search is not configured");
  const identity = createHash("sha256")
    .update(JSON.stringify([actor, query, endpoint, key, model]))
    .digest("hex");
  const now = Date.now();
  for (const [id, v] of cache) if (v.expires <= now) cache.delete(id);
  let vector = cache.get(identity)?.vector;
  if (!vector) {
    const { data: allowed, error } = await client.rpc("reserve_semantic_query", { _actor: actor });
    if (error || !allowed) throw new Error("Daily semantic query allowance reached");
    vector = await embedQuery(query, { endpoint, key, model });
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
    cache.set(identity, { expires: now + 300000, vector });
  }
  const { data, error } = await client.rpc("search_packages_semantic", {
    _query: JSON.stringify(vector),
    _model: model,
    _limit: Math.min(50, Math.max(1, Math.floor(limit))),
    _offset: Math.max(0, Math.floor(offset)),
    _type: type || undefined,
  });
  if (error) throw new Error("Semantic index is unavailable");
  return data ?? [];
}
