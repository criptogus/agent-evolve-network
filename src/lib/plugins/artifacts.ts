import { z } from "zod";
import { createHash } from "node:crypto";
export const ArtifactFilesSchema = z.record(z.string(), z.string()).superRefine((files, ctx) => {
  const entries = Object.entries(files);
  if (entries.length === 0 || entries.length > 200)
    ctx.addIssue({ code: "custom", message: "Bundle requires 1–200 files" });
  let size = 0;
  for (const [path, body] of entries) {
    if (
      path.length > 240 ||
      path.startsWith("/") ||
      path.includes("\\") ||
      path
        .split("/")
        .some(
          (p) =>
            !p ||
            p === "." ||
            p === ".." ||
            p === ".git" ||
            p === ".ssh" ||
            p.startsWith(".env") ||
            p === "node_modules",
        ) ||
      [...path].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
      /^[a-z]:/i.test(path)
    )
      ctx.addIssue({ code: "custom", message: `Unsafe bundle path: ${path}` });
    const bytes = new TextEncoder().encode(body).length;
    size += bytes;
    if (bytes > 250_000) ctx.addIssue({ code: "custom", message: `File exceeds 250KB: ${path}` });
  }
  if (size > 2_000_000) ctx.addIssue({ code: "custom", message: "Bundle exceeds 2MB" });
});
export function artifactDigest(files: Record<string, string>): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        Object.entries(ArtifactFilesSchema.parse(files)).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0,
        ),
      ),
    )
    .digest("hex");
}
export function verifyArtifact(files: unknown, digest: string): Record<string, string> {
  const parsed = ArtifactFilesSchema.parse(files);
  if (artifactDigest(parsed) !== digest) throw new Error("Bundle integrity check failed");
  return parsed;
}
