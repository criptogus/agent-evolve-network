import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UsageSnapshot = {
  plan: {
    slug: string;
    name: string;
    price_cents: number;
    monthly_runs_limit: number;
    max_installed_packages: number;
  } | null;
  period: { month_start: string; month_end_exclusive: string };
  runs: {
    used: number;
    limit: number;
    remaining: number;
    over_limit: boolean;
    by_status: { ok: number; error: number; blocked: number; running: number };
  };
  installs: { used: number; limit: number; remaining: number; over_limit: boolean };
  recent_runs: Array<{
    id: string;
    started_at: string;
    status: string;
    package_slugs: string[] | null;
    latency_ms: number | null;
    health: number | null;
  }>;
};

/** Read the authenticated user's current plan + this-month usage. */
export const getMyUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageSnapshot> => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // 1) plan: explicit assignment, or default to "free"
    const { data: ap } = await supabase
      .from("account_plans")
      .select("plan_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    let plan: UsageSnapshot["plan"] = null;
    if (ap?.plan_id) {
      const { data: p } = await supabase
        .from("plans")
        .select("slug,name,price_cents,monthly_runs_limit,max_installed_packages,features")
        .eq("id", ap.plan_id)
        .maybeSingle();
      plan = p ?? null;
    }
    if (!plan) {
      const { data: p } = await supabase
        .from("plans")
        .select("slug,name,price_cents,monthly_runs_limit,max_installed_packages,features")
        .eq("slug", "free")
        .maybeSingle();
      plan = p ?? null;
    }

    // 2) runs this month
    const { data: runRows } = await supabase
      .from("runs")
      .select("id, started_at, status, package_slugs, latency_ms, health")
      .eq("user_id", userId)
      .gte("started_at", monthStart.toISOString())
      .lt("started_at", monthEnd.toISOString())
      .order("started_at", { ascending: false })
      .limit(500);

    const runs = runRows ?? [];
    const by = { ok: 0, error: 0, blocked: 0, running: 0 } as Record<string, number>;
    for (const r of runs) {
      const k = (r.status as string) || "running";
      if (k in by) by[k] += 1;
    }
    const runsUsed = runs.length;
    const runsLimit = plan?.monthly_runs_limit ?? 0;

    // 3) installs
    const { count: installsUsed } = await supabase
      .from("package_installs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const installsLimit = plan?.max_installed_packages ?? 0;

    return {
      plan,
      period: { month_start: monthStart.toISOString(), month_end_exclusive: monthEnd.toISOString() },
      runs: {
        used: runsUsed,
        limit: runsLimit,
        remaining: Math.max(0, runsLimit - runsUsed),
        over_limit: runsLimit > 0 && runsUsed >= runsLimit,
        by_status: { ok: by.ok, error: by.error, blocked: by.blocked, running: by.running },
      },
      installs: {
        used: installsUsed ?? 0,
        limit: installsLimit,
        remaining: Math.max(0, installsLimit - (installsUsed ?? 0)),
        over_limit: installsLimit > 0 && (installsUsed ?? 0) >= installsLimit,
      },
      recent_runs: runs.slice(0, 10) as UsageSnapshot["recent_runs"],
    };
  });
