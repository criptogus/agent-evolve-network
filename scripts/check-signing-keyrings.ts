#!/usr/bin/env node
// Signing keyring hygiene check (CI-blocking, see docs/SIGNING-KEYS.md).
//
// Deliberately DEPENDENCY-FREE (node:crypto + node:fs only): it runs in the
// secret-scan job, which has no node_modules installed. An unparseable ring, a
// fingerprint mismatch or the loss of the single active key each break the
// guarantee behind every "verified" artifact we publish — so this fails the
// build instead of shipping an anchorless trust system (the empty-ring state
// previously made signature verification forgeable).
//
// Checks per ring:
//   1. valid JSON with spec "sak-signing-keyring/v1";
//   2. every key has a 16-char id that matches sha256(spki DER) prefix;
//   3. status is one of active | retired | revoked;
//   4. exactly ONE active key (rotation retires the previous one first);
//   5. revoked keys carry a reason (audit trail requirement).

import { readFileSync } from "node:fs";
import { createHash, createPublicKey } from "node:crypto";

const RINGS = ["security/signing-keys.json", "security/content-signing-keys.json"];
const SPEC = "sak-signing-keyring/v1";
const STATUSES = new Set(["active", "retired", "revoked"]);

interface KeyringKey {
  id?: unknown;
  public_key?: unknown;
  status?: unknown;
  not_before?: unknown;
  revoked_reason?: unknown;
}

function fingerprint(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ format: "der", type: "spki" }) as Buffer;
  return createHash("sha256").update(der).digest("hex").slice(0, 16);
}

let failed = false;

for (const path of RINGS) {
  let ringFailed = false;
  const fail = (message: string) => {
    console.error(`✗ ${path}: ${message}`);
    ringFailed = true;
    failed = true;
  };
  let ring: { spec?: unknown; keys?: unknown };
  try {
    ring = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read/parse: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  if (ring.spec !== SPEC) {
    fail(`spec must be "${SPEC}", got ${JSON.stringify(ring.spec)}`);
    continue;
  }
  if (!Array.isArray(ring.keys)) {
    fail('"keys" must be an array');
    continue;
  }

  let active = 0;
  ring.keys.forEach((key: KeyringKey, index: number) => {
    const at = `keys[${index}]`;
    if (typeof key.id !== "string" || !/^[0-9a-f]{16}$/.test(key.id)) {
      fail(`${at}.id must be a 16-char hex fingerprint`);
      return;
    }
    if (typeof key.public_key !== "string" || !key.public_key.includes("BEGIN PUBLIC KEY")) {
      fail(`${at}.public_key must be a PEM public key`);
      return;
    }
    let actual: string;
    try {
      actual = fingerprint(key.public_key);
    } catch (error) {
      fail(`${at}.public_key is not a valid key: ${String(error)}`);
      return;
    }
    if (actual !== key.id) {
      fail(`${at}.id ${key.id} does not match key fingerprint ${actual}`);
      return;
    }
    if (typeof key.status !== "string" || !STATUSES.has(key.status)) {
      fail(`${at}.status must be one of ${[...STATUSES].join(" | ")}`);
      return;
    }
    if (key.status === "active") {
      active++;
      if (typeof key.not_before !== "string" || Number.isNaN(Date.parse(key.not_before))) {
        fail(`${at}.not_before must be an ISO timestamp for an ACTIVE key`);
      }
    }
    if (
      key.status === "revoked" &&
      (typeof key.revoked_reason !== "string" || !key.revoked_reason.trim())
    ) {
      fail(`${at}.revoked_reason is required (audit trail)`);
    }
  });

  if (active !== 1) fail(`expected exactly ONE active key, found ${active}`);
  if (!ringFailed) console.log(`✓ ${path}: ${ring.keys.length} key(s), active key verified`);
}

process.exit(failed ? 1 : 0);
