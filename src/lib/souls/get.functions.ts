import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SoulDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  long_description: string | null;
  author_handle: string;
  author_verified: boolean;
  install_count: number;
  latest_version: string;
  scopes: string[];
  license: string;
  created_at: string;
  updated_at: string;
  current: {
    id: string;
    version: string;
    status: string;
    system_prompt: string;
    rules: any;
    examples: any[];
    notes: string | null;
    created_at: string;
  } | null;
  versions: Array<{ id: string; version: string; status: string; created_at: string }>;
};

export const getSoul = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const slug = (data as { slug?: unknown })?.slug;
    if (typeof slug !== "string" || !slug) throw new Error("slug required");
    return { slug };
  })
  .handler(async ({ data }): Promise<SoulDetail | null> => {
    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select(
        "id, slug, name, type, description, long_description, author_handle, author_verified, install_count, latest_version, scopes, license, created_at, updated_at, is_published"
      )
      .eq("slug", data.slug)
      .eq("type", "soul")
      .maybeSingle();
    if (!pkg || !pkg.is_published) return null;

    const { data: versions } = await supabaseAdmin
      .from("package_versions")
      .select("id, version, status, system_prompt, rules, examples, notes, created_at")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false });

    const current =
      (versions ?? []).find((v) => v.version === pkg.latest_version) ??
      (versions ?? [])[0] ??
      null;

    return {
      id: pkg.id,
      slug: pkg.slug,
      name: pkg.name,
      description: pkg.description,
      long_description: pkg.long_description,
      author_handle: pkg.author_handle,
      author_verified: pkg.author_verified,
      install_count: pkg.install_count,
      latest_version: pkg.latest_version,
      scopes: pkg.scopes ?? [],
      license: pkg.license,
      created_at: pkg.created_at,
      updated_at: pkg.updated_at,
      current: current
        ? {
            id: current.id,
            version: current.version,
            status: current.status,
            system_prompt: current.system_prompt,
            rules: (current.rules ?? {}) as Record<string, unknown>,
            examples: (current.examples ?? []) as Array<Record<string, unknown>>,
            notes: current.notes,
            created_at: current.created_at,
          }
        : null,
      versions: (versions ?? []).map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        created_at: v.created_at,
      })),
    };
  });
