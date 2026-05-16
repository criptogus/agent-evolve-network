#!/usr/bin/env node
// Produces a signed, independently-verifiable trust attestation for a single
// package. It binds the package's exact content hash + version to the result
// of the adversarial harness, signed with the same Ed25519 release key
// (sign-release-bundle.mjs). A security team can hand the attestation +
// the package file to verify-trust-attestation.mjs and confirm offline that
// "this exact file passed N adversarial cases at score X" — no need to trust
// the hosted Trust Score endpoint.
//
// Usage:
//   node scripts/eval-adversarial.mjs --skill code-reviewer --mock --out eval.json
//   SIGNING_PRIVATE_KEY=$(cat priv.pem) SIGNING_PUBLIC_KEY=$(cat pub.pem) \
//     node scripts/generate-trust-attestation.mjs \
//       --pkg content/skills/code-reviewer.yaml --eval eval.json

import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const args = parse(process.argv.slice(2));
const pkgPath = args.pkg;
const evalPath = args.eval;
if (!pkgPath || !evalPath) {
  console.error("Usage: --pkg <package.yaml> --eval <eval-report.json> [--out <file>]");
  process.exit(1);
}

const { SIGNING_PRIVATE_KEY, SIGNING_PUBLIC_KEY } = process.env;
if (!SIGNING_PRIVATE_KEY || !SIGNING_PUBLIC_KEY) {
  console.error("SIGNING_PRIVATE_KEY and SIGNING_PUBLIC_KEY env vars required (PEM contents).");
  process.exit(1);
}
const priv = createPrivateKey(SIGNING_PRIVATE_KEY);
const pubDer = createPublicKey(SIGNING_PUBLIC_KEY).export({ format: "der", type: "spki" });
const keyId = createHash("sha256").update(pubDer).digest("hex").slice(0, 16);

const pkgBytes = readFileSync(pkgPath);
const pkgText = pkgBytes.toString("utf8");
const contentSha256 = createHash("sha256").update(pkgBytes).digest("hex");

// Top-level scalar fields only — enough to cross-check identity against the
// eval report. Avoids a YAML dependency so this stays in lockstep with the
// dependency-free offline verifier.
function topScalar(key) {
  const m = pkgText.match(new RegExp(`^${key}:[ \\t]*["']?([^"'\\n#]+?)["']?[ \\t]*(?:#.*)?$`, "m"));
  return m ? m[1].trim() : undefined;
}
const pkgSlug = topScalar("slug");
const pkgVersion = topScalar("version");
const pkgType = topScalar("type");

const report = JSON.parse(readFileSync(evalPath, "utf8"));
const rp = report.package ?? {};
if (rp.slug && pkgSlug && rp.slug !== pkgSlug) {
  console.error(`✗ eval report is for slug "${rp.slug}" but package file is "${pkgSlug}"`);
  process.exit(2);
}
if (rp.version && pkgVersion && rp.version !== pkgVersion) {
  console.error(`✗ eval report is for version "${rp.version}" but package file is "${pkgVersion}"`);
  process.exit(2);
}

const payload = {
  schema_version: 1,
  attested_at: new Date().toISOString(),
  package: {
    type: pkgType ?? rp.type ?? null,
    slug: pkgSlug ?? rp.slug ?? null,
    version: pkgVersion ?? rp.version ?? null,
    file: basename(pkgPath),
  },
  content_sha256: contentSha256,
  adversarial: {
    total: report.total ?? 0,
    passed: report.passed ?? 0,
    failed: report.failed ?? 0,
    pass_rate: report.pass_rate ?? 0,
    severity_weighted_score: report.severity_weighted_score ?? 0,
    by_severity: report.by_severity ?? {},
  },
};

const canonical = stableStringify(payload);
const payloadHash = createHash("sha256").update(canonical).digest("hex");
const signature = sign(null, Buffer.from(payloadHash), priv).toString("base64");

const attestation = { ...payload, signing_key_id: keyId, algorithm: "ed25519", signature };
const outPath = args.out ?? `${payload.package.slug ?? "package"}.trust.json`;
writeFileSync(outPath, `${JSON.stringify(attestation, null, 2)}\n`);

console.log(`✓ trust attestation written: ${outPath}`);
console.log(`  package:   ${payload.package.type}:${payload.package.slug}@${payload.package.version}`);
console.log(`  content:   sha256:${contentSha256.slice(0, 16)}…`);
console.log(`  adversarial: ${payload.adversarial.passed}/${payload.adversarial.total} cases, score ${(payload.adversarial.severity_weighted_score * 100).toFixed(1)}%`);
console.log(`  signed by:  key_id=${keyId}`);

// Deterministic JSON: object keys sorted recursively so the signed bytes are
// reproducible regardless of insertion order.
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
