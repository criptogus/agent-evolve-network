import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase as anon } from "@/integrations/supabase/client";
import { requireAdmin } from "./middleware";

const PlanInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  monthly_runs_limit: z.number().int().min(0).max(10_000_000),
  max_installed_packages: z.number().int().min(0).max(100_000),
  price_cents: z.number().int().min(0).max(10_000_000),
  features: z.array(z.string().max(120)).max(20),
  sort_order: z.number().int().min(0).max(1000).default(0),
});

// Public — anyone can list plans (for pricing page etc.).
export const listPlansPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await anon
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Response(error.message, { status: 500 });
  return { plans: data ?? [] };
});

export const upsertPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => PlanInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const payload = { ...data, features: data.features as any };
    const { data: row, error } = await supabase
      .from("plans")
      .upsert(payload, { onConflict: "slug" })
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    return { plan: row };
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase.from("plans").delete().eq("id", data.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
