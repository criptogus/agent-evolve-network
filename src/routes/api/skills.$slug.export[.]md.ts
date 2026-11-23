import { canReadPackageContent } from "@/lib/marketplace/content-access.server";
import { getVerifiedRequestUserId } from "@/lib/auth/request-user.server";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin;
import { buildSkillMd } from "@/lib/skills/anthropic-spec";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

// GET /api/skills/<slug>/export.md
// Plain SKILL.md (no zip wrapper). Used by the CLI install path so files
// land directly under .claude/skills/<slug>/SKILL.md without unzipping.
// Drafts are filtered at the DB query level.
export const Route = createFileRoute("/api/skills/$slug/export.md")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params, request }) => {
        const slug = params.slug;
        const { data: pkg, error } = await supabaseAdmin
          .from("packages")
          .select(
            "id,slug,name,type,description,long_description,license,author_handle,latest_version,is_published,review_status,price_credits,author_id",
          )
          .eq("slug", slug)
          .eq("is_published", true)
          .eq("review_status", "approved")
          .maybeSingle();
        if (error || !pkg) {
          return new Response("not found", { status: 404, headers: CORS });
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
          .select("version,system_prompt,rules,examples,compatibility")
          .eq("package_id", pkg.id)
          .eq("version", pkg.latest_version)
          .limit(1)
          .maybeSingle();
        if (!ver) return new Response("no version", { status: 404, headers: CORS });

        const skillMd = buildSkillMd({
          slug: pkg.slug,
          name: pkg.name,
          type: pkg.type,
          description: pkg.description,
          long_description: pkg.long_description,
          system_prompt: ver.system_prompt,
          rules: (ver.rules as Parameters<typeof buildSkillMd>[0]["rules"]) ?? null,
          examples: (ver.examples as Parameters<typeof buildSkillMd>[0]["examples"]) ?? [],
          compatibility:
            (ver.compatibility as Parameters<typeof buildSkillMd>[0]["compatibility"]) ?? [],
          license: pkg.license,
          author_handle: pkg.author_handle,
          version: ver.version,
        });

        return new Response(skillMd, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": pkg.price_credits > 0 ? "private, no-store" : "public, max-age=300",
            ...CORS,
          },
        });
      },
    },
  },
});
