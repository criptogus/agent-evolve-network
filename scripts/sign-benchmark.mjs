#!/usr/bin/env node
// Signs (or verifies) a paired-benchmark result so the landing-page numbers
// carry the same offline-verifiable Ed25519 guarantee as package releases:
// "these comparative numbers came from THIS methodology run on THESE inputs".
//
// Sign:
//   node scripts/benchmark-paired.mjs --skill code-reviewer --out benchmark.json   # live run
//   SIGNING_PRIVATE_KEY=$(cat priv.pem) SIGNING_PUBLIC_KEY=$(cat pub.pem) \
//     node scripts/sign-benchmark.mjs --benchmark benchmark.json --out benchmark.signed.json
//
// Verify (no private key needed):
//   node scripts/sign-benchmark.mjs --verify benchmark.signed.json --pubkey pub.pem

import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const args = parse(process.argv.slice(2));

if (args.verify) {
  const signed = JSON.parse(readFileSync(args.verify, "utf8"));
  if (!args.pubkey) {
    console.error("--pubkey <pub.pem> required for --verify");
    process.exit(1);
  }
  const pub = createPublicKey(readFileSync(args.pubkey, "utf8"));
  const { signature, signing_key_id, algorithm, ...payload } = signed;
  void signing_key_id;
  void algorithm;
  const payloadHash = createHash("sha256").update(stableStringify(payload)).digest("hex");
  const ok = verify(null, Buffer.from(payloadHash), pub, Buffer.from(signature, "base64"));
  if (!ok) {
    console.error("✗ signature INVALID");
    process.exit(3);
  }
  console.log("✓ signature valid");
  console.log(`  methodology: ${payload.benchmark?.methodology}  mode: ${payload.benchmark?.mode}`);
  if (payload.benchmark?.mode !== "live") {
    console.error("⚠ mode is not 'live' — a signed MOCK benchmark proves plumbing, not numbers.");
    process.exit(4);
  }
  process.exit(0);
}

const benchPath = args.benchmark;
if (!benchPath) {
  console.error(
    "Usage: --benchmark <benchmark.json> [--out file] | --verify <signed.json> --pubkey pub.pem",
  );
  process.exit(1);
}
const { SIGNING_PRIVATE_KEY, SIGNING_PUBLIC_KEY } = process.env;
if (!SIGNING_PRIVATE_KEY || !SIGNING_PUBLIC_KEY) {
  console.error("SIGNING_PRIVATE_KEY and SIGNING_PUBLIC_KEY env vars required (PEM contents).");
  process.exit(1);
}

const benchmark = JSON.parse(readFileSync(benchPath, "utf8"));
if (benchmark.mode !== "live") {
  console.error(
    "✗ refusing to sign a mock benchmark. Run benchmark-paired.mjs without --mock first.",
  );
  process.exit(2);
}

const priv = createPrivateKey(SIGNING_PRIVATE_KEY);
const pubDer = createPublicKey(SIGNING_PUBLIC_KEY).export({ format: "der", type: "spki" });
const keyId = createHash("sha256").update(pubDer).digest("hex").slice(0, 16);

const payload = {
  schema_version: 1,
  attested_at: new Date().toISOString(),
  benchmark,
  benchmark_sha256: createHash("sha256").update(readFileSync(benchPath)).digest("hex"),
};
const payloadHash = createHash("sha256").update(stableStringify(payload)).digest("hex");
const signature = sign(null, Buffer.from(payloadHash), priv).toString("base64");
const out = args.out ?? benchPath.replace(/\.json$/, "") + ".signed.json";
writeFileSync(
  out,
  `${JSON.stringify({ ...payload, signing_key_id: keyId, algorithm: "ed25519", signature }, null, 2)}\n`,
);
console.log(`✓ signed benchmark written: ${out} (key_id=${keyId})`);

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
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
