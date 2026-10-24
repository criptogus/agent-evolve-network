import type { AppDatabaseClient } from "@/integrations/supabase/database";

export type ReviewStatus = "draft" | "pending" | "approved" | "paused" | "rejected";

/** Keep the verified administrator's JWT so RLS and publication triggers see the real actor. */
export async function persistReviewDecision(
  client: AppDatabaseClient,
  input: {
    slug: string;
    status: ReviewStatus;
    userId: string;
    version?: string;
    notes: string | null;
  },
) {
  const published = input.status === "approved";
  let query = client
    .from("packages")
    .update({
      review_status: input.status,
      review_notes: input.notes,
      reviewed_by: input.userId,
      reviewed_at: new Date().toISOString(),
      is_published: published,
    })
    .eq("slug", input.slug);
  if (input.version) query = query.eq("latest_version", input.version);
  const { data, error } = await query
    .select("slug,latest_version,review_status,is_published,reviewed_by")
    .single();
  if (error) throw new Error(`Review was not saved: ${error.message}`);
  if (
    !data ||
    data.slug !== input.slug ||
    data.review_status !== input.status ||
    data.is_published !== published ||
    data.reviewed_by !== input.userId ||
    (input.version && data.latest_version !== input.version)
  )
    throw new Error("Review was not saved with the expected version, status and administrator");
  return { ok: true as const, status: input.status, is_published: published };
}
