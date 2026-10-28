import test from "node:test";
import assert from "node:assert/strict";
import {
  createSelectionCache,
  SELECTION_CACHE_TTL_MS,
  selectionCacheKey,
  selectionScope,
} from "../src/lib/match/jev-selection-cache.server.ts";
import {
  preselectAgentMatch,
  selectionCacheDiagnostics,
} from "../src/lib/match/jev-agent-match.server.ts";
import { JEV_MATCH_MODEL, buildJevRequest } from "../src/lib/match/jev-selection.ts";
const catalog = Array.from({ length: 5 }, (_, i) => ({
  slug: `s-${i}`,
  name: `Skill ${i}`,
  type: "skill" as const,
  description: `Operation ${i}`,
}));
const input = {
  brief: "Audit evidence from supplied documents",
  catalog,
  desired: { skills: 1, playbooks: 0, souls: 0, guardrails: 0 },
  consent: true,
};
const entry = {
  probabilities: [0.99, 0.95, 0.5, 0.01, 0.01],
  model: JEV_MATCH_MODEL,
  requests: 1,
  inputTokens: 100,
  outputTokens: 10,
};
const options = { apiKey: "synthetic-secret", mode: "filter", cacheScope: "opaque-owner-scope" };
test("continuity diagnosis observes the selector instance without calls, secrets or synthetic evidence", () => {
  const token = "synthetic-bearer-".repeat(4);
  const request = new Request("https://example.com", {
    headers: { authorization: `Bearer ${token}` },
  });
  const first = selectionCacheDiagnostics(request, "cohort"),
    second = selectionCacheDiagnostics(request, "cohort");
  assert.equal(first.instanceId, second.instanceId);
  assert.equal(first.firstObservedAt, second.firstObservedAt);
  assert.equal(first.partition, second.partition);
  assert.notEqual(first.partition, selectionCacheDiagnostics(request, "other-cohort").partition);
  assert.notEqual(
    first.partition,
    selectionCacheDiagnostics(
      new Request("https://example.com", {
        headers: { authorization: `Bearer ${"rotated-bearer-".repeat(4)}` },
      }),
      "cohort",
    ).partition,
  );
  assert.equal(
    selectionCacheDiagnostics(new Request("https://example.com"), "cohort").partition,
    null,
  );
  assert.equal(first.entries, second.entries);
  assert.equal(first.providerRequests, 0);
  assert.equal(first.generatorStarted, false);
  assert.equal(first.ttlMs, SELECTION_CACHE_TTL_MS);
  assert.ok(!JSON.stringify(first).includes(token));
});
function responder(counter: { calls: number }): typeof fetch {
  return async () => {
    counter.calls++;
    return new Response(
      JSON.stringify({
        model: JEV_MATCH_MODEL,
        answers: Object.fromEntries(
          entry.probabilities.map((noul, i) => [`c${i}`, { type: "noul", noul }]),
        ),
        usage: { input_tokens: 100, output_tokens: 10 },
      }),
    );
  };
}
test("exact scoped reuse stabilizes selected schema without reusing generated answers or billing twice", async () => {
  const counter = { calls: 0 },
    cache = createSelectionCache();
  const opts = { ...options, cache, fetch: responder(counter) };
  const first = await preselectAgentMatch(input, opts),
    second = await preselectAgentMatch(input, opts);
  assert.equal(counter.calls, 1);
  assert.deepEqual(second.candidates, first.candidates);
  assert.equal(first.trace.requests, 1);
  assert.equal(second.trace.requests, 0);
  assert.equal(second.trace.input_tokens, 0);
  assert.equal(second.trace.output_tokens, 0);
  assert.equal(second.trace.cache?.status, "hit");
  assert.equal(second.trace.cache?.source_input_tokens, 100);
  assert.equal(second.trace.cache?.source_hash, first.trace.cache?.source_hash);
  assert.equal(second.trace.model, JEV_MATCH_MODEL);
  assert.equal(second.trace.usage_complete, true);
});
test("no consent or owner scope, disabled config and changed metadata cannot use another scope cache", async () => {
  const counter = { calls: 0 },
    cache = createSelectionCache(),
    opts = { ...options, cache, fetch: responder(counter) };
  await preselectAgentMatch(input, opts);
  await preselectAgentMatch(input, { ...opts, cacheScope: "other-owner" });
  await preselectAgentMatch(input, { ...opts, cacheScope: undefined });
  await preselectAgentMatch(input, { ...opts, cacheScope: undefined });
  await preselectAgentMatch({ ...input, brief: input.brief + " now" }, opts);
  await preselectAgentMatch(
    {
      ...input,
      catalog: catalog.map((c, i) => (i ? c : { ...c, description: "Changed operation" })),
    },
    opts,
  );
  await preselectAgentMatch({ ...input, desired: { ...input.desired, skills: 2 } }, opts);
  await preselectAgentMatch(input, { ...opts, apiKey: "rotated-secret" });
  assert.equal(counter.calls, 8);
  const revoked = await preselectAgentMatch({ ...input, consent: false }, opts);
  assert.equal(revoked.trace.reason, "not_consented");
  assert.deepEqual(revoked.candidates, catalog);
  assert.equal((await preselectAgentMatch(input, { ...opts, mode: "off" })).trace.requests, 0);
  assert.equal(
    (await preselectAgentMatch(input, { ...opts, apiKey: "" })).trace.reason,
    "not_configured",
  );
});
test("fallback/incomplete evidence is never cached; repeated call really revalidates", async () => {
  const counter = { calls: 0 },
    cache = createSelectionCache();
  const fetcher: typeof fetch = async () => {
    counter.calls++;
    return new Response("bad JSON");
  };
  const first = await preselectAgentMatch(input, { ...options, cache, fetch: fetcher });
  const next = await preselectAgentMatch(input, { ...options, cache, fetch: responder(counter) });
  assert.equal(first.trace.status, "fallback");
  assert.equal(first.trace.usage_complete, false);
  assert.equal(next.trace.requests, 1);
  assert.equal(counter.calls, 2);
});
test("cache expires, bounds memory, rejects invalid evidence and clones records", () => {
  let time = 100;
  const cache = createSelectionCache({ now: () => time, ttlMs: 20, maxEntries: 2 });
  cache.set("a", entry);
  entry.probabilities[0] = 0.98;
  assert.equal(cache.get("a")?.value.probabilities[0], 0.99);
  const got = cache.get("a")!;
  got.value.probabilities[0] = 0;
  assert.equal(cache.get("a")?.value.probabilities[0], 0.99);
  cache.set("b", entry);
  cache.get("a");
  cache.set("c", entry);
  assert.equal(cache.get("b"), undefined);
  time = 121;
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.size, 0);
  assert.throws(() => cache.set("invalid", { ...entry, probabilities: [NaN] }));
  assert.throws(() => createSelectionCache({ maxEntries: 0 }));
  assert.throws(() => createSelectionCache({ ttlMs: SELECTION_CACHE_TTL_MS + 1 }));
});
test("cache identities bind every semantic input and never expose bearer, key or private brief", () => {
  const token = "a".repeat(48);
  const scope = selectionScope(
    new Request("https://example.com", { headers: { authorization: `Bearer ${token}` } }),
  );
  assert.ok(scope);
  assert.notEqual(
    scope,
    selectionScope(
      new Request("https://example.com", { headers: { authorization: `Bearer ${token}` } }),
      "different-cohort",
    ),
  );
  assert.ok(!scope.includes(token));
  assert.equal(selectionScope(new Request("https://example.com")), undefined);
  const key = selectionCacheKey({ ...input, scope: scope!, apiKey: options.apiKey });
  for (const secret of [token, input.brief, options.apiKey]) assert.ok(!key.includes(secret));
  assert.notEqual(key, selectionCacheKey({ ...input, scope: "different", apiKey: options.apiKey }));
  assert.notEqual(
    key,
    selectionCacheKey({ ...input, scope: scope!, vertical: "new", apiKey: options.apiKey }),
  );
  assert.notEqual(
    key,
    selectionCacheKey({
      ...input,
      catalog: [...catalog].reverse(),
      scope: scope!,
      apiKey: options.apiKey,
    }),
  );
});
test("compact relevance questions keep every named candidate and policy without repeating batch metadata", () => {
  const request = buildJevRequest(input.brief, undefined, catalog);
  assert.equal(Object.keys(request.questions).length, catalog.length);
  assert.ok("relevance_policy" in request.state);
  assert.ok(!("candidates" in request.state));
  catalog.forEach((c, i) => assert.deepEqual(request.questions[`c${i}`].instructions.candidate, c));
  assert.match(request.state.relevance_policy, /untrusted/);
  assert.match(request.state.relevance_policy, /partial/);
});

