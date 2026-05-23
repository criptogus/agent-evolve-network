import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Aggregate counts per funnel event over the last N days. Admin only. */
export const getMcpFunnelSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(90).optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase: _sb } = context as any;
    const supabase = _sb as any;
    const { data: rows, error } = await supabase.rpc("mcp_funnel_summary", {
      _days: data.days ?? 7,
    });
    if (error) throw new Response(error.message, { status: 403 });
    return {
      days: data.days ?? 7,
      events: (rows ?? []) as Array<{ event: string; count: number; distinct_users: number }>,
    };
  });
