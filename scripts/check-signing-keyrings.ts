#!/usr/bin/env node
// Signing keyring hygiene check (CI-blocking, docs/SIGNING-KEYS.md).
//
// An unparseable ring, a fingerprint mismatch or the loss of the single active
// key each break the guarantee behind every "verified" artifact we publish, so
// this fails the build instead of shipping an anchorless trust system (the
// empty-ring state previously made signature verification forgeable).
import { readFileSync } from "node:fs";
import { parseKeyring } from "../src/lib/trust/keyring.ts";

const RINGS = ["security/signing-keys.json", "security/content-signing-keys.json"];

let failed = false;
for (const path of RINGS) {
  try {
    const ring = parseKeyring(JSON.parse(readFileSync(path, "utf8")));
    const active = ring.keys.filter((k) => k.status === "active");
    if (active.length !== 1) {
      console.error(`✗ ${path}: expected exactly ONE active key, found ${active.length}`);
      failed = true;
    } else {
      console.log(`✓ ${path}: ${ring.keys.length} key(s), active ${active[0].id}`);
    }
  } catch (error) {
    console.error(`✗ ${path}: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

if (failed) process.exit(1);
