import { hasProSubscription } from "@/lib/auth/pro-subscription.server";
import type { AppDatabaseClient } from "@/integrations/supabase/database";
import { z } from "zod";

export const SlugInput = z.object({ slug: z.string().min(1).max(80) });

export async function assertPaid(supabase: AppDatabaseClient, userId: string) {
  const active = await hasProSubscription(supabase, userId);
  if (!active) {
    throw new Response("Pro is required to download agents. Upgrade at /pricing.", {
      status: 402,
    });
  }
  return userId;
}
