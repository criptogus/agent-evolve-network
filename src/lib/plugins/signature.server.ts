/**
 * Detached Ed25519 signatures for downloadable marketplace packages (.zip).
 *
 * Integrity: the signature covers the sha256 of the exact bytes we served.
 * Traceability: the sidecar records slug, version, key id and timestamp, so a
 * downloaded bundle can be traced back to a specific published release.
 *
 * Server-only (node:crypto + process.env). Keys are read inside the functions,
 * never at module scope.
 */
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";

export type PackageSignature = {
  algorithm: "ed25519";
  sha256: string;
  /** base64 detached signature over the ascii sha256 hex digest. */
  signature: string | null;
  signing_key_id: string | null;
  signed_at: string;
  /** Present when signing keys are not configured. */
  unsigned_reason?: string;
};

export type SignatureSidecar = PackageSignature & {
  spec: "sak-package-signature/v1";
  slug: string;
  version: string | null;
  filename: string;
  bytes: number;
  /** Container-independent payload digest, also signed. */
  content_digest?: string;
  content_signature?: string | null;
  files?: { path: string; sha256: string }[];
  verify: {
    public_key_url: string;
    instructions: string;
  };
};

export const SIGNING_PUBLIC_KEY_PATH = "/api/public/signing-key.pem";

function pem(name: "SIGNING_PRIVATE_KEY" | "SIGNING_PUBLIC_KEY"): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  // Secret managers commonly store PEMs with escaped newlines.
  const value = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  return value.trim() ? value : undefined;
}

export function signingKeyId(): string | null {
  const pub = pem("SIGNING_PUBLIC_KEY");
  if (!pub) return null;
  try {
    const der = createPublicKey(pub).export({ format: "der", type: "spki" }) as Buffer;
    return createHash("sha256").update(der).digest("hex").slice(0, 16);
  } catch {
    return null;
  }
}

export function publicSigningKeyPem(): string | null {
  return pem("SIGNING_PUBLIC_KEY") ?? null;
}

