import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

const supabaseAdmin = _supabaseAdmin as any;

// ---------------------------------------------------------------------------
// Customers + finance dashboard server functions. Admin-only.
// All Stripe access goes through the gateway-routed `createStripeClient`.
// Failures from Stripe never block the customer table — we degrade to a
// `stripe_error` field so the operator sees what happened.
// ---------------------------------------------------------------------------

const StripeEnvInput = z.enum(["sandbox", "live"]);
const RangeInput = z.enum(["7d", "30d", "90d", "365d"]);

function rangeToSeconds(r: z.infer<typeof RangeInput>): number {
  const now = Math.floor(Date.now() / 1000);
  const days = r === "7d" ? 7 : r === "30d" ? 30 : r === "90d" ? 90 : 365;
  return now - days * 24 * 3600;
}

const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf",
]);
const THREE_DECIMAL = new Set(["bhd","jod","kwd","omr","tnd"]);

function toMajor(amount: number, currency: string): number {
  const c = (currency ?? "usd").toLowerCase();
  if (ZERO_DECIMAL.has(c)) return amount;
  if (THREE_DECIMAL.has(c)) return amount / 1000;
  return amount / 100;
}

export type CustomerRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  roles: string[];
  is_paying: boolean;
  plan: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  price_cents: number | null;
  currency: string | null;
  stripe_customer_id: string | null;
  run_count: number;
  last_run_at: string | null;
  credit_balance: number;
  credits_spent: number;
};

