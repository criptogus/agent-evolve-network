import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requirePaidSubscription = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context as any;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isActive =
      !!sub &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

    if (!isActive) {
      throw new Response(
        JSON.stringify({
          error: "subscription_required",
          message:
            "Cloud Skill Manager is available on Agent Pass and Enterprise plans. Upgrade at /pricing to unlock cloud storage, sync, and reuse of your skills.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    return next({ context: { ...context, subscriptionActive: true } });
  });
