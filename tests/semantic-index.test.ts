import test from "node:test";
import assert from "node:assert/strict";
import { embedQueries, embeddingSourceInput } from "../src/lib/search/embedding.ts";
import { parseIndexJournal } from "../src/lib/search/index-contract.ts";

const config = { endpoint: "https://fixture.invalid/embeddings", key: "fixture", model: "fixture" };
const vector = Array.from({ length: 1536 }, () => 0.5);
test("batch embeddings preserve input order and reject duplicate response indices", async () => {
  const transport: typeof fetch = async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)).input, ["first", "second"]);
    return Response.json({
      model: "fixture",
      data: [
        { index: 1, embedding: vector.map((v) => v * 2) },
        { index: 0, embedding: vector },
      ],
    });
  };
  const result = await embedQueries(["first", "second"], config, transport);
  assert.equal(result.vectors[0][0], 0.5);
  assert.equal(result.vectors[1][0], 1);
  await assert.rejects(
    embedQueries(["first", "second"], config, async () =>
      Response.json({
        model: "fixture",
        data: [
          { index: 0, embedding: vector },
          { index: 0, embedding: vector },
        ],
      }),
    ),
  );
  await assert.rejects(
    embedQueries(["first", "second"], config, async () =>
      Response.json({ model: "fixture", data: [{ index: 0, embedding: vector }] }),
    ),
  );
});
test("invalid and oversized batches fail before provider access", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    throw new Error("Unexpected provider call");
  };
  for (const inputs of [[], Array(26).fill("public"), ["😀".repeat(2001)], [" "]]) {
    await assert.rejects(embedQueries(inputs, config, transport));
  }
  assert.equal(calls, 0);
  await assert.rejects(
    embedQueries(["public"], config, async () => new Response("x".repeat(2000001))),
    /Oversized/,
  );
});
test("canonical source prefix counts Unicode code points and preserves null separators", () => {
  assert.equal(
    embeddingSourceInput({ name: "A", description: null, long_description: "B" }),
    "A\n\nB",
  );
  const source = embeddingSourceInput({
    name: "😀".repeat(2001),
    description: "ignored",
    long_description: null,
  });
  assert.equal(Array.from(source).length, 2000);
  assert.equal(source, "😀".repeat(2000));
});
test("durable index journal rejects duplicate receipts and malformed inflight state", () => {
  const receipt = {
    requestId: "26b299ce-4ab7-433a-b08d-51a1abca739d",
    indexed: 1,
    pendingBefore: 669,
    providerRequests: 1,
    model: "fixture",
    reportedModel: "fixture",
    dimensions: 1536,
    usage: null,
    slugs: ["public"],
  };
  const journal = { status: "checkpoint", model: "fixture", receipts: [receipt] };
  assert.equal(parseIndexJournal(JSON.stringify(journal))?.receipts.length, 1);
  assert.throws(
    () => parseIndexJournal(JSON.stringify({ ...journal, receipts: [receipt, receipt] })),
    /Duplicate/,
  );
  assert.throws(() => parseIndexJournal(JSON.stringify({ ...journal, status: "inflight" })));
  assert.equal(parseIndexJournal(null), null);
});
