import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;
import type { Database } from "@/integrations/supabase/types";

const ClaimInput = z.object({
  code: z.string().trim().min(4).max(16),
  source_url: z.string().max(500).optional().nullable(),
  package_slug: z.string().max(120).optional().nullable(),
});

export const claimReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClaimInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    const { data: result, error } = await supabase.rpc("claim_referral", {
      _code: data.code,
      _source_url: data.source_url ?? undefined,
      _package_slug: data.package_slug ?? undefined,
    });
    if (error) {
      console.error("claim_referral failed", error);
      return { ok: false, reason: error.message };
    }
    return result as { ok: boolean; reason?: string; referral_id?: string };
  });

export type ReferralStats = {
  authenticated: boolean;
  referral_code?: string;
  signups?: number;
  subscribed?: number;
  credits_earned?: number;
  clicks?: number;
};

export const getMyReferralStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReferralStats> => {
    // auth-defensive: returns { authenticated: false } when no token
    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return { authenticated: false };
      const req = getRequest();
      const auth = req?.headers?.get("authorization");
      if (!auth?.startsWith("Bearer ")) return { authenticated: false };
      const token = auth.slice("Bearer ".length);
      const supabase = createClient<Database>(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase.rpc("get_my_referral_stats");
      if (error) {
        console.error("get_my_referral_stats", error);
        return { authenticated: false };
      }
      return data as ReferralStats;
    } catch (e) {
      console.error(e);
      return { authenticated: false };
    }
  }
);

/**
 * Server-side helper: hash an IP/UA for analytics without storing PII.
 */
async function shaHex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Look up a referral row for a user that just subscribed/purchased. Server-only. */
export async function findReferralForUser(userId: string) {
  const { data } = await supabaseAdmin
    .from("referrals")
    .select("id, referrer_id, subscribed_at")
    .eq("referred_user_id", userId)
    .maybeSingle();
  return data;
}

/** Award subscription bonus to referrer if applicable. */
export async function awardSubscriptionReferral(userId: string, credits = 200) {
  const ref = await findReferralForUser(userId);
  if (!ref || ref.subscribed_at) return;
  const { error } = await supabaseAdmin.rpc("award_referral_credits", {
    _referral_id: ref.id,
    _kind: "subscription",
    _credits: credits,
  });
  if (error) console.error("awardSubscriptionReferral failed", error);
}

/** Award purchase commission (5%) to referrer. Called from purchasePackage handler. */
export async function awardPurchaseCommission(userId: string, creditsPaid: number) {
  if (!creditsPaid || creditsPaid <= 0) return;
  const ref = await findReferralForUser(userId);
  if (!ref) return;
  const commission = Math.max(1, Math.floor(creditsPaid * 0.05));
  const { error } = await supabaseAdmin.rpc("award_referral_credits", {
    _referral_id: ref.id,
    _kind: "purchase",
    _credits: commission,
  });
  if (error) console.error("awardPurchaseCommission failed", error);
}

export { shaHex };
