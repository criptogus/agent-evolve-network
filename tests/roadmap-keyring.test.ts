import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { parseKeyring, publicKeyId, assertTrustedKey } from "../src/lib/trust/keyring.ts";
function key() {
  return String(generateKeyPairSync("ed25519").publicKey.export({ format: "pem", type: "spki" }));
}
test("signing rotation preserves historical verification but prevents retired and revoked signing", () => {
  const old = key(),
    next = key();
  const base = {
    spec: "sak-signing-keyring/v1",
    keys: [
      {
        id: publicKeyId(old),
        public_key: old,
        status: "retired",
        not_before: "2026-01-01T00:00:00Z",
      },
      {
        id: publicKeyId(next),
        public_key: next,
        status: "active",
        not_before: "2026-01-01T00:00:00Z",
      },
    ],
  };
  const ring = parseKeyring(base);
  assertTrustedKey(ring, next, "sign");
  assertTrustedKey(ring, old, "verify");
  assert.throws(() => assertTrustedKey(ring, old, "sign"));
  ring.keys[0].status = "revoked";
  ring.keys[0].revoked_at = new Date().toISOString();
  ring.keys[0].reason = "compromised";
  assert.throws(() => assertTrustedKey(parseKeyring(ring), old, "verify"));
  assert.throws(() => assertTrustedKey(ring, key(), "verify"));
  assert.throws(() => parseKeyring({ ...base, keys: [base.keys[1], base.keys[1]] }));
});
test("key policy rejects mismatched identity, invalid validity and premature use", () => {
  const pem = key();
  const record = {
    id: publicKeyId(pem),
    public_key: pem,
    status: "active",
    not_before: "2026-01-01T00:00:00Z",
  };
  assert.throws(() =>
    parseKeyring({ spec: "sak-signing-keyring/v1", keys: [{ ...record, id: "0".repeat(16) }] }),
  );
  const ring = parseKeyring({ spec: "sak-signing-keyring/v1", keys: [record] });
  assert.throws(() => assertTrustedKey(ring, pem, "sign", new Date("2025-01-01")));
});

test("public key registration never accepts private material", () => {
  const privatePem = String(
    generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" }),
  );
  assert.throws(() => publicKeyId(privatePem), /public-only/);
});