test("unchanged scoped selection survives a normal seven-minute comparison interval and expires at thirty minutes", async () => {
  let time = 0;
  const counter = { calls: 0 },
    cache = createSelectionCache({ now: () => time });
  const opts = { ...options, cache, fetch: responder(counter) };
  await preselectAgentMatch(input, opts);
  time = 7 * 60 * 1000;
  const reused = await preselectAgentMatch(input, opts);
  assert.equal(counter.calls, 1);
  assert.equal(reused.trace.cache?.status, "hit");
  assert.equal(reused.trace.cache?.age_ms, time);
  time = 30 * 60 * 1000;
  const expired = await preselectAgentMatch(input, opts);
  assert.equal(counter.calls, 2);
  assert.notEqual(expired.trace.cache?.status, "hit");
});

test("fresh selector instances await shared storage and reuse the original provider evidence", async () => {
  const records = new Map<string, typeof entry>();
  const persistentStore = () => ({
    async get(key: string) {
      const value = records.get(key);
      return value ? { value: structuredClone(value), ageMs: 426396 } : undefined;
    },
    async set(key: string, value: typeof entry) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
      records.set(key, structuredClone(value));
    },
  });
  const counter = { calls: 0 };
  const first = await preselectAgentMatch(input, {
    ...options,
    cache: persistentStore(),
    fetch: responder(counter),
  });
  assert.equal(records.size, 1, "provider evidence must finish committing before return");
  const afterReplacement = await preselectAgentMatch(input, {
    ...options,
    cache: persistentStore(),
    fetch: responder(counter),
  });
  assert.equal(counter.calls, 1);
  assert.deepEqual(afterReplacement.candidates, first.candidates);
  assert.equal(afterReplacement.trace.cache?.status, "hit");
  assert.equal(afterReplacement.trace.cache?.age_ms, 426396);
  assert.equal(afterReplacement.trace.cache?.source_hash, first.trace.cache?.source_hash);
  assert.equal(afterReplacement.trace.requests, 0);
});
