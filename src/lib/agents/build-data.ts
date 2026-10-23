import { z } from "zod";
import type { Row, Update } from "@/integrations/supabase/database";
import { toJson } from "../json.ts";
const doc = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
});
const guardrail = z.object({
  slug: z.string(),
  title: z.string(),
  rule: z.string(),
  why: z.string(),
  blocked_example: z.string().optional(),
  instead: z.string().optional(),
});
const brief = z.object({
  role: z.string(),
  company: z.string(),
  industry: z.string().optional(),
  outcomes: z.string().optional(),
  tone: z.string().optional(),
  constraints: z.string().optional(),
  context: z.string().optional(),
  language: z.string().optional(),
});
const score = z.object({
  score: z.number(),
  axes: z.array(z.object({ name: z.string(), score: z.number(), note: z.string() })),
  weaknesses: z.array(z.string()),
  verdict: z.string(),
});
const report = z.object({
  principles: z.array(z.string()).optional(),
  first_pass: score.nullish(),
  final_pass: score.nullish(),
  edited_pass: score.nullish(),
  repaired: z.boolean().optional(),
});
/** Validate persisted JSON before using it as executable agent content. */
export function decodeAgentBuild(row: Row<"agent_builds">) {
  return {
    ...row,
    brief: brief.parse(row.brief),
    skills: z.array(doc).parse(row.skills ?? []),
    playbooks: z.array(doc).parse(row.playbooks ?? []),
    guardrails: z.array(guardrail).parse(row.guardrails ?? []),
    research_sources: z
      .array(z.object({ title: z.string(), ref: z.string() }))
      .parse(row.research_sources ?? []),
    report: report.parse(row.report ?? {}),
  };
}
type Build = ReturnType<typeof decodeAgentBuild>;
export type AgentBuildPatch = Partial<Omit<Build, "id">>;
export function encodeAgentBuildPatch(patch: AgentBuildPatch): Update<"agent_builds"> {
  const { brief, skills, playbooks, guardrails, research_sources, report, ...columns } = patch;
  return {
    ...columns,
    ...(brief !== undefined ? { brief: toJson(brief) } : {}),
    ...(skills !== undefined ? { skills: toJson(skills) } : {}),
    ...(playbooks !== undefined ? { playbooks: toJson(playbooks) } : {}),
    ...(guardrails !== undefined ? { guardrails: toJson(guardrails) } : {}),
    ...(research_sources !== undefined ? { research_sources: toJson(research_sources) } : {}),
    ...(report !== undefined ? { report: toJson(report) } : {}),
  };
}
