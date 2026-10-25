import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { publicCompatibility } from "@/lib/plugins/public-compatibility.server";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/public/packages/<slug>
// Public, anonymous fetch of a single published package + latest version.
// Drafts are filtered out at the DB query level so they cannot leak.
export const Route = createFileRoute("/api/public/packages/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const { data: pkg, error } = await supabaseAdmin
          .from("packages")
          .select(
            "id,slug,name,type,description,long_description,latest_version,author_handle,license,install_count,is_published,review_status",
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
        const { data: ver } = await supabaseAdmin
          .from("package_versions")
          .select("id,version,status,system_prompt,rules,examples,compatibility,notes")
          .eq("package_id", pkg.id)
          .eq("version", pkg.latest_version)
          .maybeSingle();

        const [compat, latestRun, artifact] = ver
          ? await Promise.all([
              supabaseAdmin
                .from("skill_compatibility")
                .select("package_id,version,model,status,pass_rate,total_cases,passed_cases")
                .eq("package_id", pkg.id)
                .eq("version", ver.version),
              supabaseAdmin
                .from("adversarial_runs")
                .select(
                  "package_id,version_id,model,total,passed,failed,pass_rate,severity_weighted_score,by_severity,outcomes",
                )
                .eq("package_id", pkg.id)
                .eq("version_id", ver.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
              supabaseAdmin
                .from("package_artifacts")
                .select("sha256")
                .eq("version_id", ver.id)
                .maybeSingle(),
            ])
          : [];
        const scopedCompatibility =
          ver && !compat?.error && !latestRun?.error && !artifact?.error && artifact?.data
            ? publicCompatibility(ver.compatibility, compat?.data, latestRun?.data, {
                packageId: pkg.id,
                versionId: ver.id,
                version: ver.version,
                promptSha256: createHash("sha256").update(ver.system_prompt).digest("hex"),
                archiveSha256: artifact.data.sha256,
              })
            : (ver?.compatibility ?? []);
        const { id: _omit, is_published: _p, review_status: _r, ...rest } = pkg;
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
              "Cache-Control": "public, max-age=60",
              ...CORS,
            },
          },
        );
      },
    },
  },
});