export const getCustomerMetrics = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      environment: StripeEnvInput.default("live"),
      range: RangeInput.default("30d"),
      search: z.string().trim().max(120).optional(),
      limit: z.number().int().min(10).max(500).default(200),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const env: StripeEnv = data.environment;

    // ---- 1. Profiles (paginated, server-side search) -----------------------
    let pq = supabaseAdmin
      .from("profiles")
      .select("id, display_name, handle, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.search) {
      pq = pq.or(
        `handle.ilike.%${data.search}%,display_name.ilike.%${data.search}%`,
      );
    }
    const { data: profiles, error: pErr } = await pq;
    if (pErr) throw new Response(pErr.message, { status: 500 });
    const ids: string[] = (profiles ?? []).map((p: any) => p.id);

    // ---- 2. Auth emails (admin-only via service role) ----------------------
    const emailById = new Map<string, string | null>();
    try {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const u of usersPage?.users ?? []) {
        emailById.set(u.id, u.email ?? null);
      }
    } catch {
      // Non-fatal — emails are just blank in the UI.
    }

    // ---- 3. Roles / subs / runs / credits ---------------------------------
    const [rolesQ, subsQ, runsQ, ledgerQ] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin
            .from("subscriptions")
            .select("user_id, plan_slug, status, current_period_end, price_cents, currency, stripe_customer_id, environment")
            .in("user_id", ids)
            .eq("environment", env)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin
            .from("runs")
            .select("user_id, started_at")
            .in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin
            .from("credit_ledger")
            .select("user_id, delta")
            .in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesQ.data ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    const subByUser = new Map<string, any>();
    for (const s of subsQ.data ?? []) {
      const prev = subByUser.get(s.user_id);
      const isActive = s.status === "active" || s.status === "trialing" || s.status === "past_due";
      if (!prev || (isActive && prev.status !== "active" && prev.status !== "trialing")) {
        subByUser.set(s.user_id, s);
      }
    }

    const runStats = new Map<string, { count: number; last: string | null }>();
    for (const r of runsQ.data ?? []) {
      const cur = runStats.get(r.user_id) ?? { count: 0, last: null as string | null };
      cur.count += 1;
      if (!cur.last || (r.started_at && r.started_at > cur.last)) cur.last = r.started_at;
      runStats.set(r.user_id, cur);
    }

    const creditAgg = new Map<string, { balance: number; spent: number }>();
    for (const e of ledgerQ.data ?? []) {
      const cur = creditAgg.get(e.user_id) ?? { balance: 0, spent: 0 };
      cur.balance += e.delta ?? 0;
      if ((e.delta ?? 0) < 0) cur.spent += -(e.delta ?? 0);
      creditAgg.set(e.user_id, cur);
    }

    const rows: CustomerRow[] = (profiles ?? []).map((p: any): CustomerRow => {
      const sub = subByUser.get(p.id);
      const isPaying = sub && ["active", "trialing", "past_due"].includes(sub.status);
      const rs = runStats.get(p.id);
      const credits = creditAgg.get(p.id);
      return {
        id: p.id,
        display_name: p.display_name,
        handle: p.handle,
        avatar_url: p.avatar_url,
        email: emailById.get(p.id) ?? null,
        created_at: p.created_at,
        roles: rolesByUser.get(p.id) ?? [],
        is_paying: !!isPaying,
        plan: sub?.plan_slug ?? null,
        subscription_status: sub?.status ?? null,
        current_period_end: sub?.current_period_end ?? null,
        price_cents: sub?.price_cents ?? null,
        currency: sub?.currency ?? null,
        stripe_customer_id: sub?.stripe_customer_id ?? null,
        run_count: rs?.count ?? 0,
        last_run_at: rs?.last ?? null,
        credit_balance: credits?.balance ?? 0,
        credits_spent: credits?.spent ?? 0,
      };
    });

    // ---- 4. Summary metrics (full-table, not just the paged window) -------
    const [totalProfilesQ, totalSubsQ, payingSubsQ, runsCountQ, mrrQ, runs30Q] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("environment", env),
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("environment", env)
        .in("status", ["active", "trialing"]),
      supabaseAdmin.from("runs").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("subscriptions")
        .select("price_cents, currency, status")
        .eq("environment", env)
        .in("status", ["active", "trialing"]),
      supabaseAdmin
        .from("runs")
        .select("id", { count: "exact", head: true })
        .gte("started_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
    ]);

    let mrrUsdCents = 0;
    let mrrCurrency = "usd";
    for (const s of (mrrQ.data ?? []) as any[]) {
      if (typeof s.price_cents === "number") {
        mrrUsdCents += s.price_cents;
        if (s.currency) mrrCurrency = s.currency;
      }
    }

    const totalProfiles = totalProfilesQ.count ?? 0;
    const totalSubs = totalSubsQ.count ?? 0;
    const payingSubs = payingSubsQ.count ?? 0;
    const totalRuns = runsCountQ.count ?? 0;
    const runs30 = runs30Q.count ?? 0;
    const avgRunsPerCustomer = totalProfiles ? totalRuns / totalProfiles : 0;

    // ---- 5. Stripe finance (range-windowed) -------------------------------
    let stripe: any = null;
    let stripe_error: string | null = null;
    try {
      const client = createStripeClient(env);
      const since = rangeToSeconds(data.range);

      const [balance, txns, charges, refunds] = await Promise.all([
        client.balance.retrieve(),
        client.balanceTransactions.list({ limit: 100, created: { gte: since } }),
        client.charges.list({ limit: 100, created: { gte: since } }),
        client.refunds.list({ limit: 100, created: { gte: since } }),
      ]);

      let grossMinor = 0;
      let feeMinor = 0;
      let netMinor = 0;
      let currency = "usd";
      for (const t of txns.data) {
        currency = t.currency;
        if (t.type === "charge" || t.type === "payment") grossMinor += t.amount;
        feeMinor += t.fee ?? 0;
        netMinor += t.net ?? 0;
      }

      const successfulCharges = charges.data.filter((c: any) => c.paid && !c.refunded).length;
      const refundedCount = refunds.data.length;
      const refundedMinor = refunds.data.reduce(
        (acc: number, r: any) => acc + (r.amount ?? 0),
        0,
      );

      const balanceAvailable = (balance.available ?? []).reduce(
        (acc: number, b: any) => acc + (b.amount ?? 0),
        0,
      );
      const balancePending = (balance.pending ?? []).reduce(
        (acc: number, b: any) => acc + (b.amount ?? 0),
        0,
      );
      const balanceCurrency = balance.available?.[0]?.currency ?? "usd";

      stripe = {
        environment: env,
        range: data.range,
        currency,
        gross: toMajor(grossMinor, currency),
        fees: toMajor(feeMinor, currency),
        net: toMajor(netMinor, currency),
        successful_charges: successfulCharges,
        refunded_count: refundedCount,
        refunded_amount: toMajor(refundedMinor, currency),
        balance: {
          available: toMajor(balanceAvailable, balanceCurrency),
          pending: toMajor(balancePending, balanceCurrency),
          currency: balanceCurrency,
        },
        truncated:
          txns.has_more || charges.has_more || refunds.has_more,
      };
    } catch (e: any) {
      stripe_error = e?.message ?? "Stripe call failed";
    }

    return {
      environment: env,
      range: data.range,
      summary: {
        total_customers: totalProfiles,
        total_subscriptions: totalSubs,
        paying_subscriptions: payingSubs,
        free_customers: totalProfiles - payingSubs,
        mrr_cents: mrrUsdCents,
        mrr_currency: mrrCurrency,
        mrr: toMajor(mrrUsdCents, mrrCurrency),
        total_runs: totalRuns,
        runs_last_30d: runs30,
        avg_runs_per_customer: Math.round(avgRunsPerCustomer * 100) / 100,
      },
      stripe,
      stripe_error,
      customers: rows,
      customers_returned: rows.length,
    };
  });
