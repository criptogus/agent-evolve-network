import test from "node:test";
import assert from "node:assert/strict";
import { embedQuery, resolveEmbeddingConfig } from "../src/lib/search/embedding.ts";
const config = {
  endpoint: "https://embeddings.example.invalid/v1/embeddings",
  key: "fixture-secret",
  model: "fixture-1536",
};
test("embedding transport binds model and dimensions, forbids redirects, and uses only supplied query", async () => {
  let calls = 0;
  const vector = Array.from({ length: 1536 }, () => 0.5);
  const transport: typeof fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), config.endpoint);
    assert.equal(init?.redirect, "manual");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      model: config.model,
      input: "Analyze invoices",
      dimensions: 1536,
      encoding_format: "float",
    });
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fixture-secret");
    return new Response(
      JSON.stringify({ model: config.model, data: [{ index: 0, embedding: vector }] }),
    );
  };
  assert.deepEqual(await embedQuery("Analyze invoices", config, transport), vector);
  assert.equal(calls, 1);
  await assert.rejects(
    embedQuery("query", { ...config, endpoint: "http://insecure.invalid" }, transport),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    embedQuery(
      "query",
      config,
      async () => new Response("", { status: 302, headers: { Location: "https://other.invalid" } }),
    ),
  );
  await assert.rejects(
    embedQuery(
      "query",
      config,
      async () =>
        new Response(JSON.stringify({ model: "other", data: [{ index: 0, embedding: vector }] })),
    ),
  );
  await assert.rejects(
    embedQuery(
      "query",
      config,
      async () =>
        new Response(JSON.stringify({ model: config.model, data: [{ index: 0, embedding: [1] }] })),
    ),
  );
});

test("managed Lovable embeddings keep credentials on the fixed gateway and bind the model", async () => {
  const managed = resolveEmbeddingConfig({
    LOVABLE_API_KEY: "managed-fixture",
    SEARCH_EMBEDDING_ENDPOINT: "https://untrusted.invalid",
  });
  assert.equal(managed.endpoint, "https://ai.gateway.lovable.dev/v1/embeddings");
  assert.throws(() => resolveEmbeddingConfig({ SEARCH_EMBEDDING_API_KEY: "external" }));
  const vector = Array.from({ length: 1536 }, () => 0.5);
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), managed.endpoint);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Lovable-API-Key"), "managed-fixture");
    assert.equal(headers.has("Authorization"), false);
    assert.equal(JSON.parse(String(init?.body)).model, "openai/text-embedding-3-small");
    return new Response(
      JSON.stringify({ model: "text-embedding-3-small", data: [{ index: 0, embedding: vector }] }),
    );
  };
  assert.deepEqual(await embedQuery("Public catalog query", managed, transport), vector);
  await assert.rejects(
    embedQuery("query", { ...managed, endpoint: "https://untrusted.invalid" }, transport),
  );
  await assert.rejects(embedQuery("query", { ...managed, model: "other" }, transport));
  assert.equal(calls, 1);
  assert.deepEqual(
    resolveEmbeddingConfig({
      SEARCH_EMBEDDING_PROVIDER: "openai-compatible",
      SEARCH_EMBEDDING_ENDPOINT: config.endpoint,
      SEARCH_EMBEDDING_API_KEY: config.key,
      SEARCH_EMBEDDING_MODEL: config.model,
    }),
    { ...config, provider: "openai-compatible" },
  );
});
