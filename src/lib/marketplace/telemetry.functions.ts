import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EvalRow = {
  slug: string;
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  version: string;
  runs30d: number;
  ok30d: number;
  successRate30d: number | null;
  p95Latency: number | null;
  lastRunAt: string | null;
  trustScore: number | null;
  criticalFindings: number;
  battleTested: boolean;
};

export const getEvaluationData = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ rows: EvalRow[] }> => {
    const { data: pkgs } = await supabaseAdmin
      .from("packages")
      .select("id, slug, name, type, latest_version")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("install_count", { ascending: false })
      .limit(60);

    const rows: EvalRow[] = [];
    for (const p of pkgs ?? []) {
      const { data: trust } = await supabaseAdmin.rpc("get_skill_trust", { _slug: p.slug });
      const t = (trust ?? {}) as Record<string, unknown>;
      const w30 = (t.window_30d ?? {}) as Record<string, unknown>;
      const lifetime = (t.lifetime ?? {}) as Record<string, unknown>;

      const { data: last } = await supabaseAdmin
        .from("skill_executions")
        .select("created_at")
        .eq("package_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1);

      rows.push({
        slug: p.slug,
        name: p.name,
        type: p.type as EvalRow["type"],
        version: p.latest_version,
        runs30d: Number(w30.runs ?? 0),
        ok30d: Math.round(Number(w30.runs ?? 0) * Number(w30.success_rate ?? 0)),
        successRate30d: w30.success_rate != null ? Number(w30.success_rate) : null,
        p95Latency: w30.p95_latency_ms != null ? Number(w30.p95_latency_ms) : null,
        lastRunAt: last?.[0]?.created_at ?? null,
        trustScore: t.trust_score != null ? Number(t.trust_score) : null,
        criticalFindings: Number(t.findings_critical ?? 0),
        battleTested: !!t.battle_tested,
      });
      // Touch lifetime to satisfy linter
      void lifetime;
    }
    return { rows };
  }
);

export type ForgeData = {
  installed: Array<{
    slug: string;
    name: string;
    type: string;
    version: string;
    installedAt: string;
    runs30d: number;
    successRate30d: number | null;
    trustScore: number | null;
    outdated: boolean;
  }>;
  recommended: Array<{
    slug: string;
    name: string;
    type: string;
    description: string;
    installCount: number;
    avgRating: number;
    reviewCount: number;
  }>;
  healthScore: number | null;
};

export const getSkillForgeData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ForgeData> => {
    const { userId } = context;

    const { data: rawInstalls } = await supabaseAdmin
      .from("package_installs")
      .select("package_id, installed_at, version, packages!inner(id, slug, name, type, latest_version)")
      .eq("user_id", userId);

    const installedIds = (rawInstalls ?? []).map((r) => r.package_id);

    const installed = [] as ForgeData["installed"];
    const trustValues: number[] = [];
    for (const r of rawInstalls ?? []) {
      const pkg = r.packages as unknown as { slug: string; name: string; type: string; latest_version: string };
      const { data: trust } = await supabaseAdmin.rpc("get_skill_trust", { _slug: pkg.slug });
      const t = (trust ?? {}) as Record<string, unknown>;
      const w30 = (t.window_30d ?? {}) as Record<string, unknown>;
      const ts = t.trust_score != null ? Number(t.trust_score) : null;
      if (ts != null) trustValues.push(ts);
      const installedVersion = (r.version as string | null) ?? pkg.latest_version;
      installed.push({
        slug: pkg.slug,
        name: pkg.name,
        type: pkg.type,
        version: installedVersion,
        installedAt: r.installed_at as string,
        runs30d: Number(w30.runs ?? 0),
        successRate30d: w30.success_rate != null ? Number(w30.success_rate) : null,
        trustScore: ts,
        outdated: installedVersion !== pkg.latest_version,
        latestVersion: pkg.latest_version,
      });
    }

    let recQuery = supabaseAdmin
      .from("packages")
      .select("slug, name, type, description, install_count, id")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("install_count", { ascending: false })
      .limit(8);
    if (installedIds.length) recQuery = recQuery.not("id", "in", `(${installedIds.join(",")})`);
    const { data: recPkgs } = await recQuery;

    const recommended: ForgeData["recommended"] = [];
    for (const p of recPkgs ?? []) {
      const { data: ratings } = await supabaseAdmin.rpc("get_package_ratings", { _package_id: p.id });
      const rg = (ratings ?? {}) as Record<string, number>;
      recommended.push({
        slug: p.slug,
        name: p.name,
        type: p.type,
        description: p.description ?? "",
        installCount: p.install_count ?? 0,
        avgRating: Number(rg.total_avg ?? 0),
        reviewCount: Number(rg.total_count ?? 0),
      });
    }

    const healthScore =
      trustValues.length > 0
        ? Math.round((trustValues.reduce((s, v) => s + v, 0) / trustValues.length) * 10) / 10
        : null;

    return { installed, recommended: recommended.slice(0, 6), healthScore };
  });

export const installPackageBySlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("id, price_credits")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pkg) throw new Response("Package not found", { status: 404 });
    if ((pkg.price_credits ?? 0) > 0) {
      throw new Response("Paid package — purchase required", { status: 402 });
    }
    const { error } = await supabaseAdmin
      .from("package_installs")
      .upsert({ user_id: userId, package_id: pkg.id }, { onConflict: "user_id,package_id" });
    if (error) throw new Response(error.message, { status: 500 });
    // (Install count is updated via purchase flows / triggers; skipped here.)
    return { ok: true };
  });
