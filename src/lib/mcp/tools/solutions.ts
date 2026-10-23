import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { SOLUTIONS, planSolution } from "@/lib/solutions/catalog";
import { PROJECT_TYPES } from "@/lib/marketplace/project-profile";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { compareEvidence } from "@/lib/evidence/compare";
const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
export const listSolutionsTool = defineTool({
  name: "list_solutions",
  description:
    "Read-only business workflows, input contracts, dependency order, context budgets and approval availability. Does not execute, install or spend credits.",
  parameters: z.object({
    id: z.string().optional(),
    context_budget: z.number().int().min(1).max(20).default(4),
  }),
  execute: async ({ id, context_budget }) => {
    const chosen = id ? SOLUTIONS.filter((s) => s.id === id) : SOLUTIONS;
    if (!chosen.length) return json({ error: "Unknown solution" });
    const slugs = [...new Set(chosen.flatMap((s) => s.packages))];
    const { data, error } = await supabaseAdmin
      .from("packages")
      .select("slug,latest_version")
      .in("slug", slugs)
      .eq("is_published", true)
      .eq("review_status", "approved")
      .eq("price_credits", 0);
    if (error) throw new Error("Unable to check approvals");
    return json({
      profiles: PROJECT_TYPES,
      solutions: chosen.map((s) => ({
        ...s,
        plan: planSolution(s, context_budget),
        packages: s.packages.map((slug) => ({
          slug,
          version: data?.find((p) => p.slug === slug)?.latest_version ?? null,
          public_approved: !!data?.some((p) => p.slug === slug),
        })),
      })),
      execution: "manual",
      url: "https://superagentskill.com/solutions",
    });
  },
});
export const compareTaskEvidenceTool = defineTool({
  name: "compare_task_evidence",
  description:
    "Read-only task completion evidence separated by exact skill version, model and experiment, with measured counts and 95% intervals. Observational self-reported evidence; no invented uplift or model certification.",
  parameters: z.object({
    slug: z.string().min(2).max(64),
    version: z.string().max(40).optional(),
    model: z.string().max(120).optional(),
    experiment: z.string().max(96).optional(),
    days: z.number().int().min(1).max(365).default(30),
  }),
  execute: async ({ slug, version, model, experiment, days }) => {
    const { data, error } = await supabaseAdmin.rpc("skill_evidence", {
      _slug: slug,
      _version: version,
      _model: model,
      _experiment: experiment,
      _days: days,
    });
    if (error) throw new Error("Unable to load evidence");
    return json({ groups: compareEvidence(data ?? []), days });
  },
});
