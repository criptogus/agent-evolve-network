import type { AppDatabaseClient } from "../integrations/supabase/database.ts";

export type PublicRelease = {
  signed_at: string;
  slug: string;
  name: string;
  version: string;
  content_hash: string;
  signing_key_id: string;
  signature_preview: string;
};

export type PublicReleaseLog = {
  available: boolean;
  releases: PublicRelease[];
};

/** Only expose signed metadata for currently approved, public packages. */
export async function loadPublicReleaseLog(client: AppDatabaseClient): Promise<PublicReleaseLog> {
  const { data, error } = await client
    .from("package_releases")
    .select(
      "signed_at,version,content_hash,signature,signing_key_id,packages!inner(slug,name,is_published,review_status,latest_version)",
    )
    .eq("packages.is_published", true)
    .eq("packages.review_status", "approved")
    .order("signed_at", { ascending: false })
    .limit(20);
  if (error) return { available: false, releases: [] };
  return {
    available: true,
    releases: (data ?? []).flatMap((row) => {
      const pkg = row.packages;
      if (
        !pkg?.is_published ||
        pkg.review_status !== "approved" ||
        row.version !== pkg.latest_version ||
        !pkg.slug ||
        !row.signature ||
        !row.content_hash ||
        !row.signing_key_id ||
        !Number.isFinite(Date.parse(row.signed_at))
      )
        return [];
      return [
        {
          signed_at: row.signed_at,
          slug: pkg.slug,
          name: pkg.name,
          version: row.version,
          content_hash: row.content_hash,
          signing_key_id: row.signing_key_id,
          signature_preview: `${row.signature.slice(0, 24)}…`,
        },
      ];
    }),
  };
}
