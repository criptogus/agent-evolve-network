import type { AppDatabaseClient } from "@/integrations/supabase/database";
import { isProSubscription, PRO_PRICE_IDS } from "@/lib/subscription-entitlements";

/** Server gates use the same build environment and explicit Pro SKUs as the UI. */
export async function hasProSubscription(
  supabase: AppDatabaseClient,
  userId: string,
  buildEnvironment?: "sandbox" | "live",
) {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
  const environment = buildEnvironment ?? (token?.startsWith("pk_test_") ? "sandbox" :
    token?.startsWith("pk_live_") ? "live" : null);
  if (!environment) return false;
  const { data, error } = await supabase
    .from("subscriptions")
    .select("price_id,status,current_period_end")
    .eq("user_id", userId)
    .eq("environment", environment)
    .in("price_id", [...PRO_PRICE_IDS]);
  return !error && (data ?? []).some((row) => isProSubscription(row));
}