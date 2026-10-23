import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Aggregate counts per funnel event over the last N days. Admin only. */
export const getMcpFunnelSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        days: z.number().int().min(1).max(90).optional(),
        exclude_bots: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase: _sb } = context as any;
    const supabase = _sb as any;
    const excludeBots = data.exclude_bots ?? true;
    const { data: rows, error } = await supabase.rpc("mcp_funnel_summary", {
      _days: data.days ?? 7,
      _exclude_bots: excludeBots,
    });
    if (error) throw new Response(error.message, { status: 403 });
    return {
      days: data.days ?? 7,
      exclude_bots: excludeBots,
      events: (rows ?? []) as Array<{ event: string; count: number; distinct_users: number }>,
    };
  });

/** Human vs bot split per event. Admin only. */
export const getMcpFunnelTrafficBreakdown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(90).optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase: _sb } = context as any;
    const supabase = _sb as any;
    const { data: rows, error } = await supabase.rpc("mcp_funnel_traffic_breakdown", {
      _days: data.days ?? 7,
    });
    if (error) throw new Response(error.message, { status: 403 });
    return {
      days: data.days ?? 7,
      rows: (rows ?? []) as Array<{
        event: string;
        human_count: number;
        bot_count: number;
        human_distinct: number;
        bot_distinct: number;
      }>,
    };
  });

/** Top User-Agent families (bots + humans). Admin only. */
export const getMcpFunnelUaFamilies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        days: z.number().int().min(1).max(90).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase: _sb } = context as any;
    const supabase = _sb as any;
    const { data: rows, error } = await supabase.rpc("mcp_funnel_ua_families", {
      _days: data.days ?? 7,
      _limit: data.limit ?? 20,
    });
    if (error) throw new Response(error.message, { status: 403 });
    return {
      days: data.days ?? 7,
      rows: (rows ?? []) as Array<{ ua_family: string; is_bot: boolean; count: number }>,
    };
  });
