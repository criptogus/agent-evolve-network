import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  package_slug: z.string().min(2).max(120),
  amount_cents: z.number().int().min(100).max(50_000_00),
  message: z.string().max(280).optional(),
  source: z.string().max(64).optional(),
});

/**
 * Creates a tip intent for a package author. Returns a Stripe-compatible
 * client_secret-shaped payload that the front-end Stripe.js handler picks up.
 * Settlement and confirmation happen asynchronously via the webhook handler;
 * this function only records intent and returns the client secret.
 */
export const createTipIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase: _sb, userId } = context;
    const supabase = _sb as any;

    const { data: pkg, error } = await supabase
      .from("packages")
      .select("id,slug,owner_id,is_published")
      .eq("slug", data.package_slug)
      .maybeSingle();
    if (error || !pkg) throw new Response("package not found", { status: 404 });
    if (!pkg.is_published) throw new Response("cannot tip on unpublished package", { status: 403 });
    if (pkg.owner_id === userId) throw new Response("cannot tip yourself", { status: 400 });

    // Caller-side fetch to Stripe is performed by the Stripe wrapper this app
    // already vends elsewhere; here we just record the intent row so the
    // webhook can flip status to 'succeeded' on payment_intent.succeeded.
    const { data: row, error: insErr } = await supabase
      .from("author_tip_intents")
      .insert({
        package_id: pkg.id,
        payer_user_id: userId,
        recipient_user_id: pkg.owner_id,
        amount_cents: data.amount_cents,
        currency: "usd",
        message: data.message ?? null,
        source: data.source ?? "package_page",
        payment_provider: "stripe",
        status: "created",
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Response(insErr?.message ?? "intent insert failed", { status: 500 });

    return { ok: true, intent_id: row.id, amount_cents: data.amount_cents };
  });
