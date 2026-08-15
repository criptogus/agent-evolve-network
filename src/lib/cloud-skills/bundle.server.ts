import JSZip from "jszip";
import { buildManifest, MANIFEST_PATH, type BundleFile, type BundleIntegrity } from "./bundle";
import type { Provider, ProviderScope, SkillForRender } from "./providers";
import { contentDigest, signDigest, signingKeyId, SIGNING_PUBLIC_KEY_PATH } from "@/lib/plugins/signature.server";

/**
 * Deterministic zip: fixed timestamps + sorted entries, so re-exporting the
 * same skills yields byte-identical archives (easy to diff and checksum).
 */
const FIXED_DATE = new Date("2020-01-01T00:00:00.000Z");

const PUBLIC_KEY_URL = `https://superagentskill.com${SIGNING_PUBLIC_KEY_PATH}`;

/**
 * Hashes and signs the payload, then appends the manifest that records it.
 * Never throws: an unsigned-but-hashed bundle still lets the user detect edits.
 */
export function signBundle(
  provider: Provider,
  scope: ProviderScope,
  skills: SkillForRender[],
  payload: BundleFile[],
): { files: BundleFile[]; integrity: BundleIntegrity } {
  const { digest, files } = contentDigest(payload.map((f) => [f.path, f.content] as [string, string]));
  const signed = signDigest(digest);

  const integrity: BundleIntegrity = {
    algorithm: "ed25519",
    hash: "sha256",
    content_digest: digest,
    files,
    signature: signed.signature,
    signing_key_id: signed.signing_key_id,
    public_key_url: PUBLIC_KEY_URL,
    ...(signed.signature
      ? {}
      : {
          unsigned_reason: signingKeyId()
            ? "signing failed on this deployment"
            : "signing keys are not configured on this deployment",
        }),
  };

  const manifest = buildManifest(provider, scope, skills, payload, integrity);
  const all = [...payload, { path: MANIFEST_PATH, content: manifest }].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  return { files: all, integrity };
}

export async function zipBundle(files: BundleFile[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    zip.file(f.path, f.content, {
      date: FIXED_DATE,
      unixPermissions: f.path.endsWith(".sh") ? 0o755 : 0o644,
    });
  }
  const out = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
