import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

export type TrustSummary = {
  slug: string;
  trust_score: number | null;
  battle_tested: boolean;
  lifetime: { runs: number; success_rate: number | null };
  window_30d: { runs: number; success_rate: number | null; p50_latency_ms: number | null; p95_latency_ms: number | null };
  window_7d: { runs: number; success_rate: number | null };
  models: Array<{ model: string; runs: number; success_rate: number }>;
  findings_public: number;
  findings_critical: number;
};

export type Finding = {
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  summary: string;
  fixed_in_version: string | null;
  published_at: string | null;
};

export type Compat = {
  model: string;
  pass_rate: number;
  total_cases: number;
  passed_cases: number;
  judge_score: number | null;
  status: "pass" | "warn" | "fail";
  notes: string | null;
  version: string | null;
  evaluated_at: string;
};

export const getSkillTrust = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,type,description,latest_version,author_handle,is_published,review_status")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pkg || !pkg.is_published) return { ok: false as const, error: "not_found" };

    const { data: trust } = await supabaseAdmin.rpc("get_skill_trust", { _slug: data.slug } as any);
    const { data: findings } = await supabaseAdmin
      .from("skill_robustness_findings")
      .select("code,severity,category,summary,fixed_in_version,published_at")
      .eq("package_slug", data.slug)
      .eq("status", "public")
      .order("published_at", { ascending: false })
      .limit(50);
    const { data: compat } = await supabaseAdmin
      .from("skill_compatibility")
      .select("model,pass_rate,total_cases,passed_cases,judge_score,status,notes,version,evaluated_at")
      .eq("package_slug", data.slug)
      .order("judge_score", { ascending: false });

    return {
      ok: true as const,
      package: pkg,
      trust: (trust as unknown as TrustSummary) ?? null,
      findings: (findings ?? []) as Finding[],
      compat: (compat ?? []) as Compat[],
    };
  });
