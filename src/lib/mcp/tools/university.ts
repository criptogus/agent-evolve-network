import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { startExam, submitExam, getDiagnosisForCurriculum } from "@/lib/university/university.server";
import { planCurriculum } from "@/lib/university/curriculum";
import { DOMAINS, type DomainId, type ErrorClass } from "@/lib/university/types";

const json = (v: unknown) => JSON.stringify(v, null, 2);

const DomainEnum = z.enum([
  "gtm",
  "engineering",
  "support",
  "finance",
  "data",
  "marketing",
  "b2b_sales",
  "customer_success",
  "pricing",
  "strategy",
  "project_management",
  "people_ops",
  "legal_compliance",
  "corporate_finance",
  "agentic_crm",
  "supply_chain",
  "data_engineering",
  "social_media",
  "google_ads",
  "meta_ads",
  "linkedin_ads",
  "digital_product",
  "complex_software",
  "tools_mcp",
  "cybersecurity",
]);
const ErrorClassEnum = z.enum([
  "ambiguity_abandon",
  "hallucination",
  "format_break",
  "task_abandon",
  "policy_violation",
  "tool_misuse",
  "instruction_drift",
]);

function userIdOf(ctx: any): string | null {
  return (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
}

export const diagnoseStartTool = defineTool({
  name: "diagnose_start",
  description:
    "[UNIVERSITY] Admission exam, step 1. Returns a fixed bank of up to 168 domain tasks across 21 corporate domains for YOU (the calling agent) to execute on your own host. No skill is installed and nothing is scored yet. Then post the transcript to `diagnose_submit` to get a per-error-class report and a prescription. Free and anonymous; history is kept when a bearer is present.",
  parameters: z.object({
    domain: DomainEnum.describe("gtm | engineering | support | finance | data | marketing | b2b_sales | customer_success | pricing | strategy | project_management | people_ops | legal_compliance | corporate_finance | agentic_crm | supply_chain | data_engineering | social_media | google_ads | meta_ads | linkedin_ads | digital_product | complex_software | tools_mcp | cybersecurity"),
    installed_skills: z.array(z.string()).max(64).default([]).describe("Slugs the agent already carries — used for marginal-gain ranking."),
    agent_fp: z.string().max(120).optional().describe("Stable agent fingerprint, so score deltas can be tracked over time."),
    limit: z.number().int().min(1).max(40).default(40),
  }),
  execute: async (input, ctx) => {
    const exam = await startExam({
      domain: input.domain as DomainId,
      userId: userIdOf(ctx),
      agentFp: input.agent_fp ?? null,
      installedSkills: input.installed_skills,
      limit: input.limit,
    });
    return json({
      ...exam,
      rules: [
        "Execute cada tarefa exatamente como um pedido real do usuário — sem contexto extra e sem otimizar para o exame.",
        "Não consulte a plataforma durante a execução. As expectativas são privadas por design.",
        "Reporte latency_ms e tokens quando conseguir: o relatório mostra o custo por classe de erro.",
      ],
    });
  },
});

export const diagnoseSubmitTool = defineTool({
  name: "diagnose_submit",
  description:
    "[UNIVERSITY] Admission exam, step 2. Send the answers produced for `diagnose_start` and get a deterministic transcript: score per ERROR CLASS (ambiguity, hallucination, format, abandonment, policy, tool misuse, instruction drift), the dominant bottleneck in plain language, observed cost, and a 1-3 item prescription. Unanswered cases count as failures.",
  parameters: z.object({
    diagnosis_id: z.string().optional().describe("From diagnose_start. Omit for a stateless scoring run."),
    domain: DomainEnum.optional().describe("Required when diagnosis_id is omitted."),
    installed_skills: z.array(z.string()).max(64).default([]),
    answers: z
      .array(
        z.object({
          case_id: z.string(),
          answer: z.string().max(20000),
          latency_ms: z.number().int().nonnegative().optional(),
          tokens: z.number().int().nonnegative().optional(),
        }),
      )
      .min(1)
      .max(80),
  }),
  execute: async (input) => {
    const report = await submitExam({
      diagnosisId: input.diagnosis_id ?? null,
      domain: input.domain as DomainId | undefined,
      answers: input.answers,
      installedSkills: input.installed_skills,
    });
    return json(report);
  },
});

export const curriculumNextTool = defineTool({
  name: "curriculum_next",
  description:
    "[UNIVERSITY] The next capability with the highest MARGINAL gain for this specific agent — not a catalog listing. Respects prerequisites, conflicts and a context budget: past the budget it recommends REMOVING a capability instead of adding one (an agent with 40 skills is worse, not better). Pass `diagnosis_id` from diagnose_submit, or a manual `failing` list of error classes.",
  parameters: z.object({
    diagnosis_id: z.string().optional(),
    domain: DomainEnum.optional(),
    failing: z.array(ErrorClassEnum).default([]),
    installed_skills: z.array(z.string()).max(64).default([]),
    budget: z.number().int().min(1).max(60).optional().describe("Max capabilities this agent should carry (default 12)."),
  }),
  execute: async (input) => {
    let profile: any[] | undefined;
    let installed = input.installed_skills;
    let domain = input.domain as DomainId | undefined;
    if (input.diagnosis_id) {
      const d = await getDiagnosisForCurriculum(input.diagnosis_id);
      if (d) {
        profile = d.error_profile;
        domain = domain ?? d.domain;
        if (!installed.length) installed = d.installed_skills;
      }
    }
    const failing = ((profile ?? [])
      .filter((p) => (p?.failed ?? 0) > 0)
      .map((p) => p.error_class as ErrorClass)).concat(input.failing as ErrorClass[]);

    if (!failing.length) {
      return json({
        note: "Nenhuma classe de erro informada. Rode diagnose_start / diagnose_submit primeiro — prescrição sem diagnóstico é catálogo, não currículo.",
        domains: DOMAINS,
      });
    }
    const plan = planCurriculum({ failing, profile, installed, domain, budget: input.budget });
    return json({
      ...plan,
      how_to_install: "Use `get_package { slug }` (ou `install_agent`) para os itens com in_registry: true.",
    });
  },
});
