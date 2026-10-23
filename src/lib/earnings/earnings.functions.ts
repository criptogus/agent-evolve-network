import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Publisher earnings visibility (audit gap #6).
//
// All queries run through the caller's RLS-scoped Supabase client:
//  - package_purchases: "purchases self read" policy (author_id = auth.uid())
//  - author_tip_intents: "tip_intents_read_recipient" policy
//  - revenue_share_payouts: "payouts_read_self" policy (payee_user_id = auth.uid())
//
// Derivable figures: credit-denominated sale earnings (author_credits from the
// 70/30 purchase RPC), succeeded tips in cents, and the USD-cents payout ledger
// (author / referral / lineage kinds). A "pending balance" is NOT derivable —
// revenue_share_payouts has no paid/pending status column — so we never show one.

export type PackageEarnings = {
  package_id: string;
  slug: string | null;
  name: string | null;
  purchases: number;
  gross_credits: number;
  author_credits: number;
  tips_cents: number;
  tips_count: number;
  lineage_cents: number;
  payout_cents: number;
};

export type PayoutRow = {
  id: number;
  kind: "referral" | "lineage" | "platform" | "author";
  amount_cents: number;
  currency: string;
  package_id: string | null;
  package_name: string | null;
  notes: string | null;
  created_at: string;
};

export type EarningsSummary = {
  total_sale_credits: number;
  total_purchases: number;
  total_tips_cents: number;
  total_payout_cents: number;
  has_any: boolean;
  packages: PackageEarnings[];
  payouts: PayoutRow[];
};

export const getMyEarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EarningsSummary> => {
    const { supabase: _sb, userId } = context as any;
    const supabase = _sb as any;

    const [purchasesRes, tipsRes, payoutsRes] = await Promise.all([
      supabase
        .from("package_purchases")
        .select("package_id, credits_paid, author_credits, created_at")
        .eq("author_id", userId),
      supabase
        .from("author_tip_intents")
        .select("package_id, amount_cents, status")
        .eq("recipient_user_id", userId)
        .eq("status", "succeeded"),
      supabase
        .from("revenue_share_payouts")
        .select("id, kind, amount_cents, currency, package_id, notes, created_at")
        .eq("payee_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (purchasesRes.error) throw new Response(purchasesRes.error.message, { status: 500 });

    const purchases = (purchasesRes.data ?? []) as Array<{
      package_id: string;
      credits_paid: number;
      author_credits: number;
    }>;
    const tips = (tipsRes.error ? [] : (tipsRes.data ?? [])) as Array<{
      package_id: string | null;
      amount_cents: number;
    }>;
    const payouts = (payoutsRes.error ? [] : (payoutsRes.data ?? [])) as Array<{
      id: number;
      kind: PayoutRow["kind"];
      amount_cents: number;
      currency: string;
      package_id: string | null;
      notes: string | null;
      created_at: string;
    }>;

    // Aggregate per package.
    const byPkg = new Map<string, PackageEarnings>();
    const ensure = (pid: string): PackageEarnings => {
      let e = byPkg.get(pid);
      if (!e) {
        e = {
          package_id: pid,
          slug: null,
          name: null,
          purchases: 0,
          gross_credits: 0,
          author_credits: 0,
          tips_cents: 0,
          tips_count: 0,
          lineage_cents: 0,
          payout_cents: 0,
        };
        byPkg.set(pid, e);
      }
      return e;
    };

    for (const p of purchases) {
      const e = ensure(p.package_id);
      e.purchases += 1;
      e.gross_credits += p.credits_paid ?? 0;
      e.author_credits += p.author_credits ?? 0;
    }
    for (const t of tips) {
      if (!t.package_id) continue;
      const e = ensure(t.package_id);
      e.tips_cents += t.amount_cents ?? 0;
      e.tips_count += 1;
    }
    for (const r of payouts) {
      if (!r.package_id) continue;
      const e = ensure(r.package_id);
      e.payout_cents += r.amount_cents ?? 0;
      if (r.kind === "lineage") e.lineage_cents += r.amount_cents ?? 0;
    }

    // Resolve package names/slugs (RLS: authors can read own packages).
    const ids = [...byPkg.keys()];
    const nameById = new Map<string, { slug: string; name: string }>();
    if (ids.length > 0) {
      const { data: pkgs } = await supabase
        .from("packages")
        .select("id, slug, name")
        .in("id", ids);
      for (const p of (pkgs ?? []) as Array<{ id: string; slug: string; name: string }>) {
        nameById.set(p.id, { slug: p.slug, name: p.name });
      }
    }
    for (const e of byPkg.values()) {
      const meta = nameById.get(e.package_id);
      if (meta) {
        e.slug = meta.slug;
        e.name = meta.name;
      }
    }

    const packages = [...byPkg.values()].sort(
      (a, b) =>
        b.author_credits + b.tips_cents + b.payout_cents -
        (a.author_credits + a.tips_cents + a.payout_cents),
    );

    const payoutRows: PayoutRow[] = payouts.map((r) => ({
      ...r,
      package_name: r.package_id ? nameById.get(r.package_id)?.name ?? null : null,
    }));

    const total_sale_credits = purchases.reduce((s, p) => s + (p.author_credits ?? 0), 0);
    const total_tips_cents = tips.reduce((s, t) => s + (t.amount_cents ?? 0), 0);
    const total_payout_cents = payouts.reduce((s, r) => s + (r.amount_cents ?? 0), 0);

    return {
      total_sale_credits,
      total_purchases: purchases.length,
      total_tips_cents,
      total_payout_cents,
      has_any: purchases.length > 0 || tips.length > 0 || payouts.length > 0,
      packages,
      payouts: payoutRows,
    };
  });
