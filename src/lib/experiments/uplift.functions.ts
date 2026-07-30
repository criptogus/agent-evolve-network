import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/middleware";
import {
  twoProportionUplift,
  formatUpliftClaim,
  type UpliftResult,
} from "./uplift";

// ---------------------------------------------------------------------------
// Customer-value proof surface:
//  - getSkillUplift: public counterfactual "skill on vs. off" result per package.
//  - getWorkspaceRoi: admin-only ROI aggregation per (anonymized) workspace.
// The database returns raw counts only; all statistics live in ./uplift.ts so
// the published numbers are reproducible offline from the same counts.
// ---------------------------------------------------------------------------

type ArmAgg = {
  n: number;
  completed: number;
  interventions: number;
  thumbs_up: number;
  thumbs_down: number;
  avg_latency_ms: number;
  avg_tokens: number;
};

const EMPTY_ARM: ArmAgg = {
  n: 0,
  completed: 0,
  interventions: 0,
  thumbs_up: 0,
  thumbs_down: 0,
  avg_latency_ms: 0,
  avg_tokens: 0,
};

export type SkillUplift = {
  slug: string;
  window_days: number;
  control: ArmAgg;
  treatment: ArmAgg;
  completion: UpliftResult;
  /** Uplift on "no human intervention needed" — a second value dimension. */
  autonomy: UpliftResult;
  claim: string;
  has_control_arm: boolean;
};

export const getSkillUplift = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ slug: z.string().min(1).max(128), days: z.number().int().min(1).max(365).optional() })
      .parse(d),
  )
  .handler(async ({ data }): Promise<SkillUplift> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const days = data.days ?? 30;
    const { data: raw, error } = await supabase.rpc("get_skill_uplift" as any, {
      _slug: data.slug,
      _days: days,
    } as any);
    if (error) throw new Error(`uplift lookup failed: ${error.message}`);

    const arms = ((raw as any)?.arms ?? {}) as Record<string, Partial<ArmAgg>>;
    const control: ArmAgg = { ...EMPTY_ARM, ...num(arms.control) };
    const treatment: ArmAgg = { ...EMPTY_ARM, ...num(arms.treatment) };

    const completion = twoProportionUplift(
      { n: control.n, completed: control.completed },
      { n: treatment.n, completed: treatment.completed },
    );
    const autonomy = twoProportionUplift(
      { n: control.n, completed: control.n - control.interventions },
      { n: treatment.n, completed: treatment.n - treatment.interventions },
    );

    return {
      slug: data.slug,
      window_days: days,
      control,
      treatment,
      completion,
      autonomy,
      claim: formatUpliftClaim(completion),
      has_control_arm: control.n > 0 && treatment.n > 0,
    };
  });

function num(a?: Partial<ArmAgg>): Partial<ArmAgg> {
  if (!a) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(a)) out[k] = Number(v ?? 0);
  return out as Partial<ArmAgg>;
}

export type WorkspaceRoiRow = {
  workspace_hash: string;
  executions: number;
  completed: number;
  completion_rate: number;
  interventions: number;
  intervention_rate: number;
  latency_saved_ms: number;
  tokens_saved: number;
  guardrail_blocks: number;
  thumbs_up: number;
  thumbs_down: number;
  packages_used: number;
  last_seen: string | null;
  /** Derived: agent-hours saved vs. the reported baseline. */
  hours_saved: number;
};

export const getWorkspaceRoi = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const supabase = (context as any).supabase as any;
    const days = data.days ?? 30;
    const { data: rows, error } = await supabase.rpc("get_workspace_roi", { _days: days });
    if (error) throw new Response(error.message, { status: 403 });

    const workspaces: WorkspaceRoiRow[] = ((rows ?? []) as any[]).map((r) => ({
      workspace_hash: String(r.workspace_hash ?? "unknown"),
      executions: Number(r.executions ?? 0),
      completed: Number(r.completed ?? 0),
      completion_rate: Number(r.completion_rate ?? 0),
      interventions: Number(r.interventions ?? 0),
      intervention_rate: Number(r.intervention_rate ?? 0),
      latency_saved_ms: Number(r.latency_saved_ms ?? 0),
      tokens_saved: Number(r.tokens_saved ?? 0),
      guardrail_blocks: Number(r.guardrail_blocks ?? 0),
      thumbs_up: Number(r.thumbs_up ?? 0),
      thumbs_down: Number(r.thumbs_down ?? 0),
      packages_used: Number(r.packages_used ?? 0),
      last_seen: r.last_seen ?? null,
      hours_saved: Math.round((Number(r.latency_saved_ms ?? 0) / 3_600_000) * 100) / 100,
    }));

    const totals = workspaces.reduce(
      (acc, w) => {
        acc.executions += w.executions;
        acc.completed += w.completed;
        acc.interventions += w.interventions;
        acc.hours_saved += w.hours_saved;
        acc.tokens_saved += w.tokens_saved;
        acc.guardrail_blocks += w.guardrail_blocks;
        return acc;
      },
      { executions: 0, completed: 0, interventions: 0, hours_saved: 0, tokens_saved: 0, guardrail_blocks: 0 },
    );

    return {
      days,
      workspaces,
      totals: {
        ...totals,
        hours_saved: Math.round(totals.hours_saved * 100) / 100,
        network_completion_rate:
          totals.executions > 0
            ? Math.round((totals.completed / totals.executions) * 10000) / 10000
            : 0,
      },
    };
  });

/** Active experiments, for the admin dashboard and public transparency. */
export const listExperiments = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("skill_experiments" as any)
    .select("package_slug, key, hypothesis, control_share, status, started_at, ended_at")
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) return { experiments: [] as any[], error: "unavailable" };
  return { experiments: (data ?? []) as any[], error: null as string | null };
});
