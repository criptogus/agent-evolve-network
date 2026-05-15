import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/public/search?q=foo&type=skill&limit=20
// Public free-text search. Filters out drafts at the DB query level.
export const Route = createFileRoute("/api/public/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").replace(/[%,()]/g, " ").trim();
        const type = url.searchParams.get("type");
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);

        if (!q || q.length < 2) {
          return new Response(JSON.stringify({ results: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        let query = supabaseAdmin
          .from("packages")
          .select("slug,name,type,description,latest_version,install_count")
          .eq("is_published", true)
          .eq("review_status", "approved")
          .or(`name.ilike.%${q}%,description.ilike.%${q}%,long_description.ilike.%${q}%`)
          .order("install_count", { ascending: false })
          .limit(limit);
        if (type) query = query.eq("type", type);

        const { data, error } = await query;
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        const results = (data ?? []).map((r: any) => ({
          slug: r.slug,
          type: r.type,
          score: r.install_count ?? 0,
          snippet: r.description ?? "",
          name: r.name,
          latest_version: r.latest_version,
        }));
        return new Response(JSON.stringify({ query: q, count: results.length, results }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=30",
            ...CORS,
          },
        });
      },
    },
  },
});
