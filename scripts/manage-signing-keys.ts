#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { parseKeyring, publicKeyId } from "../src/lib/trust/keyring.ts";
const [action, registry, value, ...rest] = process.argv.slice(2);
if (!registry || !value || !["rotate", "revoke"].includes(action))
  throw new Error(
    "Usage: manage-signing-keys.ts rotate REGISTRY PUBLIC_PEM | revoke REGISTRY KEY_ID REASON",
  );
const ring = parseKeyring(JSON.parse(readFileSync(registry, "utf8")));
if (action === "rotate") {
  const pem = readFileSync(value, "utf8");
  const id = publicKeyId(pem);
  if (ring.keys.some((k) => k.id === id))
    throw new Error("Key already registered; revoked keys cannot be reactivated");
  for (const key of ring.keys) if (key.status === "active") key.status = "retired";
  ring.keys.push({ id, public_key: pem, status: "active", not_before: new Date().toISOString() });
} else {
  const key = ring.keys.find((k) => k.id === value);
  if (!key || key.status === "revoked" || !rest.join(" ").trim())
    throw new Error("Known non-revoked key and reason required");
  key.status = "revoked";
  key.revoked_at = new Date().toISOString();
  key.reason = rest.join(" ");
}
parseKeyring(ring);
const temp = registry + ".new";
writeFileSync(temp, JSON.stringify(ring, null, 2) + "\n", { flag: "wx", mode: 0o644 });
renameSync(temp, registry);
console.log(`Updated public key policy (${action}); deploy and distribute it to verifiers.`);
