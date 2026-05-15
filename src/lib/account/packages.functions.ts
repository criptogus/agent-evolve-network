import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyAuthoredPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: _sb, userId } = context as any;
    const supabase = _sb as any;
    const { data, error } = await supabase
      .from("packages")
      .select(
        "id, slug, name, type, description, latest_version, is_published, review_status, price_credits, install_count, created_at"
      )
      .eq("author_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Response(error.message, { status: 500 });
    return { packages: data ?? [] };
  });

const PublishInput = z.object({
  id: z.string().uuid(),
  publish: z.boolean(),
  // Required confirmation phrase when publishing — guards against agents flipping the flag.
  confirm_phrase: z.string().optional(),
  price_credits: z.number().int().min(0).max(100000).optional(),
});

export const setMyPackagePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PublishInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: _sb, userId } = context as any;
    const supabase = _sb as any;

    // Verify ownership before any write.
    const { data: pkg, error: getErr } = await supabase
      .from("packages")
      .select("id, name, author_id, is_published")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Response(getErr.message, { status: 500 });
    if (!pkg) throw new Response("Package not found", { status: 404 });
    if (pkg.author_id !== userId) throw new Response("Forbidden", { status: 403 });

    if (data.publish) {
      const expected = `PUBLISH ${pkg.name}`;
      if ((data.confirm_phrase ?? "").trim() !== expected) {
        throw new Response(
          `Confirmation required. Type "${expected}" to publish to the marketplace.`,
          { status: 400 }
        );
      }
    }

    const update: Record<string, unknown> = { is_published: data.publish };
    if (typeof data.price_credits === "number") update.price_credits = data.price_credits;

    const { error: updErr } = await supabase.from("packages").update(update).eq("id", data.id);
    if (updErr) throw new Response(updErr.message, { status: 500 });
    return { ok: true, is_published: data.publish };
  });
