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
import {
  signBytes,
  signatureHeaders,
  EXPOSED_SIGNATURE_HEADERS,
  SIGNING_PUBLIC_KEY_PATH,
} from "@/lib/plugins/signature.server";

export const Route = createFileRoute("/api/skills/$slug/export")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params.slug;
        const { data: pkg, error } = await supabaseAdmin
          .from("packages")
          .select("id,slug,name,type,description,long_description,license,author_handle,latest_version,is_published,review_status")
          .eq("slug", slug)
          .maybeSingle();
        if (error || !pkg) return new Response("not found", { status: 404 });
        if (!pkg.is_published || pkg.review_status !== "approved") {
          return new Response("not published", { status: 403 });
        }

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
        const epoch = { date: new Date(0) };
        folder.file("SKILL.md", skillMd, epoch);
        folder.folder("references")!.file("examples.md", examplesMd, epoch);
        if (violations.length) {
          folder.file(
            "ANTHROPIC_SPEC_WARNINGS.md",
            ["# Anthropic spec warnings", "", ...violations.map((v) => `- **${v.field}**: ${v.message}`)].join("\n"),
            epoch
          );
        }

        const bytes = await zip.generateAsync({ type: "uint8array" });
        const sig = signBytes(bytes);
        return new Response(bytes as unknown as BodyInit, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${pkg.slug}-skill.zip"`,
            "Cache-Control": "public, max-age=300",
            "X-SAK-Signing-Public-Key": SIGNING_PUBLIC_KEY_PATH,
            "Access-Control-Expose-Headers": EXPOSED_SIGNATURE_HEADERS,
            ...signatureHeaders(sig),
          },
        });
      },
    },
  },
});
