import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaddleClient, type PaddleEnv } from "@/lib/paddle.server";

export const getCustomerPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !sub?.paddle_customer_id) {
      throw new Error("No subscription found");
    }
    const paddle = getPaddleClient(data.environment);
    const session = await paddle.customerPortalSessions.create(
      sub.paddle_customer_id as string,
      sub.paddle_subscription_id ? [sub.paddle_subscription_id as string] : [],
    );
    return { url: session.urls.general.overview };
  });
