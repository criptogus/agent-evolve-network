import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import { loadPluginPackage } from "@/lib/plugins/package.server";
import { buildSidecar, signBytes, EXPOSED_SIGNATURE_HEADERS } from "@/lib/plugins/signature.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Expose-Headers": EXPOSED_SIGNATURE_HEADERS,
};

// GET /api/public/plugins/<slug>.signature.json
// Detached signature sidecar for the matching .zip package. Deterministic zip
// generation means this hash matches the bytes served by the .zip route.
export const Route = createFileRoute("/api/public/plugins/$slug/signature.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params, request }) => {
        // The dynamic segment key varies with the literal suffix in the file
        // name, so take whichever param carries the slug.
        const raw =
          Object.values(params as Record<string, string>).find((v) => typeof v === "string" && v) ?? "";
        const slug = raw.replace(/\.signature\.json$/, "").replace(/\.json$/, "");
        const pkg = await loadPluginPackage(slug);
        if (!pkg) return new Response("not found", { status: 404, headers: CORS });

        const zip = new JSZip();
        const root = zip.folder(pkg.pluginName)!;
        for (const [rel, contents] of pkg.files) root.file(rel, contents, { date: new Date(0) });
        const bytes = await zip.generateAsync({ type: "uint8array" });

        const filename = `${pkg.pluginName}-agent-plugin.zip`;
        const sidecar = buildSidecar({
          sig: signBytes(bytes),
          slug: pkg.slug,
          version: pkg.manifest.version ?? null,
          filename,
          bytes: bytes.byteLength,
          origin: new URL(request.url).origin,
        });

        return new Response(JSON.stringify(sidecar, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            ...CORS,
          },
        });
      },
    },
  },
});
