/**
 * Thin server-function wrappers for the University web pages.
 * Module scope holds only imports + createServerFn declarations (server-fn
 * splitting strips runtime siblings).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { startExam, submitExam, listDiagnoses, getDiagnosisForCurriculum } from "./university.server";
import { planCurriculum } from "./curriculum";
import type { DomainId, ErrorClass } from "./types.ts";

const DomainEnum = z.enum(["gtm", "engineering", "support", "finance", "data"]);

export const startDiagnosis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        domain: DomainEnum,
        installed_skills: z.array(z.string()).max(64).default([]),
        agent_fp: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    startExam({
      domain: data.domain as DomainId,
      installedSkills: data.installed_skills,
      agentFp: data.agent_fp ?? null,
    }),
  );

export const submitDiagnosis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        diagnosis_id: z.string().uuid().optional(),
        domain: DomainEnum.optional(),
        installed_skills: z.array(z.string()).max(64).default([]),
        answers: z
          .array(
            z.object({
              case_id: z.string().min(2).max(80),
              answer: z.string().max(20000),
              latency_ms: z.number().int().nonnegative().max(600000).optional(),
              tokens: z.number().int().nonnegative().max(1000000).optional(),
            }),
          )
          .min(1)
          .max(80),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    submitExam({
      diagnosisId: data.diagnosis_id ?? null,
      domain: data.domain as DomainId | undefined,
      answers: data.answers,
      installedSkills: data.installed_skills,
    }),
  );

export const getCurriculumPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        diagnosis_id: z.string().uuid().optional(),
        domain: DomainEnum.optional(),
        failing: z
          .array(
            z.enum([
              "ambiguity_abandon",
              "hallucination",
              "format_break",
              "task_abandon",
              "policy_violation",
              "tool_misuse",
              "instruction_drift",
            ]),
          )
          .default([]),
        installed_skills: z.array(z.string()).max(64).default([]),
        budget: z.number().int().min(1).max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    let profile: any[] | undefined;
    let installed = data.installed_skills;
    let domain = data.domain as DomainId | undefined;
    if (data.diagnosis_id) {
      const d = await getDiagnosisForCurriculum(data.diagnosis_id);
      if (d) {
        profile = d.error_profile;
        domain = domain ?? d.domain;
        if (!installed.length) installed = d.installed_skills;
      }
    }
    const failing =
      (profile?.filter((p) => (p?.failed ?? 0) > 0).map((p) => p.error_class as ErrorClass) ?? []).concat(
        data.failing as ErrorClass[],
      );
    return planCurriculum({ failing, profile, installed, domain, budget: data.budget });
  });

export const listMyDiagnoses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    return { diagnoses: await listDiagnoses(userId) };
  });
