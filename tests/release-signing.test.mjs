import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function makeBundle() {
  const dir = mkdtempSync(join(tmpdir(), "sas-bundle-"));
  writeFileSync(join(dir, "skills-v1.0.0.zip"), "fake-skill-content");
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ version: "v1.0.0" }));
  return dir;
}

function keys() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    pub: publicKey.export({ format: "pem", type: "spki" }).toString(),
    priv: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
  };
}

test("sign + verify round-trips a bundle", () => {
  const dir = makeBundle();
  const { pub, priv } = keys();
  const sign = spawnSync("node", ["scripts/sign-release-bundle.mjs", "--dir", dir], {
    cwd: ROOT, encoding: "utf8",
    env: { ...process.env, SIGNING_PRIVATE_KEY: priv, SIGNING_PUBLIC_KEY: pub },
  });
  assert.equal(sign.status, 0, sign.stderr);
  const verify = spawnSync("node", ["scripts/verify-release-bundle.mjs", "--dir", dir], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.equal(verify.status, 0, verify.stderr);
});

test("tampered file fails verification", () => {
  const dir = makeBundle();
  const { pub, priv } = keys();
  spawnSync("node", ["scripts/sign-release-bundle.mjs", "--dir", dir], {
    cwd: ROOT, env: { ...process.env, SIGNING_PRIVATE_KEY: priv, SIGNING_PUBLIC_KEY: pub },
  });
  appendFileSync(join(dir, "skills-v1.0.0.zip"), "TAMPERED");
  const verify = spawnSync("node", ["scripts/verify-release-bundle.mjs", "--dir", dir], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.notEqual(verify.status, 0);
  assert.match(verify.stderr, /sha256 mismatch/);
});

test("wrong public key is rejected by fingerprint check", () => {
  const dir = makeBundle();
  const { pub, priv } = keys();
  const { pub: pub2 } = keys();
  spawnSync("node", ["scripts/sign-release-bundle.mjs", "--dir", dir], {
    cwd: ROOT, env: { ...process.env, SIGNING_PRIVATE_KEY: priv, SIGNING_PUBLIC_KEY: pub },
  });
  writeFileSync(join(dir, "SIGNING_PUBLIC_KEY.pem"), pub2);
  const verify = spawnSync("node", ["scripts/verify-release-bundle.mjs", "--dir", dir], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.notEqual(verify.status, 0);
  assert.match(verify.stderr, /fingerprint mismatch/);
});
