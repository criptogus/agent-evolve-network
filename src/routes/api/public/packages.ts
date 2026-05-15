import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/public/packages?type=skill&q=foo&limit=50
// Public, anonymous read of the marketplace catalog. Drafts (is_published=false
// or review_status!='approved') are filtered out at the DB query level.
export const Route = createFileRoute("/api/public/packages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get("type");
        const q = (url.searchParams.get("q") ?? "").replace(/[%,()]/g, " ").trim();
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);

        let query = supabaseAdmin
          .from("packages")
          .select("slug,name,type,description,latest_version,author_handle,install_count")
          .eq("is_published", true)
          .eq("review_status", "approved")
          .order("install_count", { ascending: false })
          .order("name", { ascending: true })
          .limit(limit);
        if (type) query = query.eq("type", type);
        if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,long_description.ilike.%${q}%`);

        const { data, error } = await query;
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        return new Response(JSON.stringify({ items: data ?? [] }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
            ...CORS,
          },
        });
      },
    },
  },
});
