/**
 * Tiny per-Worker-isolate TTL cache with single-flight de-duplication.
 *
 * - `get(key)` returns cached payload if still fresh
 * - `getOrLoad(key, loader)` returns fresh cache, joins an in-flight load,
 *   or runs the loader (deduped by key). On loader failure, falls back to
 *   stale cache when present so the UI doesn't break.
 *
 * In-memory only — survives across requests within the same isolate, which
 * is plenty to absorb traffic spikes for hot listings/details.
 */
export type TtlCache<V> = {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  invalidate(key?: string): void;
  getOrLoad(key: string, loader: () => Promise<V>): Promise<V>;
};

type Entry<V> = { at: number; value: V };

export function createTtlCache<V>(ttlMs: number, opts?: { max?: number }): TtlCache<V> {
  const max = opts?.max ?? 500;
  const store = new Map<string, Entry<V>>();
  const inflight = new Map<string, Promise<V>>();

  function isFresh(e: Entry<V> | undefined): e is Entry<V> {
    return !!e && Date.now() - e.at < ttlMs;
  }

  function set(key: string, value: V) {
    if (store.size >= max) {
      // Evict oldest first (Map preserves insertion order)
      const first = store.keys().next().value;
      if (first !== undefined) store.delete(first);
    }
    store.set(key, { at: Date.now(), value });
  }

  return {
    get(key) {
      const e = store.get(key);
      return isFresh(e) ? e.value : undefined;
    },
    set,
    invalidate(key) {
      if (key === undefined) store.clear();
      else store.delete(key);
    },
    async getOrLoad(key, loader) {
      const fresh = store.get(key);
      if (isFresh(fresh)) return fresh.value;
      const pending = inflight.get(key);
      if (pending) return pending;
      const p = loader()
        .then((value) => {
          set(key, value);
          return value;
        })
        .catch((err) => {
          // Serve stale on failure when available
          const stale = store.get(key);
          if (stale) return stale.value;
          throw err;
        })
        .finally(() => {
          inflight.delete(key);
        });
      inflight.set(key, p);
      return p;
    },
  };
}
