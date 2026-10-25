#!/usr/bin/env node
// Signs a release bundle produced by build-release-bundles.ts with Ed25519.
// Emits <bundle>.sig and a SIGNATURES.json sidecar so air-gapped consumers
// can verify integrity offline with scripts/verify-release-bundle.ts.
//
// Usage:
//   SIGNING_PRIVATE_KEY=$(cat priv.pem) SIGNING_PUBLIC_KEY=$(cat pub.pem) \
//     node scripts/sign-release-bundle.ts --dir dist/release

import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseKeyring, assertTrustedKey } from "../src/lib/trust/keyring.ts";

const args = parse(process.argv.slice(2));
const dir = args.dir ?? "dist/release";
const { SIGNING_PRIVATE_KEY, SIGNING_PUBLIC_KEY } = process.env;
if (!SIGNING_PRIVATE_KEY || !SIGNING_PUBLIC_KEY) {
  console.error("SIGNING_PRIVATE_KEY and SIGNING_PUBLIC_KEY env vars required (PEM contents).");
  process.exit(1);
}
const priv = createPrivateKey(SIGNING_PRIVATE_KEY);
const derived = createPublicKey(priv).export({ format: "pem", type: "spki" });
if (
  String(derived).trim() !==
  String(createPublicKey(SIGNING_PUBLIC_KEY).export({ format: "pem", type: "spki" })).trim()
)
  throw new Error("Signing key pair does not match");
if (priv.asymmetricKeyType !== "ed25519") throw new Error("Ed25519 signing key required");
const pubDer = createPublicKey(SIGNING_PUBLIC_KEY).export({ format: "der", type: "spki" });
const keyId = createHash("sha256").update(pubDer).digest("hex").slice(0, 16);

const candidates = readdirSync(dir).filter(
  (entry) => /\.(zip|tar\.gz|json|mjs)$/.test(entry) && entry !== "SIGNATURES.json",
);
if (!candidates.some((entry) => /\.(zip|tar\.gz)$/.test(entry)))
  throw new Error("No release archives to sign");
if (args.keyring)
  assertTrustedKey(
    parseKeyring(JSON.parse(readFileSync(args.keyring, "utf8"))),
    SIGNING_PUBLIC_KEY,
    "sign",
  );
const sigs = [];
for (const entry of readdirSync(dir)) {
  if (!/\.(zip|tar\.gz|json|mjs)$/.test(entry)) continue;
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

writeFileSync(
  join(dir, "SIGNATURES.json"),
  JSON.stringify(
    {
      signed_at: new Date().toISOString(),
      signing_key_id: keyId,
      algorithm: "ed25519",
      files: sigs,
    },
    null,
    2,
  ),
);
const manifestHash = createHash("sha256")
  .update(readFileSync(join(dir, "SIGNATURES.json")))
  .digest("hex");
writeFileSync(
  join(dir, "SIGNATURES.json.sig"),
  sign(null, Buffer.from(manifestHash), priv).toString("base64") + "\n",
);
writeFileSync(join(dir, "SIGNING_PUBLIC_KEY.pem"), SIGNING_PUBLIC_KEY);
console.log(
  `\nWrote ${sigs.length} signature(s) + SIGNATURES.json + SIGNING_PUBLIC_KEY.pem (key_id=${keyId})`,
);

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
