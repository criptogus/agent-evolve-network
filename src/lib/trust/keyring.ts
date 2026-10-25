import { createHash, createPublicKey } from "node:crypto";
import { z } from "zod";
export const KeyringSchema = z.object({
  spec: z.literal("sak-signing-keyring/v1"),
  keys: z
    .array(
      z.object({
        id: z.string().regex(/^[a-f0-9]{16}$/),
        public_key: z.string().min(40),
        status: z.enum(["active", "retired", "revoked"]),
        not_before: z.string().datetime(),
        not_after: z.string().datetime().optional(),
        revoked_at: z.string().datetime().optional(),
        reason: z.string().min(1).max(500).optional(),
      }),
    )
    .max(100),
});
export type SigningKeyring = z.infer<typeof KeyringSchema>;
export function publicKeyId(pem: string) {
  if (!pem.includes("-----BEGIN PUBLIC KEY-----") || pem.includes("PRIVATE KEY"))
    throw new Error("A public-only PEM is required");
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Only Ed25519 keys are supported");
  return createHash("sha256")
    .update(key.export({ format: "der", type: "spki" }))
    .digest("hex")
    .slice(0, 16);
}
export function parseKeyring(value: unknown): SigningKeyring {
  const ring = KeyringSchema.parse(value);
  if (new Set(ring.keys.map((k) => k.id)).size !== ring.keys.length)
    throw new Error("Duplicate signing key");
  for (const key of ring.keys) {
    if (publicKeyId(key.public_key) !== key.id) throw new Error("Key fingerprint mismatch");
    if (key.status === "revoked" && (!key.revoked_at || !key.reason))
      throw new Error("Revocation requires timestamp and reason");
    if (key.not_after && Date.parse(key.not_after) <= Date.parse(key.not_before))
      throw new Error("Invalid key validity interval");
  }
  if (ring.keys.filter((k) => k.status === "active").length > 1)
    throw new Error("Only one signing key may be active");
  return ring;
}
export function assertTrustedKey(
  ring: SigningKeyring,
  pem: string,
  mode: "sign" | "verify",
  now = new Date(),
) {
  const id = publicKeyId(pem);
  const record = ring.keys.find((k) => k.id === id);
  if (!record || record.status === "revoked" || (mode === "sign" && record.status !== "active"))
    throw new Error("Unknown, revoked or inactive signing key");
  if (
    now.getTime() < Date.parse(record.not_before) ||
    (record.not_after && now.getTime() >= Date.parse(record.not_after))
  )
    throw new Error("Signing key is outside its validity interval");
  return id;
}
