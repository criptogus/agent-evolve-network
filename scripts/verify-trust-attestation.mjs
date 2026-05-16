#!/usr/bin/env node
// Offline verifier for a trust attestation produced by
// generate-trust-attestation.mjs. Designed to be run by a consumer's security
// team with nothing but: the package file, the .trust.json, and the publisher's
// SIGNING_PUBLIC_KEY.pem. No network, no trust in the hosted registry.
//
// Usage:
//   node scripts/verify-trust-attestation.mjs \
//     --attestation code-reviewer.trust.json \
//     --pkg content/skills/code-reviewer.yaml \
//     --pubkey pub.pem
//
// Exits non-zero if the package was tampered with or the signature is invalid.

import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const args = parse(process.argv.slice(2));
if (!args.attestation || !args.pkg) {
  console.error("Usage: --attestation <file.trust.json> --pkg <package.yaml> [--pubkey <pub.pem>]");
  process.exit(1);
}

const att = JSON.parse(readFileSync(args.attestation, "utf8"));
const pubPem = args.pubkey
  ? readFileSync(args.pubkey, "utf8")
  : process.env.SIGNING_PUBLIC_KEY;
if (!pubPem) {
  console.error("Provide --pubkey <pem> or SIGNING_PUBLIC_KEY env (PEM contents).");
  process.exit(1);
}
const pubKey = createPublicKey(pubPem);
const pubDer = pubKey.export({ format: "der", type: "spki" });
const fingerprint = createHash("sha256").update(pubDer).digest("hex").slice(0, 16);

let failed = 0;

if (fingerprint !== att.signing_key_id) {
  console.error(`✗ public key fingerprint mismatch: attestation=${att.signing_key_id} key=${fingerprint}`);
  failed++;
}

const pkgBytes = readFileSync(args.pkg);
const contentSha256 = createHash("sha256").update(pkgBytes).digest("hex");
if (contentSha256 !== att.content_sha256) {
  console.error(`✗ package content changed since attestation`);
  console.error(`    attested: sha256:${att.content_sha256}`);
  console.error(`    actual:   sha256:${contentSha256}`);
  failed++;
}

const { signature, signing_key_id: _kid, algorithm: _alg, ...payload } = att;
const payloadHash = createHash("sha256").update(stableStringify(payload)).digest("hex");
const sigOk = signature
  ? verify(null, Buffer.from(payloadHash), pubKey, Buffer.from(signature, "base64"))
  : false;
if (!sigOk) {
  console.error(`✗ invalid signature — attestation body does not match the signature`);
  failed++;
}

if (failed > 0) {
  console.error(`\n${failed} verification failure(s). DO NOT trust this package.`);
  process.exit(3);
}

const a = att.adversarial ?? {};
console.log(`✓ trust attestation VERIFIED`);
console.log(`  package:     ${att.package?.type}:${att.package?.slug}@${att.package?.version}`);
console.log(`  content:     sha256:${contentSha256} (matches)`);
console.log(`  attested at: ${att.attested_at}`);
console.log(`  adversarial: ${a.passed}/${a.total} cases passed, severity-weighted ${(((a.severity_weighted_score) ?? 0) * 100).toFixed(1)}%`);
console.log(`  signed by:   key_id=${fingerprint}`);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2), n = argv[i + 1];
    if (!n || n.startsWith("--")) o[k] = true;
    else { o[k] = n; i++; }
  }
  return o;
}
