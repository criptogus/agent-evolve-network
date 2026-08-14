/**
 * Builds an Agent Plugins v1 portable package for a published catalog item.
 * Server-only: reads the live registry and reuses the SKILL.md serializer.
 */
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildSkillMd, buildExamplesMd } from "@/lib/skills/anthropic-spec";
import {
  buildSkillPluginManifest,
  buildMcpConfig,
  stringifyJson,
  normalizePluginName,
  type PluginManifest,
  type McpConfig,
} from "./agent-plugins";

const supabaseAdmin = _supabaseAdmin as any;

export type PluginPackage = {
  slug: string;
  pluginName: string;
  manifest: PluginManifest;
  mcp: McpConfig;
  /** Plugin-root-relative path -> file contents. */
  files: Map<string, string>;
};

/** Returns null when the package does not exist or is not publicly available. */
export async function loadPluginPackage(slug: string): Promise<PluginPackage | null> {
  const { data: pkg, error } = await supabaseAdmin
    .from("packages")
    .select(
      "id,slug,name,type,description,long_description,license,author_handle,latest_version,tags,is_published,review_status",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("review_status", "approved")
    .maybeSingle();
  if (error || !pkg) return null;

  const { data: ver } = await supabaseAdmin
    .from("package_versions")
    .select("version,system_prompt,rules,examples,compatibility")
    .eq("package_id", pkg.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ver) return null;

  const { data: trust } = await supabaseAdmin
    .from("package_trust_scores")
    .select("score")
    .eq("package_id", pkg.id)
    .maybeSingle();

  const skillMd = buildSkillMd({
    slug: pkg.slug,
    name: pkg.name,
    type: pkg.type,
    description: pkg.description,
    long_description: pkg.long_description,
    system_prompt: ver.system_prompt,
    rules: (ver.rules as Parameters<typeof buildSkillMd>[0]["rules"]) ?? null,
    examples: (ver.examples as Parameters<typeof buildSkillMd>[0]["examples"]) ?? [],
    compatibility: (ver.compatibility as Parameters<typeof buildSkillMd>[0]["compatibility"]) ?? [],
    license: pkg.license,
    author_handle: pkg.author_handle,
    version: ver.version,
  });

  const manifest = buildSkillPluginManifest({
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.description,
    version: ver.version ?? pkg.latest_version,
    license: pkg.license,
    authorHandle: pkg.author_handle,
    tags: (pkg.tags as string[] | null) ?? null,
    trustScore: trust?.score ?? null,
  });
  const mcp = buildMcpConfig();

  const files = new Map<string, string>();
  files.set("plugin.json", stringifyJson(manifest));
  files.set("mcp.json", stringifyJson(mcp));
  files.set(`skills/${pkg.slug}/SKILL.md`, skillMd);

  const examples = (ver.examples as unknown[] | null) ?? [];
  if (examples.length) {
    const examplesMd = buildExamplesMd({
      name: pkg.name,
      examples: examples as Parameters<typeof buildExamplesMd>[0]["examples"],
    });
    if (examplesMd) files.set(`skills/${pkg.slug}/references/examples.md`, examplesMd);
  }

  return {
    slug: pkg.slug,
    pluginName: normalizePluginName(pkg.slug),
    manifest,
    mcp,
    files,
  };
}
