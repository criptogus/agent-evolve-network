import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import { loadPluginPackage } from "@/lib/plugins/package.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/public/plugins/<slug>.zip
// The full Agent Plugins v1 portable package: plugin.json, mcp.json and
// skills/<slug>/SKILL.md (+ references/). Any conformant client can load it.
export const Route = createFileRoute("/api/public/plugins/$slug.zip")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const slug = (params as Record<string, string>)["slug.zip"].replace(/\.zip$/, "");
        const pkg = await loadPluginPackage(slug);
        if (!pkg) return new Response("not found", { status: 404, headers: CORS });

        const zip = new JSZip();
        const root = zip.folder(pkg.pluginName)!;
        for (const [rel, contents] of pkg.files) root.file(rel, contents);

        const blob = await zip.generateAsync({ type: "arraybuffer" });
        return new Response(blob, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${pkg.pluginName}-agent-plugin.zip"`,
            "Cache-Control": "public, max-age=300",
            ...CORS,
          },
        });
      },
    },
  },
});
