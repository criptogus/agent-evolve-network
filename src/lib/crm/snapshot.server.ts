/**
 * CRM snapshot — the single source of truth for "what has this customer done,
 * what was it worth, and what should they do next".
 *
 * Server-only: uses the admin client so the cadence runner (no user session)
 * and the admin dashboard read exactly the same numbers the customer sees
 * in-app and in email.
 */
import { supabaseAdmin as _admin } from "@/integrations/supabase/client.server";
import { buildValueProof } from "@/lib/skills/value-proof";
import { projectImpact } from "@/lib/skills/impact-projection";
import type { CrmRoi, CrmSnapshot } from "@/lib/crm/types";
import {
  classifyStage,
  opportunities,
  valueActionCount,
  isPaying,
  type CrmCustomerRow,
} from "@/lib/crm/segments";

const admin = _admin as any;

export type { CrmRoi, CrmSnapshot, CrmUsage } from "@/lib/crm/types";

const EMPTY_ROI: CrmRoi = {
  improved_docs: 0,
  reviewed_docs: 0,
  points_gained: 0,
  monthly_usd_saved: 0,
  annual_usd_saved: 0,
  rescued_runs_per_month: 0,
  engineer_hours_saved_per_month: 0,
  tokens_saved_per_month: 0,
  best: null,
  headroom_monthly_usd: 0,
  latest_score: null,
  latest_grade: null,
};

const DAY = 86_400_000;
const days = (iso: string | null) =>
  iso
    ? Math.max(0, Math.round(((Date.now() - new Date(iso).getTime()) / DAY) * 10) / 10)
    : Number.POSITIVE_INFINITY;

/** Realized ROI from the customer's own review history (before -> after per doc). */
export async function computeRoi(userId: string): Promise<CrmRoi> {
  type Run = {
    doc_key: string;
    doc_type: string | null;
    overall_score: number;
    grade: string | null;
    created_at: string;
  };
  let rows: Run[] = [];
  try {
    const { data } = await admin
      .from("skill_review_runs")
      .select("doc_key, doc_type, overall_score, grade, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(2000);
    rows = (data ?? []) as Run[];
  } catch {
    return { ...EMPTY_ROI };
  }
  if (rows.length === 0) return { ...EMPTY_ROI };

  const byDoc = new Map<string, Run[]>();
  for (const r of rows) {
    const list = byDoc.get(r.doc_key) ?? [];
    list.push(r);
    byDoc.set(r.doc_key, list);
  }

  const roi: CrmRoi = { ...EMPTY_ROI, reviewed_docs: byDoc.size };
  let bestGain = 0;

  for (const [key, list] of byDoc) {
    const first = list[0]!;
    const last = list[list.length - 1]!;
    const name = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
    const type = first.doc_type ?? "skill";

    // Headroom: money still on the table if this doc reached grade A.
    const headroom = projectImpact({ score: last.overall_score, targetScore: 92 });
    roi.headroom_monthly_usd += headroom.savings.monthlyUsd;

    if (last.overall_score <= first.overall_score) continue;
    const proof = buildValueProof({
      name,
      type,
      beforeScore: first.overall_score,
      afterScore: last.overall_score,
      actionsApplied: list.length - 1,
      semanticPass: true,
    });
    roi.improved_docs += 1;
    roi.points_gained += proof.score_change;
    roi.monthly_usd_saved += proof.business_case.monthly_usd_saved;
    roi.rescued_runs_per_month += proof.business_case.rescued_runs_per_month;
    roi.engineer_hours_saved_per_month += proof.business_case.engineer_hours_saved_per_month;
    roi.tokens_saved_per_month += proof.business_case.tokens_saved_per_month;

    const gain = last.overall_score - first.overall_score;
    if (gain > bestGain) {
      bestGain = gain;
      roi.best = {
        name,
        before: first.overall_score,
        after: last.overall_score,
        grade_before: proof.before.grade,
        grade_after: proof.after.grade,
      };
    }
  }

  const newest = rows[rows.length - 1]!;
  roi.latest_score = newest.overall_score;
  roi.latest_grade = newest.grade ?? null;
  roi.monthly_usd_saved = Math.round(roi.monthly_usd_saved);
  roi.annual_usd_saved = Math.round(roi.monthly_usd_saved * 12);
  roi.headroom_monthly_usd = Math.round(roi.headroom_monthly_usd);
  roi.points_gained = Math.round(roi.points_gained);
  roi.rescued_runs_per_month = Math.round(roi.rescued_runs_per_month);
  roi.tokens_saved_per_month = Math.round(roi.tokens_saved_per_month);
  roi.engineer_hours_saved_per_month = Math.round(roi.engineer_hours_saved_per_month);
  return roi;
}

export function displayName(row: CrmCustomerRow): string {
  if (row.display_name) return row.display_name.split(" ")[0]!;
  if (row.handle) return row.handle;
  return row.email?.split("@")[0] ?? "there";
}

export async function buildSnapshot(row: CrmCustomerRow): Promise<CrmSnapshot> {
  const roi = await computeRoi(row.user_id);
  return {
    row,
    stage: classifyStage(row),
    name: displayName(row),
    usage: {
      reviews: row.review_count,
      uploads: row.upload_count,
      agents: row.agent_count,
      diagnoses: row.diagnosis_count,
      residencies: row.residency_count,
      installs: row.install_count,
      published: row.package_count,
      cloud_skills: row.cloud_skill_count,
      executions_30d: row.executions_30d,
      credits_spent: row.credits_spent,
      mcp_calls: row.mcp_call_count,
      connected: row.mcp_token_count > 0 || row.mcp_call_count > 0,
      days_since_signup: days(row.signed_up_at),
      days_idle: days(row.last_active_at),
    },
    roi,
    opportunities: opportunities(row),
    paying: isPaying(row),
  };
}

/** Load customer rows from the admin reporting function. */
export async function loadCustomerRows(limit = 500, offset = 0): Promise<CrmCustomerRow[]> {
  const { data, error } = await admin.rpc("crm_customers", { _limit: limit, _offset: offset });
  if (error) throw new Error(error.message);
  return (data ?? []) as CrmCustomerRow[];
}

export { valueActionCount };
