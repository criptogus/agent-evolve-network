import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, createPublicKey, verify } from "node:crypto";

// Mirrors src/lib/plugins/signature.server.ts: keys come from env, the digest
// is signed as an ascii hex string, and the key id is the spki sha256 prefix.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
process.env.SIGNING_PRIVATE_KEY = privateKey.export({ format: "pem", type: "pkcs8" });
process.env.SIGNING_PUBLIC_KEY = publicKey.export({ format: "pem", type: "spki" });

const { signBytes, signatureHeaders, signingKeyId, buildSidecar } = await import(
  "../src/lib/plugins/signature.server.ts"
);

test("signs bytes and the signature verifies against the public key", () => {
  const bytes = new TextEncoder().encode("zip-bytes");
  const sig = signBytes(bytes);

  assert.equal(sig.algorithm, "ed25519");
  assert.equal(sig.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.ok(sig.signature);
  assert.equal(sig.signing_key_id, signingKeyId());

  const ok = verify(
    null,
    Buffer.from(sig.sha256),
    createPublicKey(process.env.SIGNING_PUBLIC_KEY),
    Buffer.from(sig.signature, "base64"),
  );
  assert.equal(ok, true);
});

test("tampered bytes fail verification", () => {
  const sig = signBytes(new TextEncoder().encode("original"));
  const tampered = createHash("sha256").update("tampered").digest("hex");
  const ok = verify(
    null,
    Buffer.from(tampered),
    createPublicKey(process.env.SIGNING_PUBLIC_KEY),
    Buffer.from(sig.signature, "base64"),
  );
  assert.equal(ok, false);
});

test("headers expose hash, signature and key id", () => {
  const h = signatureHeaders(signBytes(new TextEncoder().encode("x")));
  assert.ok(h["X-SAK-Content-SHA256"]);
  assert.ok(h["X-SAK-Signature"]);
  assert.ok(h["X-SAK-Signing-Key-Id"]);
  assert.equal(h["X-SAK-Signature-Algorithm"], "ed25519");
  assert.equal(h["X-SAK-Unsigned-Reason"], undefined);
});

test("sidecar records traceability fields", () => {
  const bytes = new TextEncoder().encode("pkg");
  const sidecar = buildSidecar({
    sig: signBytes(bytes),
    slug: "code-reviewer",
    version: "1.2.0",
    filename: "code-reviewer-agent-plugin.zip",
    bytes: bytes.byteLength,
    origin: "https://superagentskill.com",
  });
  assert.equal(sidecar.spec, "sak-package-signature/v1");
  assert.equal(sidecar.slug, "code-reviewer");
  assert.equal(sidecar.version, "1.2.0");
  assert.equal(sidecar.bytes, bytes.byteLength);
  assert.equal(
    sidecar.verify.public_key_url,
    "https://superagentskill.com/api/public/signing-key.pem",
  );
});

test("missing keys degrade to an unsigned sidecar instead of throwing", async () => {
  const saved = process.env.SIGNING_PRIVATE_KEY;
  delete process.env.SIGNING_PRIVATE_KEY;
  const sig = signBytes(new TextEncoder().encode("y"));
  assert.equal(sig.signature, null);
  assert.match(sig.unsigned_reason ?? "", /not configured/);
  process.env.SIGNING_PRIVATE_KEY = saved;
});
