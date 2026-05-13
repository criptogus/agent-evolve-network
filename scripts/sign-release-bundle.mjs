#!/usr/bin/env node
// Signs a release bundle produced by build-release-bundles.mjs with Ed25519.
// Emits <bundle>.sig and a SIGNATURES.json sidecar so air-gapped consumers
// can verify integrity offline with scripts/verify-release-bundle.mjs.
//
// Usage:
//   SIGNING_PRIVATE_KEY=$(cat priv.pem) SIGNING_PUBLIC_KEY=$(cat pub.pem) \
//     node scripts/sign-release-bundle.mjs --dir dist/release

import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = parse(process.argv.slice(2));
const dir = args.dir ?? "dist/release";
const { SIGNING_PRIVATE_KEY, SIGNING_PUBLIC_KEY } = process.env;
if (!SIGNING_PRIVATE_KEY || !SIGNING_PUBLIC_KEY) {
  console.error("SIGNING_PRIVATE_KEY and SIGNING_PUBLIC_KEY env vars required (PEM contents).");
  process.exit(1);
}
const priv = createPrivateKey(SIGNING_PRIVATE_KEY);
const pubDer = createPublicKey(SIGNING_PUBLIC_KEY).export({ format: "der", type: "spki" });
const keyId = createHash("sha256").update(pubDer).digest("hex").slice(0, 16);

const sigs = [];
for (const entry of readdirSync(dir)) {
  if (!/\.(zip|tar\.gz|json)$/.test(entry)) continue;
  if (entry === "SIGNATURES.json") continue;
  const full = join(dir, entry);
  if (!statSync(full).isFile()) continue;
  const bytes = readFileSync(full);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const signature = sign(null, Buffer.from(hash), priv).toString("base64");
  writeFileSync(`${full}.sig`, `${signature}\n`);
  sigs.push({ file: entry, sha256: hash, signature, signing_key_id: keyId, algorithm: "ed25519" });
  console.log(`✓ signed ${entry}`);
}

writeFileSync(join(dir, "SIGNATURES.json"), JSON.stringify({
  signed_at: new Date().toISOString(),
  signing_key_id: keyId,
  algorithm: "ed25519",
  files: sigs,
}, null, 2));
writeFileSync(join(dir, "SIGNING_PUBLIC_KEY.pem"), SIGNING_PUBLIC_KEY);
console.log(`\nWrote ${sigs.length} signature(s) + SIGNATURES.json + SIGNING_PUBLIC_KEY.pem (key_id=${keyId})`);

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2), n = argv[i + 1];
    if (!n || n.startsWith("--")) o[k] = true; else { o[k] = n; i++; }
  }
  return o;
}
