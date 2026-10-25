import test from "node:test";
import assert from "node:assert/strict";
import { embedQuery } from "../src/lib/search/embedding.ts";
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
