/**
 * Export any published package as an Anthropic-compatible SKILL.md zip bundle.
 *
 * Layout:
 *   <slug>/
 *     SKILL.md
 *     references/examples.md
 */
import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import { buildSkillMd, buildExamplesMd, validateAnthropicSpec } from "@/lib/skills/anthropic-spec";

export const Route = createFileRoute("/api/skills/$slug/export")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params.slug;
        const { data: pkg, error } = await supabaseAdmin
          .from("packages")
          .select("id,slug,name,type,description,long_description,license,author_handle,latest_version,is_published")
          .eq("slug", slug)
          .maybeSingle();
        if (error || !pkg) return new Response("not found", { status: 404 });
        if (!pkg.is_published) return new Response("not published", { status: 403 });

        const { data: ver } = await supabaseAdmin
          .from("package_versions")
          .select("version,system_prompt,rules,examples,compatibility")
          .eq("package_id", pkg.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!ver) return new Response("no version", { status: 404 });

        const violations = validateAnthropicSpec({
          slug: pkg.slug,
          name: pkg.name,
          description: pkg.description,
        });

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

        const examplesMd = buildExamplesMd(
          (ver.examples as Array<{ title: string; input: string; expected_output: string; rationale?: string }>) ?? []
        );

        const zip = new JSZip();
        const folder = zip.folder(pkg.slug)!;
        folder.file("SKILL.md", skillMd);
        folder.folder("references")!.file("examples.md", examplesMd);
        if (violations.length) {
          folder.file(
            "ANTHROPIC_SPEC_WARNINGS.md",
            ["# Anthropic spec warnings", "", ...violations.map((v) => `- **${v.field}**: ${v.message}`)].join("\n")
          );
        }

        const bytes = await zip.generateAsync({ type: "uint8array" });
        return new Response(bytes as unknown as BodyInit, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${pkg.slug}-skill.zip"`,
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
