import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LedgerEntry = {
  id: string;
  delta: number;
  balance_after: number;
  reason:
    | "signup_bonus"
    | "subscription_grant"
    | "purchase"
    | "sale"
    | "refund"
    | "manual_adjustment"
    | "promo";
  ref_type: string | null;
  ref_id: string | null;
  description: string | null;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
};

export type CreditSummary = {
  balance: number;
  total_earned: number;
  total_spent: number;
  signup_bonus: number;
  recent: LedgerEntry[];
};

export const getCreditSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreditSummary> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("credit_ledger")
      .select("id,delta,balance_after,reason,ref_type,ref_id,description,metadata,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("getCreditSummary: failed to read credit_ledger", error);
      return { balance: 0, total_earned: 0, total_spent: 0, signup_bonus: 0, recent: [] };
    }

    const all = (rows ?? []) as LedgerEntry[];
    const balance = all[0]?.balance_after ?? 0;
    let earned = 0;
    let spent = 0;
    let bonus = 0;
    for (const r of all) {
      if (r.delta > 0) earned += r.delta;
      else spent += -r.delta;
      if (r.reason === "signup_bonus") bonus += r.delta;
    }
    return { balance, total_earned: earned, total_spent: spent, signup_bonus: bonus, recent: all.slice(0, 50) };
  });

export const listMyLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).default(100), offset: z.number().int().min(0).default(0) }).parse(d ?? {})
  )
  .handler(async ({ context, data }): Promise<{ entries: LedgerEntry[] }> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("credit_ledger")
      .select("id,delta,balance_after,reason,ref_type,ref_id,description,metadata,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Response(error.message, { status: 500 });
    return { entries: (rows ?? []) as LedgerEntry[] };
  });

const PurchaseInput = z.object({ package_id: z.string().uuid() });

export const purchasePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PurchaseInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("purchase_package", {
      _package_id: data.package_id,
    });
    if (error) {
      // Surface user-friendly errors from the RPC
      const msg = error.message || "Purchase failed";
      const known: Record<string, string> = {
        INSUFFICIENT_CREDITS: "Not enough credits. Top up to complete this purchase.",
        ALREADY_OWNED: "You already own this package.",
        CANNOT_BUY_OWN_PACKAGE: "You can't buy your own package.",
        PACKAGE_NOT_AVAILABLE: "This package isn't available for purchase right now.",
        PACKAGE_NOT_FOUND: "Package not found.",
        PACKAGE_IS_FREE: "This package is free — no purchase needed.",
        NOT_AUTHENTICATED: "Sign in to buy packages.",
      };
      const matched = Object.keys(known).find((k) => msg.includes(k));
      throw new Response(matched ? known[matched] : msg, { status: 400 });
    }
    return result as {
      purchase_id: string;
      credits_paid: number;
      author_credits: number;
      platform_credits: number;
      new_balance: number;
    };
  });

export const listMyPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("package_purchases")
      .select("package_id, credits_paid, created_at")
      .eq("buyer_id", userId);
    if (error) throw new Response(error.message, { status: 500 });
    return { purchases: data ?? [] };
  });
