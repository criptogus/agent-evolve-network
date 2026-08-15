import JSZip from "jszip";
import type { BundleFile } from "./bundle";

/**
 * Deterministic zip: fixed timestamps + sorted entries, so re-exporting the
 * same skills yields byte-identical archives (easy to diff and checksum).
 */
const FIXED_DATE = new Date("2020-01-01T00:00:00.000Z");

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
