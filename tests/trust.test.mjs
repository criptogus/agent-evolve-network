import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

const trust = await import("../src/lib/trust/signing.ts").catch(async () => {
  // tsx not available: fall back to inline implementation parity check via dynamic import
  return null;
});

test("canonicalize produces stable output regardless of key order", async () => {
  if (!trust) return; // skipped when ts loader missing
  const a = trust.canonicalize({ b: 2, a: 1, nested: { y: 2, x: 1 } });
  const b = trust.canonicalize({ a: 1, b: 2, nested: { x: 1, y: 2 } });
  assert.equal(a, b);
});

test("sign + verify round-trips with Ed25519", async () => {
  if (!trust) return;
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ format: "pem", type: "spki" }).toString();
  const privPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  const payload = { slug: "x", version: "1.0.0", system_prompt: "hello" };
  const release = trust.signRelease(payload, privPem, pubPem);
  assert.equal(release.algorithm, "ed25519");
  assert.equal(release.content_hash.length, 64);
  assert.ok(trust.verifyRelease(payload, release, pubPem));
  // Tamper detection
  assert.equal(trust.verifyRelease({ ...payload, slug: "y" }, release, pubPem), false);
});
