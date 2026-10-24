import test from "node:test";
import assert from "node:assert/strict";
import {
  buildJevRequest,
  JEV_MATCH_MODEL,
  selectMatchCandidates,
  type MatchCandidate,
} from "../src/lib/match/jev-selection.ts";
import { preselectAgentMatch } from "../src/lib/match/jev-agent-match.server.ts";
const catalog: MatchCandidate[] = Array.from({ length: 8 }, (_, i) => ({
  slug: `skill-${i}`,
  name: `Skill ${i}`,
  type: "skill",
  description: `Public description ${i}`,
}));
const input = {
  brief: "Compare the source evidence and identify inconsistencies",
  catalog,
  desired: { skills: 1, playbooks: 0, souls: 0, guardrails: 0 },
  consent: true,
};
function response(probabilities = [0.99, 0.95, 0.5, 0.01, 0.01, 0.01, 0.01, 0.01]) {
  return {
    model: JEV_MATCH_MODEL,
    answers: Object.fromEntries(probabilities.map((p, i) => [`c${i}`, { type: "noul", noul: p }])),
    usage: { input_tokens: 100, output_tokens: 20 },
  };
}
function transport(payload: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(payload), { status });
}
const options = { apiKey: "synthetic-server-secret", mode: "filter" };

test("Jev consent and configuration gates make zero external calls", async () => {
  const forbidden: typeof fetch = async () => {
    throw new Error("Must not call");
  };
  for (const [consent, mode, key, reason] of [
    [false, "filter", "key", "not_consented"],
    [true, "off", "key", "disabled"],
    [true, "invalid", "key", "disabled"],
    [true, "filter", "", "not_configured"],
  ] as const) {
    const result = await preselectAgentMatch(
      { ...input, consent },
      { apiKey: key, mode, fetch: forbidden },
    );
    assert.equal(result.trace.reason, reason);
    assert.equal(result.trace.requests, 0);
    assert.deepEqual(result.candidates, catalog);
  }
});

