// Server-side delta tracking for review_skill.
//
// Before this, `delta_vs_previous` only existed when the CALLER remembered to
// echo back `previous_hash` + `previous_overall_score`. Agents rarely do, so
// measuring evolution (73 -> 85) was a manual exercise (client-reported gap).
// Now every authenticated review run is persisted and the delta + short
// history are computed server-side.
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";

const supabaseAdmin = _supabaseAdmin as any;

export type ReviewRunRow = {
  overall_score: number;
  verdict_score: number | null;
  format_score: number | null;
  substance_score: number | null;
  grade: string | null;
  doc_hash: string;
  created_at: string;
};

export type ReviewHistory = {
  doc_key: string;
  runs: ReviewRunRow[];
  first_overall_score: number | null;
  best_overall_score: number | null;
  total_change: number | null;
};

/** Stable identity for "the same document across runs": name + type. */
export function docKey(name: string, type: string): string {
  return `${type}:${name.trim().toLowerCase()}`.slice(0, 300);
}

export async function loadReviewHistory(
  userId: string,
  key: string,
  limit = 10,
): Promise<ReviewHistory | null> {
  try {
    const { data } = await supabaseAdmin
      .from("skill_review_runs")
      .select("overall_score, verdict_score, format_score, substance_score, grade, doc_hash, created_at")
      .eq("user_id", userId)
      .eq("doc_key", key)
      .order("created_at", { ascending: false })
      .limit(limit);
    const runs = (data ?? []) as ReviewRunRow[];
    if (runs.length === 0) return null;
    const oldest = runs[runs.length - 1];
    return {
      doc_key: key,
      runs,
      first_overall_score: oldest?.overall_score ?? null,
      best_overall_score: Math.max(...runs.map((r) => r.overall_score)),
      total_change: runs[0] && oldest ? runs[0].overall_score - oldest.overall_score : null,
    };
  } catch {
    return null; // history is a bonus, never a failure mode for the review
  }
}

export async function recordReviewRun(input: {
  userId: string;
  docKey: string;
  docHash: string;
  docType: string;
  docClass?: string | null;
  language?: string | null;
  overall: number;
  verdict?: number | null;
  format?: number | null;
  substance?: number | null;
  grade?: string | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from("skill_review_runs").insert({
      user_id: input.userId,
      doc_key: input.docKey,
      doc_hash: input.docHash,
      doc_type: input.docType,
      doc_class: input.docClass ?? null,
      language: input.language ?? null,
      overall_score: input.overall,
      verdict_score: input.verdict ?? null,
      format_score: input.format ?? null,
      substance_score: input.substance ?? null,
      grade: input.grade ?? null,
    });
  } catch (e: any) {
    console.error(`[review-history] insert failed: ${e?.message ?? e}`);
  }
}
