import { canReadPackageContent } from "@/lib/marketplace/content-access.server";
import { getVerifiedRequestUserId } from "@/lib/auth/request-user.server";
import { createFileRoute } from "@tanstack/react-router";
import { loadPublicEvaluationCompatibility } from "@/lib/plugins/public-compatibility-loader.server";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

// GET /api/public/packages/<slug>
// Public, anonymous fetch of a single published package + latest version.
// Drafts are filtered out at the DB query level so they cannot leak.
export const Route = createFileRoute("/api/public/packages/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params, request }) => {
        const { data: pkg, error } = await supabaseAdmin
          .from("packages")
          .select(
            "id,slug,name,type,description,long_description,latest_version,author_handle,license,install_count,is_published,review_status,price_credits,author_id",
          )
          .eq("slug", params.slug)
          .eq("is_published", true)
          .eq("review_status", "approved")
          .maybeSingle();
        if (error) {
          console.error("[api/public/packages/$slug] db error:", error);
          return new Response(JSON.stringify({ error: "internal_server_error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        if (!pkg) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        if (
          !(await canReadPackageContent(
            pkg,
            pkg.price_credits > 0 ? await getVerifiedRequestUserId(request) : null,
          ))
        ) {
          return new Response("Purchase required", {
            status: 403,
            headers: { "Cache-Control": "no-store" },
          });
        }
        const { data: ver } = await supabaseAdmin
          .from("package_versions")
          .select("id,version,status,system_prompt,rules,examples,compatibility,notes")
          .eq("package_id", pkg.id)
          .eq("version", pkg.latest_version)
          .maybeSingle();

        const scopedCompatibility = ver ? await loadPublicEvaluationCompatibility(pkg.id, ver) : [];
        const { id: _omit, is_published: _p, review_status: _r, author_id: _a, ...rest } = pkg;
        return new Response(
          JSON.stringify({
            ...rest,
            system_prompt: ver?.system_prompt ?? null,
            version: ver?.version ?? pkg.latest_version,
            rules: ver?.rules ?? null,
            examples: ver?.examples ?? [],
            compatibility: scopedCompatibility,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": pkg.price_credits > 0 ? "private, no-store" : "public, max-age=60",
              ...CORS,
            },
          },
        );
      },
    },
  },
});
