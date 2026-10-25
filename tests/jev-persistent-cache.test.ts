import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../src/integrations/supabase/database.ts";
import { createPersistentSelectionCache } from "../src/lib/match/jev-persistent-cache.server.ts";
import { preselectAgentMatch } from "../src/lib/match/jev-agent-match.server.ts";
import { JEV_MATCH_MODEL } from "../src/lib/match/jev-selection.ts";
import { SELECTION_CACHE_TTL_MS } from "../src/lib/match/jev-selection-cache.server.ts";

const scope = "a".repeat(64),
  key = "b".repeat(64);
const evidence = {
  probabilities: [0.98],
  model: JEV_MATCH_MODEL,
  requests: 1,
  inputTokens: 472,
  outputTokens: 21,
};
const rpcEvidence = z
  .object({
    probabilities: z.array(z.number()),
    model: z.literal(JEV_MATCH_MODEL),
    requests: z.number().int(),
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
  })
  .strict();
const rpcInput = z.union([
  z.object({ p_scope_hash: z.string(), p_cache_key: z.string() }).strict(),
  z.object({ p_scope_hash: z.string(), p_cache_key: z.string(), p_evidence: rpcEvidence }).strict(),
]);
const clientFor = (fetcher: typeof fetch) =>
  createClient<Database>("https://cache.invalid", "synthetic-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetcher },
  });

test("independent server clients reuse validated shared RPC evidence without another model request", async () => {
  let time = 0,
    calls = 0;
  const records = new Map<string, { evidence: typeof evidence; at: number }>();
  const transport: typeof fetch = async (url, init) => {
    const sent = rpcInput.parse(JSON.parse(String(init?.body)));
    assert.deepEqual(
      Object.keys(sent).sort(),
      String(url).endsWith("read_agent_match_selection_cache")
        ? ["p_cache_key", "p_scope_hash"]
        : ["p_cache_key", "p_evidence", "p_scope_hash"],
    );
    const identity = `${sent.p_scope_hash}:${sent.p_cache_key}`;
    if (String(url).endsWith("read_agent_match_selection_cache")) {
      const row = records.get(identity);
      return Response.json(row ? [{ evidence: row.evidence, age_ms: time - row.at }] : []);
    }
    assert.ok("p_evidence" in sent);
    if (!records.has(identity)) records.set(identity, { evidence: sent.p_evidence, at: time });
    return Response.json(true);
  };
  const provider: typeof fetch = async () => {
    calls++;
    return Response.json({
      model: JEV_MATCH_MODEL,
      answers: { c0: { type: "noul", noul: 0.98 } },
      usage: { input_tokens: 472, output_tokens: 21 },
    });
  };
  const input = {
    brief: "Verify citations against original source evidence",
    consent: true,
    catalog: [
      {
        slug: "citation-checker",
        name: "Citation Checker",
        type: "skill" as const,
        description: "Verifies that quoted facts truly appear in the cited source.",
      },
    ],
    desired: { skills: 1, playbooks: 0, souls: 0, guardrails: 0 },
  };
  const options = {
    apiKey: "private-synthetic-provider-key",
    mode: "filter",
    cacheScope: scope,
    fetch: provider,
  };
  const first = await preselectAgentMatch(input, {
    ...options,
    cache: createPersistentSelectionCache(clientFor(transport), scope),
  });
  time = 426396;
  const otherWorker = await preselectAgentMatch(input, {
    ...options,
    cache: createPersistentSelectionCache(clientFor(transport), scope),
  });
  assert.equal(calls, 1);
  assert.deepEqual(first.candidates, otherWorker.candidates);
  assert.equal(otherWorker.trace.requests, 0);
  assert.equal(otherWorker.trace.cache?.status, "hit");
  assert.equal(otherWorker.trace.cache?.age_ms, time);
  assert.equal(otherWorker.trace.cache?.source_hash, first.trace.cache?.source_hash);
  assert.ok(!JSON.stringify([...records]).includes(input.brief));
  assert.ok(!JSON.stringify([...records]).includes(options.apiKey));
  time = SELECTION_CACHE_TTL_MS;
  await preselectAgentMatch(input, {
    ...options,
    cache: createPersistentSelectionCache(clientFor(transport), scope),
  });
  assert.equal(calls, 2, "expired evidence must never prune a fresh request");
});

test("malformed, extended, expired or wrong-model database evidence is never reused", async () => {
  for (const row of [
    { evidence: { ...evidence, model: "other-model" }, age_ms: 1 },
    { evidence: { ...evidence, probabilities: [] }, age_ms: 1 },
    { evidence: { ...evidence, probabilities: [1.1] }, age_ms: 1 },
    { evidence: { ...evidence, requests: 0 }, age_ms: 1 },
    { evidence: { ...evidence, inputTokens: 1.5 }, age_ms: 1 },
    { evidence: { ...evidence, privateBrief: "must not be stored" }, age_ms: 1 },
    { evidence, age_ms: -1 },
    { evidence, age_ms: SELECTION_CACHE_TTL_MS },
  ]) {
    const store = createPersistentSelectionCache(
      clientFor(async () => Response.json([row])),
      scope,
    );
    assert.equal(await store.get(key), undefined);
    assert.equal(store.metrics.unavailable, 1);
  }
});

test("database failure and cancellation are cache misses, not fake hits or provider usage", async () => {
  const unavailable = createPersistentSelectionCache(
    clientFor(async () => new Response("Unavailable", { status: 503 })),
    scope,
  );
  assert.equal(await unavailable.get(key), undefined);
  assert.equal(unavailable.metrics.unavailable, 1);
  const cancel = createPersistentSelectionCache(
    clientFor(async (_url, init) => {
      await new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) reject(init.signal.reason);
        else
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true,
          });
      });
      return Response.json([]);
    }),
    scope,
  );
  const started = performance.now();
  assert.equal(await cancel.get(key, AbortSignal.timeout(10)), undefined);
  assert.ok(performance.now() - started < 500);
  assert.equal(cancel.metrics.unavailable, 1);
});

test("unknown identities and unvalidated evidence reject before any database write", async () => {
  let calls = 0;
  const client = clientFor(async () => {
    calls++;
    return Response.json(true);
  });
  assert.throws(() => createPersistentSelectionCache(client, "raw-token"));
  const store = createPersistentSelectionCache(client, scope);
  await assert.rejects(() =>
    Promise.resolve(store.set(key, { ...evidence, probabilities: [NaN] })),
  );
  await assert.rejects(() => Promise.resolve(store.set("invalid-key", evidence)));
  assert.equal(calls, 0);
});
