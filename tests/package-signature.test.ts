import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, createPublicKey, verify } from "node:crypto";
import { parseKeyring } from "../src/lib/trust/keyring.ts";

// Mirrors src/lib/plugins/signature.server.ts: keys come from env, the digest
// is signed as an ascii hex string, and the key id is the spki sha256 prefix.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
process.env.SIGNING_PRIVATE_KEY = privateKey.export({ format: "pem", type: "pkcs8" });
process.env.SIGNING_PUBLIC_KEY = publicKey.export({ format: "pem", type: "spki" });

// Tests pass their own keyring so production key rotation cannot break them.
const testRing = parseKeyring({
  spec: "sak-signing-keyring/v1",
  keys: [
    {
      id: createHash("sha256")
        .update(
          createPublicKey(process.env.SIGNING_PUBLIC_KEY).export({ format: "der", type: "spki" }),
        )
        .digest("hex")
        .slice(0, 16),
      public_key: process.env.SIGNING_PUBLIC_KEY,
      status: "active",
      not_before: "2026-01-01T00:00:00Z",
    },
  ],
});

const { signBytes, signatureHeaders, signingKeyId, buildSidecar, contentDigest, buildEmbeddedSignature } =
  await import("../src/lib/plugins/signature.server.ts");

test("signs bytes and the signature verifies against the public key", () => {
  const bytes = new TextEncoder().encode("zip-bytes");
  const sig = signBytes(bytes, testRing);

  assert.equal(sig.algorithm, "ed25519");
  assert.equal(sig.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.ok(sig.signature);
  assert.equal(sig.signing_key_id, signingKeyId(testRing));

  const ok = verify(
    null,
    Buffer.from(sig.sha256),
    createPublicKey(process.env.SIGNING_PUBLIC_KEY),
    Buffer.from(sig.signature, "base64"),
  );
  assert.equal(ok, true);
});

test("tampered bytes fail verification", () => {
  const sig = signBytes(new TextEncoder().encode("original"), testRing);
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
  const h = signatureHeaders(signBytes(new TextEncoder().encode("x"), testRing));
  assert.ok(h["X-SAK-Content-SHA256"]);
  assert.ok(h["X-SAK-Signature"]);
  assert.ok(h["X-SAK-Signing-Key-Id"]);
  assert.equal(h["X-SAK-Signature-Algorithm"], "ed25519");
  assert.equal(h["X-SAK-Unsigned-Reason"], undefined);
});

test("sidecar records traceability fields", () => {
  const bytes = new TextEncoder().encode("pkg");
  const sidecar = buildSidecar({
    sig: signBytes(bytes, testRing),
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
  const sig = signBytes(new TextEncoder().encode("y"), testRing);
  assert.equal(sig.signature, null);
  assert.match(sig.unsigned_reason ?? "", /not configured/);
  process.env.SIGNING_PRIVATE_KEY = saved;
});

test("fail-closed: a key outside the registered keyring signs nothing", async () => {
  const stranger = generateKeyPairSync("ed25519");
  const savedPriv = process.env.SIGNING_PRIVATE_KEY;
  const savedPub = process.env.SIGNING_PUBLIC_KEY;
  // Swap in a full stranger pair: public key is not in the ring, private does
  // not even pair with it — both defenses must refuse to sign.
  process.env.SIGNING_PRIVATE_KEY = stranger.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  process.env.SIGNING_PUBLIC_KEY = stranger.publicKey.export({ format: "pem", type: "spki" }).toString();
  const sig = signBytes(new TextEncoder().encode("forgery-attempt"), testRing);
  assert.equal(sig.signature, null);
  assert.match(sig.unsigned_reason ?? "", /not registered in the deployment keyring/);
  process.env.SIGNING_PRIVATE_KEY = savedPriv;
  process.env.SIGNING_PUBLIC_KEY = savedPub;

  // And an empty ring is a configuration error surfaced in unsigned_reason.
  const empty = parseKeyring({ spec: "sak-signing-keyring/v1", keys: [] });
  const sigEmpty = signBytes(new TextEncoder().encode("x"), empty);
  assert.equal(sigEmpty.signature, null);
  assert.match(sigEmpty.unsigned_reason ?? "", /not registered in the deployment keyring/);
});

test("content digest is stable, order-independent and tamper-evident", async () => {
  const { contentDigest, signDigest, buildEmbeddedSignature } =
    await import("../src/lib/plugins/signature.server.ts");
  const a = contentDigest([
    ["plugin.json", "{}"],
    ["skills/x/SKILL.md", "# x"],
  ]);
  const b = contentDigest([
    ["skills/x/SKILL.md", "# x"],
    ["plugin.json", "{}"],
  ]);
  assert.equal(a.digest, b.digest);
  assert.deepEqual(
    a.files.map((f) => f.path),
    ["plugin.json", "skills/x/SKILL.md"],
  );

  const tampered = contentDigest([
    ["plugin.json", "{}"],
    ["skills/x/SKILL.md", "# x (injected)"],
  ]);
  assert.notEqual(a.digest, tampered.digest);

  // Ed25519 is deterministic: identical payload => identical embedded file.
  const args = {
    slug: "x",
    version: "1.0.0",
    files: [["plugin.json", "{}"]],
    publicKeyUrl: "/k.pem",
  };
  assert.equal(buildEmbeddedSignature(args), buildEmbeddedSignature(args));
  assert.equal(signDigest(a.digest).signature, signDigest(a.digest).signature);
  assert.ok(!buildEmbeddedSignature(args).includes("signed_at"));
});
