import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function keys() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    pub: publicKey.export({ format: "pem", type: "spki" }).toString(),
    priv: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
  };
}

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "sas-trust-"));
  const pkg = join(dir, "demo-skill.yaml");
  writeFileSync(pkg, "slug: demo-skill\nname: Demo\ntype: skill\nversion: 1.0.0\n");
  const ev = join(dir, "eval.json");
  writeFileSync(
    ev,
    JSON.stringify({
      package: { type: "skill", slug: "demo-skill", version: "1.0.0" },
      total: 10, passed: 9, failed: 1, pass_rate: 0.9,
      severity_weighted_score: 0.95, by_severity: { high: { total: 4, passed: 4, pass_rate: 1 } },
    }),
  );
  return { dir, pkg, ev, att: join(dir, "demo-skill.trust.json") };
}

function attest(pkg, ev, att, k) {
  return spawnSync(
    "node",
    ["scripts/generate-trust-attestation.mjs", "--pkg", pkg, "--eval", ev, "--out", att],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, SIGNING_PRIVATE_KEY: k.priv, SIGNING_PUBLIC_KEY: k.pub } },
  );
}

function doVerify(att, pkg, pubPem) {
  return spawnSync(
    "node",
    ["scripts/verify-trust-attestation.mjs", "--attestation", att, "--pkg", pkg],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, SIGNING_PUBLIC_KEY: pubPem } },
  );
}

test("attest + verify round-trips", () => {
  const { pkg, ev, att } = fixture();
  const k = keys();
  const a = attest(pkg, ev, att, k);
  assert.equal(a.status, 0, a.stderr);
  const v = doVerify(att, pkg, k.pub);
  assert.equal(v.status, 0, v.stderr);
  assert.match(v.stdout, /VERIFIED/);
  assert.match(v.stdout, /9\/10 cases passed/);
});

test("tampered package fails verification", () => {
  const { pkg, ev, att } = fixture();
  const k = keys();
  attest(pkg, ev, att, k);
  appendFileSync(pkg, "\n# malicious edit\n");
  const v = doVerify(att, pkg, k.pub);
  assert.notEqual(v.status, 0);
  assert.match(v.stderr, /content changed/);
});

test("wrong public key is rejected by fingerprint check", () => {
  const { pkg, ev, att } = fixture();
  const k = keys();
  const k2 = keys();
  attest(pkg, ev, att, k);
  const v = doVerify(att, pkg, k2.pub);
  assert.notEqual(v.status, 0);
  assert.match(v.stderr, /fingerprint mismatch/);
});
