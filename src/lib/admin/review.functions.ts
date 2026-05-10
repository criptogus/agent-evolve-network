import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ReviewStatus = "draft" | "pending" | "approved" | "paused" | "rejected";

export type ReviewQueueItem = {
  id: string;
  slug: string;
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  description: string;
  author_handle: string;
  author_id: string | null;
  latest_version: string;
  is_published: boolean;
  review_status: ReviewStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  updated_at: string;
  created_at: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const listReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const t = (data as { type?: unknown })?.type;
    const type = typeof t === "string" && ["soul", "skill", "playbook", "guardrail", "all"].includes(t) ? (t as string) : "soul";
    return { type };
  })
  .handler(async ({ context, data }): Promise<{ items: ReviewQueueItem[] }> => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin
      .from("packages")
      .select(
        "id, slug, name, type, description, author_handle, author_id, latest_version, is_published, review_status, review_notes, reviewed_at, submitted_at, updated_at, created_at"
      )
      .order("review_status", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(500);
    if (data.type !== "all") q = q.eq("type", data.type as any);
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    return { items: (rows ?? []) as ReviewQueueItem[] };
  });

export const submitForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const slug = (data as { slug?: unknown })?.slug;
    if (typeof slug !== "string" || !slug) throw new Error("slug required");
    return { slug };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: pkg } = await supabase.from("packages").select("id, author_id").eq("slug", data.slug).maybeSingle();
    if (!pkg) throw new Response("Not found", { status: 404 });
    if (pkg.author_id !== userId) {
      // admins can also submit
      await assertAdmin(supabase, userId);
    }
    const { error } = await supabaseAdmin
      .from("packages")
      .update({ review_status: "pending", submitted_at: new Date().toISOString(), is_published: false })
      .eq("id", pkg.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

export const setReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { slug?: unknown; status?: unknown; notes?: unknown };
    const slug = typeof d.slug === "string" ? d.slug : "";
    const status = d.status as string;
    const notes = typeof d.notes === "string" ? d.notes : null;
    if (!slug) throw new Error("slug required");
    if (!["approved", "paused", "rejected", "pending", "draft"].includes(status))
      throw new Error("invalid status");
    return { slug, status: status as ReviewStatus, notes };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const isPublished = data.status === "approved";
    const { error } = await supabaseAdmin
      .from("packages")
      .update({
        review_status: data.status,
        review_notes: data.notes,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        is_published: isPublished,
      })
      .eq("slug", data.slug);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true, status: data.status, is_published: isPublished };
  });
