import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

// Marketplace integrity: authors CANNOT flip their own packages to public.
// They can only submit drafts for admin review. Admins approve via the
// /admin/review flow, which also runs the adversarial gate. Authors can
// always unpublish their own packages (taking content down is safe).
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export const listMyAuthoredPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: _sb, userId } = context as any;
    const supabase = _sb as any;
    const { data, error } = await supabase
      .from("packages")
      .select(
        "id, slug, name, type, description, latest_version, is_published, review_status, review_notes, submitted_at, reviewed_at, price_credits, install_count, created_at"
      )
      .eq("author_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Response(error.message, { status: 500 });
    // Surface in-flight upload jobs alongside finished packages so the
    // user sees "Processing… (3 queued)" rather than an empty list right
    // after an MCP bulk upload.
    const { data: jobs } = await supabase
      .from("package_upload_jobs")
      .select("id, filename, inferred_type, status, error, slug, created_at")
      .eq("user_id", userId)
      .in("status", ["queued", "processing", "failed"])
      .order("created_at", { ascending: false })
      .limit(50);
    return { packages: data ?? [], jobs: jobs ?? [] };
  });

const PublishInput = z.object({
  id: z.string().uuid(),
  publish: z.boolean(),
  // Required confirmation phrase when publishing — guards against agents flipping the flag.
  confirm_phrase: z.string().optional(),
  price_credits: z.number().int().min(0).max(100000).optional(),
});

/**
 * Submit a draft package for marketplace review, OR unpublish a previously
 * published one. The action taken depends on caller role:
 *
 *  - Author (non-admin), `publish: true`  → submit for review (review_status='pending'),
 *                                            DOES NOT make the package public.
 *  - Author, `publish: false`             → unpublish + revert to draft.
 *  - Admin, `publish: true/false`         → directly flip is_published (the
 *                                            /admin/review screen is still the
 *                                            recommended path, but this is the
 *                                            programmatic equivalent).
 */
export const setMyPackagePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PublishInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: _sb, userId } = context as any;
    const supabase = _sb as any;

    // Verify ownership before any write.
    const { data: pkg, error: getErr } = await supabase
      .from("packages")
      .select("id, name, author_id, is_published, review_status")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Response(getErr.message, { status: 500 });
    if (!pkg) throw new Response("Package not found", { status: 404 });
    if (pkg.author_id !== userId) throw new Response("Forbidden", { status: 403 });

    if (data.publish) {
      const expected = `PUBLISH ${pkg.name}`;
      if ((data.confirm_phrase ?? "").trim() !== expected) {
        throw new Response(
          `Confirmation required. Type "${expected}" to submit for review.`,
          { status: 400 }
        );
      }

      const admin = await isAdmin(supabase, userId);
      if (!admin) {
        // Non-admin authors submit for review; they cannot self-publish.
        const update: Record<string, unknown> = {
          review_status: "pending",
          submitted_at: new Date().toISOString(),
          is_published: false,
        };
        if (typeof data.price_credits === "number") update.price_credits = data.price_credits;
        const { error: updErr } = await supabaseAdmin
          .from("packages")
          .update(update)
          .eq("id", data.id);
        if (updErr) throw new Response(updErr.message, { status: 500 });
        return {
          ok: true,
          is_published: false,
          review_status: "pending" as const,
          submitted_for_review: true,
        };
      }

      // Admin path: direct publish. (The /admin/review flow with the
      // adversarial gate is preferred, but admins can also flip the flag
      // here for hot-fix scenarios.)
      const update: Record<string, unknown> = {
        is_published: true,
        review_status: "approved",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      };
      if (typeof data.price_credits === "number") update.price_credits = data.price_credits;
      const { error: updErr } = await supabaseAdmin
        .from("packages")
        .update(update)
        .eq("id", data.id);
      if (updErr) throw new Response(updErr.message, { status: 500 });
      return { ok: true, is_published: true, review_status: "approved" as const };
    }

    // Unpublish — always allowed for the author. Reset review state to draft
    // so a future re-publish goes through review again.
    const { error: updErr } = await supabase
      .from("packages")
      .update({ is_published: false, review_status: "draft" })
      .eq("id", data.id);
    if (updErr) throw new Response(updErr.message, { status: 500 });
    return { ok: true, is_published: false, review_status: "draft" as const };
  });
