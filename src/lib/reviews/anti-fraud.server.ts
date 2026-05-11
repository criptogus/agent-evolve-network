import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditKind = "review_submit" | "review_update" | "review_report";

export type RateRule = {
  windowSec: number;
  max: number;
  reason: string;
};

// Per-user rate caps. Adjust here if abuse patterns change.
export const REVIEW_RATE_RULES: RateRule[] = [
  { windowSec: 60, max: 1, reason: "REVIEW_COOLDOWN_60S" },
  { windowSec: 60 * 60, max: 5, reason: "REVIEW_RATE_HOUR" },
  { windowSec: 24 * 60 * 60, max: 20, reason: "REVIEW_RATE_DAY" },
];

export const REPORT_RATE_RULES: RateRule[] = [
  { windowSec: 60, max: 3, reason: "REPORT_COOLDOWN" },
  { windowSec: 60 * 60, max: 5, reason: "REPORT_RATE_HOUR" },
  { windowSec: 24 * 60 * 60, max: 10, reason: "REPORT_RATE_DAY" },
];

export async function logAuditAttempt(args: {
  userId: string;
  kind: AuditKind;
  outcome: "allowed" | "blocked";
  packageId?: string | null;
  reviewId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  // Best-effort logging; never throw from here.
  try {
    await supabaseAdmin.from("review_audit").insert({
      user_id: args.userId,
      kind: args.kind,
      outcome: args.outcome,
      package_id: args.packageId ?? null,
      review_id: args.reviewId ?? null,
      reason: args.reason ?? null,
      metadata: (args.metadata ?? {}) as never,
    });
  } catch {
    // swallow
  }
}

/**
 * Counts the number of attempts the user logged for a given audit kind within
 * a moving window. We count both `allowed` and `blocked` so a user that keeps
 * hammering blocked requests is still rate-limited.
 */
async function countRecentAttempts(args: {
  userId: string;
  kind: AuditKind;
  windowSec: number;
}): Promise<number> {
  const since = new Date(Date.now() - args.windowSec * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("review_audit")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId)
    .eq("kind", args.kind)
    .gte("created_at", since);
  if (error) return 0;
  return count ?? 0;
}

/**
 * Pre-flight rate-limit check. Returns the failing rule when blocked, or null
 * when allowed. Either way, callers should still log the final outcome with
 * `logAuditAttempt`.
 */
export async function evaluateRateLimit(args: {
  userId: string;
  kind: AuditKind;
  rules: RateRule[];
}): Promise<RateRule | null> {
  for (const rule of args.rules) {
    const seen = await countRecentAttempts({
      userId: args.userId,
      kind: args.kind,
      windowSec: rule.windowSec,
    });
    if (seen >= rule.max) return rule;
  }
  return null;
}
