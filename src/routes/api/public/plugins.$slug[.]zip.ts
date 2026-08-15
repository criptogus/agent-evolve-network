import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import { loadPluginPackage } from "@/lib/plugins/package.server";
import {
  buildSignedZipEntries,
  signBytes,
  signatureHeaders,
  EXPOSED_SIGNATURE_HEADERS,
  SIGNING_PUBLIC_KEY_PATH,
} from "@/lib/plugins/signature.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Expose-Headers": EXPOSED_SIGNATURE_HEADERS,
};

// GET /api/public/plugins/<slug>.zip
// The full Agent Plugins v1 portable package: plugin.json, mcp.json and
// skills/<slug>/SKILL.md (+ references/). Any conformant client can load it.
//
// Every download is Ed25519-signed: the sha256 and detached signature travel in
// X-SAK-* headers, and `<slug>/signature.json` carries the same data as a
// sidecar file for offline verification against /api/public/signing-key.pem.
export const Route = createFileRoute("/api/public/plugins/$slug.zip")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const slug = (params as Record<string, string>)["slug.zip"].replace(/\.zip$/, "");
        const pkg = await loadPluginPackage(slug);
        if (!pkg) return new Response("not found", { status: 404, headers: CORS });

        const zip = new JSZip();
        // Fixed timestamps and no implicit directory entries keep the archive
        // byte-identical across requests, so the sidecar signature stays valid
        // for any copy of this version. SIGNATURE.json travels inside the bundle.
        for (const [path, contents] of buildSignedZipEntries({
          pluginName: pkg.pluginName,
          slug: pkg.slug,
          files: pkg.files,
          version: pkg.manifest.version ?? null,
        })) {
          zip.file(path, contents, { date: new Date(0), createFolders: false });
        }

        const bytes = await zip.generateAsync({ type: "uint8array" });
        const sig = signBytes(bytes);

        return new Response(bytes as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${pkg.pluginName}-agent-plugin.zip"`,
            "Cache-Control": "public, max-age=300",
            "X-SAK-Signature-Sidecar": `/api/public/plugins/${pkg.slug}/signature.json`,
            "X-SAK-Signing-Public-Key": SIGNING_PUBLIC_KEY_PATH,
            ...signatureHeaders(sig),
            ...CORS,
          },
        });
      },
    },
  },
});
