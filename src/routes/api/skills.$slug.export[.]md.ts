import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { buildSkillMd } from "@/lib/skills/anthropic-spec";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/skills/<slug>/export.md
// Plain SKILL.md (no zip wrapper). Used by the CLI install path so files
// land directly under .claude/skills/<slug>/SKILL.md without unzipping.
// Drafts are filtered at the DB query level.
export const Route = createFileRoute("/api/skills/$slug/export.md")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const slug = params.slug;
        const { data: pkg, error } = await supabaseAdmin
          .from("packages")
          .select(
            "id,slug,name,type,description,long_description,license,author_handle,latest_version,is_published,review_status",
          )
          .eq("slug", slug)
          .eq("is_published", true)
          .eq("review_status", "approved")
          .maybeSingle();
        if (error || !pkg) {
          return new Response("not found", { status: 404, headers: CORS });
        }

        const { data: ver } = await supabaseAdmin
          .from("package_versions")
          .select("version,system_prompt,rules,examples,compatibility")
          .eq("package_id", pkg.id)
          .order("created_at", { ascending: false })
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
            "Cache-Control": "public, max-age=300",
            ...CORS,
          },
        });
      },
    },
  },
});
