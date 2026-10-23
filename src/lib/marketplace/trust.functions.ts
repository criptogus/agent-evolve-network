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

// Trust Score v2 — evidence-gated, multi-dimensional vector.
// Read directly from package_trust_scores (written by recompute_trust_scores_v2).
export type TrustV2 = {
  score: number | null; // 0..1
  confidence: number | null; // 0..1
  verified: boolean;
  version: string | null;
  dimensions: {
    safety: number | null;
    competence: number | null;
    freshness: number | null;
    coverage: number | null;
  };
  computed_at: string | null;
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
    if (!pkg || !pkg.is_published || pkg.review_status !== "approved") {
      return { ok: false as const, error: "not_found" };
    }

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

    // Trust Score v2 vector — additive, read straight from the scored table.
    const { data: v2row } = await supabaseAdmin
      .from("package_trust_scores")
      .select(
        "score,confidence,verified,trust_version,dim_safety,dim_competence,dim_freshness,dim_coverage,computed_at",
      )
      .eq("package_id", pkg.id)
      .maybeSingle();

    const trust_v2: TrustV2 | null = v2row
      ? {
          score: v2row.score ?? null,
          confidence: v2row.confidence ?? null,
          verified: Boolean(v2row.verified),
          version: v2row.trust_version ?? null,
          dimensions: {
            safety: v2row.dim_safety ?? null,
            competence: v2row.dim_competence ?? null,
            freshness: v2row.dim_freshness ?? null,
            coverage: v2row.dim_coverage ?? null,
          },
          computed_at: v2row.computed_at ?? null,
        }
      : null;

    return {
      ok: true as const,
      package: pkg,
      trust: (trust as unknown as TrustSummary) ?? null,
      trust_v2,
      findings: (findings ?? []) as Finding[],
      compat: (compat ?? []) as Compat[],
    };
  });
