#!/usr/bin/env node
/**
 * Verifies a downloaded SAK marketplace package (.zip) against its detached
 * signature sidecar (sak-package-signature/v1).
 *
 * Usage:
 *   node scripts/verify-package-signature.mjs <file.zip> <signature.json> [public-key.pem]
 *
 * Without a local PEM the public key is fetched from the sidecar's
 * `verify.public_key_url`. Exit code 0 = verified, 1 = failed.
 */
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [zipPath, sidecarPath, pemPath] = process.argv.slice(2);
if (!zipPath || !sidecarPath) {
  console.error("usage: verify-package-signature.mjs <file.zip> <signature.json> [public-key.pem]");
  process.exit(1);
}

const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8"));
const bytes = readFileSync(zipPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");

if (sha256 !== sidecar.sha256) {
  console.error(`✗ hash mismatch\n  expected ${sidecar.sha256}\n  actual   ${sha256}`);
  process.exit(1);
}
if (!sidecar.signature || !sidecar.signing_key_id) {
  console.error(`✗ sidecar carries no signature (${sidecar.unsigned_reason ?? "unknown reason"})`);
  process.exit(1);
}

const pem = pemPath
  ? readFileSync(pemPath, "utf8")
  : await fetch(sidecar.verify.public_key_url).then((r) => {
      if (!r.ok) throw new Error(`public key fetch failed: HTTP ${r.status}`);
      return r.text();
    });

const pub = createPublicKey(pem);
const der = pub.export({ format: "der", type: "spki" });
const keyId = createHash("sha256").update(der).digest("hex").slice(0, 16);
if (keyId !== sidecar.signing_key_id) {
  console.error(`✗ key id mismatch: sidecar=${sidecar.signing_key_id} key=${keyId}`);
  process.exit(1);
}

const ok = verify(null, Buffer.from(sha256), pub, Buffer.from(sidecar.signature, "base64"));
if (!ok) {
  console.error("✗ signature invalid");
  process.exit(1);
}

console.log(
  `✓ verified ${sidecar.filename} (${sidecar.slug}${sidecar.version ? ` v${sidecar.version}` : ""})\n` +
    `  sha256  ${sha256}\n  key id  ${keyId}\n  signed  ${sidecar.signed_at}`,
);
