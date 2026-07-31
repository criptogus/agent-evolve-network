import { z } from "zod";

export const SlugInput = z.object({ slug: z.string().min(1).max(80) });

export async function assertPaid(supabase: any, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const active = !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!active) {
    throw new Response("A paid plan is required to download agents. Upgrade at /pricing.", { status: 402 });
  }
  return userId;
}
