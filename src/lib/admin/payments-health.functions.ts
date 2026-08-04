import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const PRO_PRICE = "agent_pass_pro_monthly";

export type EnvHealth = {
  environment: StripeEnv;
  keyConfigured: boolean;
  webhookSecretConfigured: boolean;
  price: { id: string; amount: number | null; currency: string; active: boolean } | null;
  webhooks: Array<{ url: string; status: string; enabled_events: number }>;
  checkoutProbe: { ok: boolean; detail: string };
};

export type PaymentsHealth = {
  environments: EnvHealth[];
  events: { last24h: number; last7d: number; last30d: number; total: number; latest: string | null };
  subscriptions: Array<{ environment: string; status: string; count: number; missing_customer: number }>;
};

async function envHealth(environment: StripeEnv, probe: boolean): Promise<EnvHealth> {
  const keyName = environment === "sandbox" ? "STRIPE_SANDBOX_API_KEY" : "STRIPE_LIVE_API_KEY";
  const secretName =
    environment === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET";
  const out: EnvHealth = {
    environment,
    keyConfigured: !!process.env[keyName],
    webhookSecretConfigured: !!process.env[secretName],
    price: null,
    webhooks: [],
    checkoutProbe: { ok: false, detail: "not run" },
  };
  if (!out.keyConfigured) {
    out.checkoutProbe = { ok: false, detail: `${keyName} is not configured` };
    return out;
  }

  try {
    const stripe = createStripeClient(environment);
    const prices = await stripe.prices.list({ lookup_keys: [PRO_PRICE], limit: 1 });
    const price = prices.data[0];
    if (price) {
      out.price = {
        id: price.id,
        amount: price.unit_amount ?? null,
        currency: price.currency.toUpperCase(),
        active: price.active,
      };
    }

    const hooks = await stripe.webhookEndpoints.list({ limit: 20 });
    out.webhooks = hooks.data.map((w) => ({
      url: w.url,
      status: w.status,
      enabled_events: w.enabled_events?.length ?? 0,
    }));

    if (probe && price) {
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: price.type === "recurring" ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: "https://superagentskill.com/account/billing",
      } as any);
      out.checkoutProbe = {
        ok: !!session.client_secret,
        detail: session.client_secret ? `session ${session.id} created` : "no client_secret returned",
      };
    } else {
      out.checkoutProbe = { ok: false, detail: probe ? "price missing" : "skipped" };
    }
  } catch (err) {
    out.checkoutProbe = { ok: false, detail: getStripeErrorMessage(err) };
  }
  return out;
}

export const getPaymentsHealth = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ probe: z.boolean().default(false) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<PaymentsHealth> => {
    const supabase = (context as { supabase: any }).supabase;

    const [sandbox, live] = await Promise.all([
      envHealth("sandbox", data.probe),
      envHealth("live", data.probe),
    ]);

    const now = Date.now();
    const { data: eventRows } = await supabase
      .from("payment_events")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    const stamps: string[] = (eventRows ?? []).map((r: any) => r.created_at);
    const within = (days: number) =>
      stamps.filter((s) => now - new Date(s).getTime() <= days * 86_400_000).length;

    const { data: subRows } = await supabase
      .from("subscriptions")
      .select("environment,status,stripe_customer_id")
      .limit(5000);
    const grouped = new Map<string, { count: number; missing: number }>();
    for (const row of subRows ?? []) {
      const key = `${row.environment}|${row.status}`;
      const cur = grouped.get(key) ?? { count: 0, missing: 0 };
      cur.count += 1;
      if (!row.stripe_customer_id) cur.missing += 1;
      grouped.set(key, cur);
    }

    return {
      environments: [sandbox, live],
      events: {
        last24h: within(1),
        last7d: within(7),
        last30d: within(30),
        total: stamps.length,
        latest: stamps[0] ?? null,
      },
      subscriptions: [...grouped.entries()]
        .map(([key, v]) => {
          const [environment, status] = key.split("|");
          return { environment, status, count: v.count, missing_customer: v.missing };
        })
        .sort((a, b) => a.environment.localeCompare(b.environment) || a.status.localeCompare(b.status)),
    };
  });
