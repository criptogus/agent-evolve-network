import { hasProSubscription } from "@/lib/auth/pro-subscription.server";
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requirePaidSubscription = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context;

    const isActive = await hasProSubscription(supabase, userId);

    if (!isActive) {
      throw new Response(
        JSON.stringify({
          error: "subscription_required",
          message:
            "Cloud Skill Manager requires Pro. Upgrade at /pricing to unlock cloud storage, sync, and reuse of your skills.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    return next({ context: { ...context, subscriptionActive: true } });
  });
