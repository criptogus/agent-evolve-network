import { z } from "zod";
import type { AppDatabaseClient } from "../../integrations/supabase/database.ts";
import { JEV_MATCH_MODEL } from "./jev-selection.ts";
import { SELECTION_CACHE_TTL_MS, type SelectionCacheStore } from "./jev-selection-cache.server.ts";

const identity = z.string().regex(/^[a-f0-9]{64}$/);
const tokenCount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const evidenceSchema = z
  .object({
    probabilities: z.array(z.number().finite().min(0).max(1)).min(1).max(800),
    model: z.literal(JEV_MATCH_MODEL),
    requests: z.number().int().min(1).max(20),
    inputTokens: tokenCount,
    outputTokens: tokenCount,
  })
  .strict();
const rowSchema = z.object({
  evidence: evidenceSchema,
  age_ms: z.number().int().nonnegative().lt(SELECTION_CACHE_TTL_MS),
});

// Backend service-role RPCs only. Keys bind the fresh eligible catalog, exact
// semantic inputs, credential scope, provider key, model and selector protocol.
export function createPersistentSelectionCache(client: AppDatabaseClient, scopeHash: string) {
  identity.parse(scopeHash);
  const metrics = { reads: 0, writes: 0, unavailable: 0 };
  const signalFor = (signal?: AbortSignal) =>
    signal ? AbortSignal.any([signal, AbortSignal.timeout(500)]) : AbortSignal.timeout(500);
  const store: SelectionCacheStore = {
    async get(key, signal) {
      identity.parse(key);
      metrics.reads++;
      try {
        const { data, error } = await client
          .rpc("read_agent_match_selection_cache", {
            p_scope_hash: scopeHash,
            p_cache_key: key,
          })
          .abortSignal(signalFor(signal));
        if (error) {
          metrics.unavailable++;
          return undefined;
        }
        if (!data?.length) return undefined;
        const parsed = rowSchema.safeParse(data.length === 1 ? data[0] : null);
        if (!parsed.success) {
          metrics.unavailable++;
          return undefined;
        }
        return { value: parsed.data.evidence, ageMs: parsed.data.age_ms };
      } catch {
        metrics.unavailable++;
        return undefined;
      }
    },
    async set(key, value, signal) {
      identity.parse(key);
      const evidence = evidenceSchema.parse(value);
      metrics.writes++;
      try {
        const { data, error } = await client
          .rpc("write_agent_match_selection_cache", {
            p_scope_hash: scopeHash,
            p_cache_key: key,
            p_evidence: evidence,
          })
          .abortSignal(signalFor(signal));
        if (error || data !== true) metrics.unavailable++;
      } catch {
        metrics.unavailable++;
      }
    },
  };
  return { ...store, metrics };
}
