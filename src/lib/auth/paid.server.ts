import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractBearer, verifyBearerDetailed } from "@/lib/auth/bearer.server";

const supabaseAdmin = _supabaseAdmin as any;

export type PaidCheck =
  | { ok: true; userId: string; source: "oauth" | "pat" }
  | { ok: false; status: 401 | 403; error: string; message: string };

/**
 * Bearer -> paid-plan gate for raw HTTP routes under `/api/public/*`.
 *
 * Server-function routes get this from `requirePaidSubscription` middleware,
 * but a public HTTP endpoint has no middleware chain and no Supabase session:
 * external callers authenticate with an OAuth access token or a personal MCP
 * token. Same subscription rule as the MCP cloud tools (active / trialing /
 * past_due, and not past its period end).
 */
export async function requirePaidBearer(request: Request): Promise<PaidCheck> {
  const token = extractBearer(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message:
        "Send `Authorization: Bearer <token>`. Use an OAuth access token from the MCP connection, or a personal token from superagentskill.com/account/tokens.",
    };
  }

  const verified = await verifyBearerDetailed(token);
  if (!verified.ok) {
    return {
      ok: false,
      status: 401,
      error: "invalid_token",
      message: `The bearer token was not honoured (${verified.reason}). Re-authorize the MCP connection or issue a new personal token.`,
    };
  }

  const userId = verified.auth.user_id;
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isActive = !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!isActive) {
    return {
      ok: false,
      status: 403,
      error: "subscription_required",
      message:
        "Batch review is an Agent Pass / Enterprise feature. Upgrade at superagentskill.com/pricing, or use the free single-document endpoint POST /api/public/review.",
    };
  }

  return { ok: true, userId, source: verified.auth.source };
}
