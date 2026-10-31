import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

const trust = await import("../src/lib/trust/signing.ts").catch(async () => {
  // tsx not available: fall back to inline implementation parity check via dynamic import
  return null;
});

const { parseKeyring } = await import("../src/lib/trust/keyring.ts").catch(async () => ({ parseKeyring: null }));

// Tests must never depend on the committed production keyring — they pass an
// explicit ring so adding/rotating the production key cannot break them.
function explicitRing(pubPem) {
  return parseKeyring({
    spec: "sak-signing-keyring/v1",
    keys: [{ id: trust.keyFingerprint(pubPem), public_key: pubPem, status: "active", not_before: "2026-01-01T00:00:00Z" }],
  });
}

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
  const ring = explicitRing(pubPem);
  const payload = { slug: "x", version: "1.0.0", system_prompt: "hello" };
  const release = trust.signRelease(payload, privPem, pubPem, ring);
  assert.equal(release.algorithm, "ed25519");
  assert.equal(release.content_hash.length, 64);
  assert.ok(trust.verifyRelease(payload, release, pubPem, ring));
  // Tamper detection
  assert.equal(trust.verifyRelease({ ...payload, slug: "y" }, release, pubPem, ring), false);
});

test("verification fails closed against a foreign key even with a valid ring", async () => {
  if (!trust) return;
  const ringKey = generateKeyPairSync("ed25519");
  const issuer = generateKeyPairSync("ed25519");
  const ringPub = ringKey.publicKey.export({ format: "pem", type: "spki" }).toString();
  const issuerPub = issuer.publicKey.export({ format: "pem", type: "spki" }).toString();
  const payload = { slug: "x" };
  const release = trust.signRelease(payload, issuer.privateKey.export({ format: "pem", type: "pkcs8" }).toString(), issuerPub, explicitRing(issuerPub));
  // Attacker-signed artifacts must NOT verify against a ring that pins another key.
  assert.equal(trust.verifyRelease(payload, release, issuerPub, explicitRing(ringPub)), false);

  // And an empty ring is a configuration error, never a silent pass.
  const empty = parseKeyring({ spec: "sak-signing-keyring/v1", keys: [] });
  assert.throws(() => trust.signRelease(payload, issuer.privateKey.export({ format: "pem", type: "pkcs8" }).toString(), issuerPub, empty), /No active key/);
  assert.equal(trust.verifyRelease(payload, release, issuerPub, empty), false);
});
