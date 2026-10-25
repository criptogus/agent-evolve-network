import { createHash } from "node:crypto";
import {
  JEV_MATCH_MODEL,
  JEV_MATCH_PROTOCOL,
  type MatchCandidate,
  type DesiredKit,
} from "./jev-selection.ts";

type Evidence = {
  probabilities: number[];
  model: typeof JEV_MATCH_MODEL;
  requests: number;
  inputTokens: number;
  outputTokens: number;
};
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

// This is opaque cache partitioning, never authentication or authorization.
// No anonymous cross-user cache and no raw token in keys, values or metrics.
export function selectionScope(request: Request, namespace = "agent-match"): string | undefined {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  return token.length >= 32 && token.length <= 8192 ? digest({ token, namespace }) : undefined;
}
export function selectionCacheKey(input: {
  scope: string;
  apiKey: string;
  brief: string;
  vertical?: string;
  catalog: MatchCandidate[];
  desired: DesiredKit;
}) {
  return digest({
    protocol: JEV_MATCH_PROTOCOL,
    model: JEV_MATCH_MODEL,
    scope: input.scope,
    provider: digest(input.apiKey),
    brief: input.brief,
    vertical: input.vertical ?? "",
    catalog: input.catalog.map(({ slug, name, type, description }) => ({
      slug,
      name,
      type,
      description,
    })),
    desired: input.desired,
  });
}
export const selectionEvidenceHash = (value: Evidence) => digest(value);

export function createSelectionCache(
  options: { now?: () => number; ttlMs?: number; maxEntries?: number } = {},
) {
  const now = options.now ?? Date.now,
    ttl = options.ttlMs ?? 300000,
    max = options.maxEntries ?? 64;
  if (
    !Number.isSafeInteger(ttl) ||
    ttl <= 0 ||
    ttl > 300000 ||
    !Number.isSafeInteger(max) ||
    max <= 0 ||
    max > 64
  )
    throw new Error("Invalid selection cache bounds");
  const records = new Map<string, { created: number; value: Evidence }>();
  const copy = (value: Evidence): Evidence => ({
    ...value,
    probabilities: [...value.probabilities],
  });
  const prune = () => {
    const at = now();
    for (const [key, r] of records)
      if (at < r.created || at - r.created >= ttl) records.delete(key);
  };
  return {
    get size() {
      prune();
      return records.size;
    },
    get(key: string) {
      prune();
      const record = records.get(key);
      if (!record) return undefined;
      records.delete(key);
      records.set(key, record);
      return { value: copy(record.value), ageMs: now() - record.created };
    },
    set(key: string, value: Evidence) {
      if (
        !key ||
        value.model !== JEV_MATCH_MODEL ||
        !value.probabilities.length ||
        value.probabilities.length > 800 ||
        value.probabilities.some((p) => !Number.isFinite(p) || p < 0 || p > 1) ||
        ![value.requests, value.inputTokens, value.outputTokens].every(
          (n) => Number.isSafeInteger(n) && n >= 0,
        ) ||
        !value.requests
      )
        throw new Error("Incomplete selection evidence cannot be cached");
      prune();
      records.delete(key);
      if (records.size >= max) {
        const first = records.keys().next().value;
        if (first !== undefined) records.delete(first);
      }
      records.set(key, { created: now(), value: copy(value) });
    },
  };
}
export type SelectionCache = ReturnType<typeof createSelectionCache>;
