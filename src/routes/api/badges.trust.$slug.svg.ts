import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { renderTrustBadge } from "@/lib/badges/trust-badge";

// GET /api/badges/trust/<slug>.svg
//   → SVG badge that READMEs and PR comments can embed:
//     ![trust score](https://superagentskill.com/api/badges/trust/code-reviewer.svg)
//   Cached for 5 minutes at the edge; never blocks on DB errors.

export const Route = createFileRoute("/api/badges/trust/$slug/svg")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params.slug.replace(/\.svg$/i, "");
        let score: number | null = null;
        try {
          const { data: pkg } = await supabaseAdmin
            .from("packages").select("id").eq("slug", slug).maybeSingle();
          if (pkg?.id) {
            const { data: t } = await supabaseAdmin
              .from("package_trust_scores").select("score").eq("package_id", pkg.id).maybeSingle();
            if (t?.score !== undefined) score = Number(t.score);
          }
        } catch { /* render gray "—" badge on any error */ }

        const svg = renderTrustBadge({ slug, score });
        return new Response(svg, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=300, s-maxage=300",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
