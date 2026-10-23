import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { compareEvidence } from "./compare";
export const getTaskEvidence = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: z.string().min(2).max(64),
        version: z.string().max(40).optional(),
        model: z.string().max(120).optional(),
        experiment: z.string().max(96).optional(),
        days: z.number().int().min(1).max(365).default(30),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin.rpc("skill_evidence", {
      _slug: data.slug,
      _version: data.version || undefined,
      _model: data.model || undefined,
      _experiment: data.experiment || undefined,
      _days: data.days,
    });
    if (error) throw new Error("Could not load measured evidence");
    return { groups: compareEvidence(rows ?? []), days: data.days };
  });
