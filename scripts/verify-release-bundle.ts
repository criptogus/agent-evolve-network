#!/usr/bin/env node
// Offline verifier for signed release bundles. Designed to be vendored into
// air-gapped environments alongside the bundle and SIGNING_PUBLIC_KEY.pem.
//
// Usage:
//   node scripts/verify-release-bundle.ts --dir ./bundle
// Exits non-zero on any tampered file or missing signature.

import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseKeyring, assertTrustedKey } from "../src/lib/trust/keyring.ts";

const args = parse(process.argv.slice(2));
const dir = args.dir ?? ".";
const manifestPath = join(dir, "SIGNATURES.json");
const pubKeyPath = args.pubkey ?? join(dir, "SIGNING_PUBLIC_KEY.pem");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const pubPem = readFileSync(pubKeyPath, "utf8");
const pubKey = createPublicKey(pubPem);
const pubDer = pubKey.export({ format: "der", type: "spki" });
const fingerprint = createHash("sha256").update(pubDer).digest("hex").slice(0, 16);

if (fingerprint !== manifest.signing_key_id) {
  console.error(
    `✗ public key fingerprint mismatch: bundle=${manifest.signing_key_id} key=${fingerprint}`,
  );
  process.exit(2);
}

const manifestHash = createHash("sha256").update(readFileSync(manifestPath)).digest("hex");
const manifestSignature = readFileSync(join(dir, "SIGNATURES.json.sig"), "utf8").trim();
if (!verify(null, Buffer.from(manifestHash), pubKey, Buffer.from(manifestSignature, "base64")))
  throw new Error("Signature manifest was modified");
if (args["trusted-key-id"] && args["trusted-key-id"] !== fingerprint)
  throw new Error("Pinned signing identity mismatch");

if (!Array.isArray(manifest.files) || !manifest.files.length)
  throw new Error("Empty signature manifest");
const names = new Set<string>();
for (const f of manifest.files) {
  if (
    typeof f.file !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(f.file) ||
    names.has(f.file)
  )
    throw new Error("Unsafe or duplicate signed filename");
  names.add(f.file);
}
if (args.keyring)
  assertTrustedKey(parseKeyring(JSON.parse(readFileSync(args.keyring, "utf8"))), pubPem, "verify");
let failed = 0;
for (const f of manifest.files) {
  const path = join(dir, f.file);
  try {
    statSync(path);
  } catch {
    console.error(`✗ missing file: ${f.file}`);
    failed++;
    continue;
  }
  const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (hash !== f.sha256) {
    console.error(`✗ ${f.file}: sha256 mismatch (bundle=${f.sha256} actual=${hash})`);
    failed++;
    continue;
  }
  const ok = verify(null, Buffer.from(hash), pubKey, Buffer.from(f.signature, "base64"));
  if (!ok) {
    console.error(`✗ ${f.file}: invalid signature`);
    failed++;
    continue;
  }
  console.log(`✓ ${f.file}`);
}

if (failed > 0) {
  console.error(`\n${failed} verification failure(s).`);
  process.exit(3);
}
console.log(`\n✓ all ${manifest.files.length} file(s) verified against key_id=${fingerprint}`);

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2),
      n = argv[i + 1];
    if (!n || n.startsWith("--")) o[k] = true;
    else {
      o[k] = n;
      i++;
    }
  }
  return o;
}
