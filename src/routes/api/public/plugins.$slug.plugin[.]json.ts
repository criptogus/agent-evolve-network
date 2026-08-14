import { createFileRoute } from "@tanstack/react-router";
import { loadPluginPackage } from "@/lib/plugins/package.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/public/plugins/<slug>/plugin.json — Agent Plugins v1 manifest.
export const Route = createFileRoute("/api/public/plugins/$slug/plugin.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const pkg = await loadPluginPackage(params.slug);
        if (!pkg) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        return new Response(JSON.stringify(pkg.manifest, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
            ...CORS,
          },
        });
      },
    },
  },
});
