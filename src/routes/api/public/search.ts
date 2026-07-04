import { createFileRoute } from "@tanstack/react-router";
import { searchPackages } from "@/lib/search/packages.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });

// GET /api/public/search?q=foo&type=skill&limit=20&offset=0
// Public free-text search backed by the `search_packages` RPC (weighted
// tsvector + install-count boost, published/approved only), with an ILIKE
// fallback while the migration hasn't been applied yet.
export const Route = createFileRoute("/api/public/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        const type = url.searchParams.get("type");
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 50);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

        if (!q || q.length < 2) {
          return json({ results: [] });
        }

        try {
          const results = await searchPackages({ q, type, limit, offset });
          return json(
            { query: q, count: results.length, limit, offset, results },
            200,
            { "Cache-Control": "public, max-age=30" },
          );
        } catch (e) {
          console.error("[api/public/search] db error:", e);
          return json({ error: "internal_server_error" }, 500);
        }
      },
    },
  },
});
