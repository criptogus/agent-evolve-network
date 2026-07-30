import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireAdmin } from "@/lib/admin/middleware";

const checklistSchema = z.record(z.string(), z.boolean());

const inputSchema = z.object({
  company: z.string().min(2).max(160),
  contact_name: z.string().min(2).max(160),
  work_email: z.string().email().max(200),
  role: z.string().max(160).optional(),
  team_size: z.string().max(60).optional(),
  use_case: z.string().min(10).max(4000),
  ip_concerns: z.string().max(4000).optional(),
  nda_required: z.boolean().default(true),
  nda_accepted: z.literal(true),
  nda_signer_name: z.string().min(2).max(160),
  checklist: checklistSchema.default({}),
});

/**
 * Public intake for Enterprise / private-registry requests.
 * Inserts with the publishable (anon) key so the row is written under RLS —
 * anonymous visitors can create a request but nobody but an admin can read it.
 */
export const submitEnterpriseRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Response("Request intake unavailable", { status: 503 });

    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from("enterprise_requests").insert({
      company: data.company,
      contact_name: data.contact_name,
      work_email: data.work_email,
      role: data.role ?? null,
      team_size: data.team_size ?? null,
      use_case: data.use_case,
      ip_concerns: data.ip_concerns ?? null,
      nda_required: data.nda_required,
      nda_accepted: true,
      nda_accepted_at: new Date().toISOString(),
      nda_signer_name: data.nda_signer_name,
      checklist: data.checklist,
      status: "new",
    } as never);

    if (error) {
      console.error("submitEnterpriseRequest error", error);
      throw new Response("Could not submit your request", { status: 500 });
    }

    return { ok: true as const };
  });

export const listEnterpriseRequests = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const supabase = (context as any).supabase;
    const { data, error } = await supabase
      .from("enterprise_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("listEnterpriseRequests error", error);
      throw new Response("Could not load requests", { status: 500 });
    }
    return { requests: (data ?? []) as any[] };
  });
