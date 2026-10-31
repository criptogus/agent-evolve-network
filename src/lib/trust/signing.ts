import configuredKeyring from "../../../security/signing-keys.json" with { type: "json" };
import { parseKeyring, assertTrustedKey, type SigningKeyring } from "./keyring.ts";
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

// Canonicalization: stable key ordering so two equivalent YAML payloads hash identically.
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

export function contentHash(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

export function keyFingerprint(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ format: "der", type: "spki" }) as Buffer;
  return createHash("sha256").update(der).digest("hex").slice(0, 16);
}

export interface SignedRelease {
  content_hash: string;
  signature: string; // base64
  signing_key_id: string; // 16-char fingerprint
  algorithm: "ed25519";
}

// Fails closed: with no trusted key registered, "verified by SuperAgentSkill"
// would be forgeable by anyone, so both signing and verification abort with an
// actionable error instead of silently operating anchor-less. Callers that run
// against a different policy (tests, BYO deployments) may pass an explicit
// ring; every production caller uses the committed one.
function requireTrustedRing(ring: SigningKeyring): SigningKeyring {
  if (!ring.keys.filter((k) => k.status === "active").length) {
    throw new Error(
      "No active key in security/signing-keys.json — register one first: " +
        "openssl genpkey -algorithm ed25519 -> " +
        "node scripts/manage-signing-keys.ts rotate security/signing-keys.json pub.pem " +
        "(see docs/SIGNING-KEYS.md)",
    );
  }
  return ring;
}

export function signRelease(
  payload: unknown,
  privateKeyPem: string,
  publicKeyPem: string,
  ring: SigningKeyring = parseKeyring(configuredKeyring),
): SignedRelease {
  assertTrustedKey(requireTrustedRing(ring), publicKeyPem, "sign");
  const hash = contentHash(payload);
  const key = createPrivateKey(privateKeyPem);
  // Ed25519 signs the data directly (no separate hash function arg).
  const signature = sign(null, Buffer.from(hash), key).toString("base64");
  return {
    content_hash: hash,
    signature,
    signing_key_id: keyFingerprint(publicKeyPem),
    algorithm: "ed25519",
  };
}

export function verifyRelease(
  payload: unknown,
  release: SignedRelease,
  publicKeyPem: string,
  ring: SigningKeyring = parseKeyring(configuredKeyring),
): boolean {
  try {
    assertTrustedKey(requireTrustedRing(ring), publicKeyPem, "verify");
  } catch {
    return false;
  }
  const hash = contentHash(payload);
  if (hash !== release.content_hash) return false;
  if (keyFingerprint(publicKeyPem) !== release.signing_key_id) return false;
  return verify(
    null,
    Buffer.from(hash),
    createPublicKey(publicKeyPem),
    Buffer.from(release.signature, "base64"),
  );
}
