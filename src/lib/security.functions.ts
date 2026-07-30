import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicRelease = {
  signed_at: string;
  slug: string;
  name: string;
  version: string;
  content_hash: string;
  signing_key_id: string;
  signature_preview: string;
};

/**
 * Public, anonymized release log. Anyone can query it — no auth required —
 * to see that published skills are actually signed and timestamped.
 */
export const getPublicReleaseLog = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicRelease[]> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return [];

    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("package_releases")
      .select("signed_at, version, content_hash, signature, signing_key_id, packages(slug,name)")
      .order("signed_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("getPublicReleaseLog error", error);
      return [];
    }

    return ((data as any[]) ?? []).map((row) => ({
      signed_at: row.signed_at,
      slug: row.packages?.slug ?? "",
      name: row.packages?.name ?? "",
      version: row.version,
      content_hash: row.content_hash,
      signing_key_id: row.signing_key_id,
      signature_preview: `${row.signature.slice(0, 24)}…`,
    }));
  },
);
