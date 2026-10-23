import { test } from "node:test";
import assert from "node:assert/strict";
import { trustTier } from "../src/lib/marketplace/trust-tiers.ts";
import { signupDestination, signupError } from "../src/lib/auth/signup.ts";
import { responseOutcome, rpcOutcome } from "../src/lib/mcp/outcome.ts";

test("missing evidence is not a failing grade or verification", () => {
  assert.equal(trustTier(0, false, 0), "unscored");
  assert.equal(trustTier(0.99, true, null), "unscored");
  assert.equal(trustTier(0.9, false, 0.2), "insufficient");
  assert.equal(trustTier(0.1, false, 0.9), "insufficient");
  assert.equal(trustTier(0.9, true, 0.9), "verified");
  assert.equal(trustTier(0.1, true, 0.9), "low");
});
test("return path preserves the OAuth query but rejects external redirects", () => {
  assert.equal(
    signupDestination("/oauth/authorize?state=abc&client_id=test"),
    "/oauth/authorize?state=abc&client_id=test",
  );
  for (const bad of [
    undefined,
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\n/evil",
    "/\t/evil",
  ])
    assert.equal(signupDestination(bad), "/home");
  assert.match(signupError("Password is known to be weak and easy to guess"), /unique passphrase/);
  assert.equal(signupError("Email is invalid"), "Email is invalid");
});
test("MCP transport success does not hide protocol or tool failures", async () => {
  for (const payload of [
    { id: 1, error: { code: -32601 } },
    { id: 1, result: { isError: true } },
    { id: 1, result: { content: [{ type: "text", text: '{"error":"database unavailable"}' }] } },
  ]) {
    assert.equal(await responseOutcome(Response.json(payload), 1), "failed");
  }
  assert.equal(rpcOutcome({ id: 2, result: {} }, 1), "unknown");
  assert.equal(await responseOutcome(new Response("forbidden", { status: 403 }), 1), "failed");
  assert.equal(
    await responseOutcome(Response.json({ id: 1, result: { content: [] } }), 1),
    "succeeded",
  );
});
test("SSE inspection leaves the original client stream intact", async () => {
  const body = 'event: message\r\ndata: {"jsonrpc":"2.0","id":7,"result":{"content":[]}}\r\n\r\n';
  const response = new Response(body, { headers: { "content-type": "text/event-stream" } });
  assert.equal(await responseOutcome(response, 7), "succeeded");
  assert.equal(await response.text(), body);
});
test("malformed and oversized output never counts as success", async () => {
  assert.equal(
    await responseOutcome(
      new Response("invalid", { headers: { "content-type": "application/json" } }),
      1,
    ),
    "unknown",
  );
  assert.equal(
    await responseOutcome(Response.json({ id: 1, result: { text: "x".repeat(70000) } }), 1),
    "unknown",
  );
});
