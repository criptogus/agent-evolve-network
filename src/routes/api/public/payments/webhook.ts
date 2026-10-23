import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: SupabaseClient<Database> | null = null;
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function planFromPrice(price: any): string | null {
  return price?.lookup_key ?? price?.metadata?.lovable_external_id ?? price?.id ?? null;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = planFromPrice(item?.price);
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const unitAmount = item?.price?.unit_amount;
  const currency = item?.price?.currency ?? "usd";

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      plan_slug: priceId ?? "unknown",
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId ?? null,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      price_cents: typeof unitAmount === "number" ? unitAmount : null,
      currency: (currency as string).toUpperCase(),
      environment: env,
      updated_at: new Date().toISOString(),
    } as any,
    { onConflict: "stripe_subscription_id" },
  );

  // Award referral subscription bonus (idempotent server-side).
  try {
    const { awardSubscriptionReferral } = await import("@/lib/referrals/referrals.functions");
    await awardSubscriptionReferral(userId, 200);
  } catch (e) {
    console.error("awardSubscriptionReferral failed", e);
  }
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = planFromPrice(item?.price);
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId ?? null,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

/**
 * Persist every verified event so payments are auditable. The unique index on
 * `event_id` makes replays (Stripe retries for up to 3 days) idempotent.
 */
async function logEvent(event: any, env: StripeEnv) {
  const obj = event?.data?.object ?? {};
  const userId: string | null =
    obj?.metadata?.userId ?? obj?.subscription_details?.metadata?.userId ?? null;
  const { error } = await getSupabase()
    .from("payment_events")
    .insert({
      event_id: event.id ?? `${event.type}:${Date.now()}`,
      event_type: event.type,
      env,
      payload: event as any,
      user_id: /^[0-9a-f-]{36}$/i.test(userId ?? "") ? userId : null,
    } as any);
  // 23505 = duplicate event_id (Stripe retry) — expected, not an error.
  if (error && (error as any).code !== "23505") {
    console.error("payment_events insert failed", error);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event: any = await verifyWebhook(req, env);
  await logEvent(event, env);

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed": {
      // Delayed-notification methods (SEPA, boleto, ...) stay "unpaid" here and
      // settle later via async_payment_succeeded.
      const session = event.data.object;
      console.log(
        "checkout completed",
        session.id,
        session.mode,
        session.payment_status,
        session.metadata?.userId ?? "no-user",
      );
      break;
    }
    case "checkout.session.async_payment_succeeded":
      console.log("async payment succeeded", event.data.object?.id);
      break;
    case "checkout.session.async_payment_failed":
      console.warn("async payment failed", event.data.object?.id);
      break;
    case "invoice.paid":
      console.log("invoice paid", event.data.object?.id, event.data.object?.subscription ?? null);
      break;
    case "invoice.payment_failed":
      console.warn(
        "invoice payment failed",
        event.data.object?.id,
        event.data.object?.subscription ?? null,
      );
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