/** Signs raw bytes. Never throws: an unsigned download beats a 500. */
export function signBytes(bytes: Uint8Array): PackageSignature {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const base: PackageSignature = {
    algorithm: "ed25519",
    sha256,
    signature: null,
    signing_key_id: null,
    signed_at: new Date().toISOString(),
  };

  const priv = pem("SIGNING_PRIVATE_KEY");
  const keyId = signingKeyId();
  if (!priv || !keyId) {
    return { ...base, unsigned_reason: "signing keys are not configured on this deployment" };
  }
  try {
    // Ed25519 signs the message directly; we sign the ascii hex digest so the
    // sidecar's sha256 and the signature payload are the same value.
    const signature = sign(null, Buffer.from(sha256), createPrivateKey(priv)).toString("base64");
    return { ...base, signature, signing_key_id: keyId };
  } catch (err) {
    return {
      ...base,
      unsigned_reason: `signing failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

export type FileDigest = { path: string; sha256: string };

/**
 * Content digest over the package payload, independent of zip container bytes:
 * sha256 of sorted "path\0<sha256>\n" lines. Survives re-zipping, so a repacked
 * or extracted copy can still be proven authentic.
 */
export function contentDigest(files: Iterable<[string, string]>): {
  digest: string;
  files: FileDigest[];
} {
  const list: FileDigest[] = [...files]
    .map(([path, contents]) => ({
      path,
      sha256: createHash("sha256").update(contents, "utf8").digest("hex"),
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const digest = createHash("sha256")
    .update(list.map((f) => `${f.path}\0${f.sha256}\n`).join(""))
    .digest("hex");
  return { digest, files: list };
}

/** Ed25519 is deterministic, so the same digest always yields the same signature. */
export function signDigest(digestHex: string): { signature: string | null; signing_key_id: string | null } {
  const priv = pem("SIGNING_PRIVATE_KEY");
  const keyId = signingKeyId();
  if (!priv || !keyId) return { signature: null, signing_key_id: null };
  try {
    return {
      signature: sign(null, Buffer.from(digestHex), createPrivateKey(priv)).toString("base64"),
      signing_key_id: keyId,
    };
  } catch {
    return { signature: null, signing_key_id: null };
  }
}

/**
 * SIGNATURE.json embedded inside the archive. Intentionally has no timestamp:
 * the bundle must stay byte-identical across downloads so the detached sidecar
 * hash keeps matching.
 */
export function buildEmbeddedSignature(input: {
  slug: string;
  version: string | null;
  files: Iterable<[string, string]>;
  publicKeyUrl: string;
}): string {
  const { digest, files } = contentDigest(input.files);
  const signed = signDigest(digest);
  return `${JSON.stringify(
    {
      spec: "sak-package-signature/v1",
      algorithm: "ed25519",
      slug: input.slug,
      version: input.version,
      content_digest: digest,
      signature: signed.signature,
      signing_key_id: signed.signing_key_id,
      files,
      verify: {
        public_key_url: input.publicKeyUrl,
        note: "content_digest = sha256 of sorted `path\\0<file sha256>\\n` lines (this file excluded); signature is Ed25519 over the ascii digest.",
      },
    },
    null,
    2,
  )}\n`;
}

/** Response headers so clients can verify without a second request. */
export function signatureHeaders(sig: PackageSignature): Record<string, string> {
  const h: Record<string, string> = {
    "X-SAK-Content-SHA256": sig.sha256,
    "X-SAK-Signature-Algorithm": sig.algorithm,
    "X-SAK-Signed-At": sig.signed_at,
  };
  if (sig.signature) h["X-SAK-Signature"] = sig.signature;
  if (sig.signing_key_id) h["X-SAK-Signing-Key-Id"] = sig.signing_key_id;
  if (sig.unsigned_reason) h["X-SAK-Unsigned-Reason"] = sig.unsigned_reason;
  return h;
}

export function buildSidecar(input: {
  sig: PackageSignature;
  slug: string;
  version: string | null;
  filename: string;
  bytes: number;
  origin: string;
  /** Payload entries (without the embedded SIGNATURE.json) for the content digest. */
  payload?: Iterable<[string, string]>;
}): SignatureSidecar {
  const content = input.payload ? contentDigest(input.payload) : null;
  const contentSigned = content ? signDigest(content.digest) : null;
  return {
    spec: "sak-package-signature/v1",
    ...input.sig,
    slug: input.slug,
    version: input.version,
    filename: input.filename,
    bytes: input.bytes,
    ...(content
      ? {
          content_digest: content.digest,
          content_signature: contentSigned?.signature ?? null,
          files: content.files,
        }
      : {}),
    verify: {
      public_key_url: `${input.origin}${SIGNING_PUBLIC_KEY_PATH}`,
      instructions:
        "sha256 the downloaded .zip, compare with `sha256`, then verify the base64 `signature` " +
        "as an Ed25519 signature over the ascii sha256 hex string using the public key. " +
        "An extracted or repacked copy can still be verified via `content_digest` / `content_signature`. " +
        "Helper: node scripts/verify-package-signature.mjs <file.zip> <signature.json> [public-key.pem]",
    },
  };
}

/** The exact entry list both the .zip and the sidecar route must build. */
export function buildSignedZipEntries(pkg: {
  pluginName: string;
  slug: string;
  files: Map<string, string>;
  version: string | null;
}): [string, string][] {
  const payload: [string, string][] = [...pkg.files].map(([rel, contents]) => [rel, contents]);
  const signatureFile = buildEmbeddedSignature({
    slug: pkg.slug,
    version: pkg.version,
    files: payload,
    publicKeyUrl: SIGNING_PUBLIC_KEY_PATH,
  });
  return [...payload, ["SIGNATURE.json", signatureFile]].map(([rel, contents]) => [
    `${pkg.pluginName}/${rel}`,
    contents,
  ]);
}

/** CORS-safe exposure so browsers/agents can read the signature headers. */
export const EXPOSED_SIGNATURE_HEADERS =
  "X-SAK-Content-SHA256, X-SAK-Signature, X-SAK-Signing-Key-Id, X-SAK-Signature-Algorithm, X-SAK-Signed-At, X-SAK-Unsigned-Reason";