test("Jev adapter uses only fixed TypeSafe endpoint, rejects redirects and records actual usage", async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.typesafe.ai/v1/systemone");
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${options.apiKey}`);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, JEV_MATCH_MODEL);
    assert.equal(body.state.candidates.length, catalog.length);
    assert.equal(Object.keys(body.questions).length, catalog.length);
    assert.ok(!String(init?.body).includes(options.apiKey));
    return new Response(JSON.stringify(response()));
  };
  const result = await preselectAgentMatch(input, { ...options, fetch: fetcher });
  assert.deepEqual(
    result.candidates.map((c) => c.slug),
    ["skill-0", "skill-1", "skill-2"],
  );
  assert.equal(result.trace.input_tokens, 100);
  assert.equal(result.trace.output_tokens, 20);
  assert.equal(result.trace.usage_complete, true);
  assert.equal(result.trace.forwarded_count, 3);
  assert.equal(result.trace.model, JEV_MATCH_MODEL);
  assert.ok(!JSON.stringify(result.trace).includes(options.apiKey));
});

test("shadow mode measures selection while forwarding the full original catalog", async () => {
  const result = await preselectAgentMatch(input, {
    ...options,
    mode: "shadow",
    fetch: transport(response()),
  });
  assert.deepEqual(result.candidates, catalog);
  assert.equal(result.trace.selected_count, 3);
  assert.equal(result.trace.forwarded_count, 8);
});

test("uncertainty, no match and missing per-type coverage retain the full catalog", () => {
  assert.deepEqual(
    selectMatchCandidates(
      catalog,
      catalog.map(() => 0.5),
      input.desired,
    ).candidates,
    catalog,
  );
  assert.deepEqual(
    selectMatchCandidates(
      catalog,
      catalog.map(() => 0.01),
      input.desired,
    ).candidates,
    catalog,
  );
  const mixed: MatchCandidate[] = [
    ...catalog,
    {
      slug: "required-guardrail",
      name: "Safety",
      type: "guardrail",
      description: "Required boundary",
    },
  ];
  assert.deepEqual(
    selectMatchCandidates(mixed, [...catalog.map(() => 0.99), 0.01], {
      ...input.desired,
      guardrails: 1,
    }).candidates,
    mixed,
  );
  assert.throws(() => selectMatchCandidates(catalog, [0.9], input.desired), /Incomplete/);
});

test("provider errors, drift, malformed probabilities, missing/extra answers and usage cannot prune", async () => {
  const good = response();
  const broken = [
    { ...good, model: "jev-latest" },
    { ...good, model: "jev-1.15.0" },
    { ...good, answers: { c0: { type: "noul", noul: 0.99 } } },
    { ...good, answers: { ...good.answers, unknown: { type: "noul", noul: 1 } } },
    { ...good, answers: { ...good.answers, c0: { type: "noul", noul: 1.1 } } },
    { ...good, usage: { input_tokens: -1, output_tokens: 1 } },
    { ...good, usage: null },
    { ...good, leaked: options.apiKey },
  ];
  for (const payload of broken) {
    const result = await preselectAgentMatch(input, { ...options, fetch: transport(payload) });
    assert.deepEqual(result.candidates, catalog);
    assert.equal(result.trace.status, "fallback");
    assert.equal(result.trace.usage_complete, false);
  }
  for (const status of [401, 429, 500, 529]) {
    const result = await preselectAgentMatch(input, { ...options, fetch: transport({}, status) });
    assert.deepEqual(result.candidates, catalog);
    assert.equal(result.trace.requests, 1);
  }
});

test("deadline, network failure and oversized responses fall back without retries", async () => {
  const slow: typeof fetch = async (_, init) =>
    new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
  for (const fetcher of [
    slow,
    (async () => {
      throw new Error("network");
    }) as typeof fetch,
    transport("x".repeat(65000)),
  ]) {
    const result = await preselectAgentMatch(input, { ...options, timeoutMs: 5, fetch: fetcher });
    assert.deepEqual(result.candidates, catalog);
    assert.equal(result.trace.requests, 1);
    assert.equal(result.trace.status, "fallback");
  }
});

test("bounded batching preserves catalog order and never sends over forty candidates", async () => {
  const large = Array.from({ length: 201 }, (_, i) => ({ ...catalog[0], slug: `candidate-${i}` }));
  let active = 0;
  let maxActive = 0;
  const fetcher: typeof fetch = async (_, init) => {
    active++;
    maxActive = Math.max(active, maxActive);
    const body = JSON.parse(String(init?.body));
    assert.ok(body.state.candidates.length <= 40);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--;
    return new Response(JSON.stringify(response(body.state.candidates.map(() => 0.99))));
  };
  const result = await preselectAgentMatch(
    { ...input, catalog: large },
    { ...options, fetch: fetcher },
  );
  assert.deepEqual(result.candidates, large);
  assert.equal(result.trace.requests, 6);
  assert.ok(maxActive <= 4);
  assert.equal(result.trace.input_tokens, 600);
});

test("invalid catalogs and input boundaries reject empty/no-op and secret-bearing work", async () => {
  assert.throws(() => buildJevRequest("", undefined, catalog), /Invalid/);
  assert.throws(() => buildJevRequest(input.brief, undefined, []), /Invalid/);
  const result = await preselectAgentMatch(
    { ...input, brief: options.apiKey },
    { ...options, fetch: transport(response()) },
  );
  assert.equal(result.trace.requests, 0);
  assert.equal(result.trace.status, "fallback");
  for (const invalid of [
    [],
    [...catalog, catalog[0]],
    Array.from({ length: 801 }, (_, i) => ({ ...catalog[0], slug: `x-${i}` })),
  ]) {
    const rejected = await preselectAgentMatch({ ...input, catalog: invalid }, options);
    assert.equal(rejected.trace.requests, 0);
    assert.equal(rejected.trace.status, "fallback");
  }
});

test("a single failed batch never produces a partial filtered catalog", async () => {
  const large = Array.from({ length: 90 }, (_, i) => ({ ...catalog[0], slug: `candidate-${i}` }));
  const fetcher: typeof fetch = async (_, init) => {
    const body = JSON.parse(String(init?.body));
    if (body.state.candidates[0].slug === "candidate-40") return new Response("bad JSON");
    return new Response(JSON.stringify(response(body.state.candidates.map(() => 0.01))));
  };
  const result = await preselectAgentMatch(
    { ...input, catalog: large },
    { ...options, fetch: fetcher },
  );
  assert.deepEqual(result.candidates, large);
  assert.equal(result.trace.status, "fallback");
  assert.equal(result.trace.usage_complete, false);
});

test("question identity is explicit rather than relying on numeric array indirection", () => {
  const request = buildJevRequest(input.brief, undefined, catalog);
  catalog.forEach((candidate, i) => {
    assert.ok(request.questions[`c${i}`].instructions.includes(candidate.name));
    assert.ok(request.questions[`c${i}`].instructions.includes(candidate.slug));
  });
});
