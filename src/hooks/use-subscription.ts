import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironmentSafe } from "@/lib/stripe";
import { useAuth } from "./use-auth";
import { getSubscriptionEntitlements } from "@/lib/subscription-entitlements";

type Sub = {
  status: string;
  product_id: string | null;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  price_cents: number | null;
  currency: string | null;
};

export function useSubscription() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  const env = getStripeEnvironmentSafe();

  const refetch = async () => {
    if (!user || !env) {
      setSubs([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "status, product_id, price_id, current_period_end, cancel_at_period_end, stripe_customer_id, price_cents, currency",
      )
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false });
    setSubs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
    if (!user) return;
    const channel = supabase
      .channel(`subs:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, env]);

  const entitlements = getSubscriptionEntitlements(subs);
  // Existing feature consumers use isActive as their Pro gate.
  return { ...entitlements, loading, isActive: entitlements.isPro, environment: env, refetch };
}
