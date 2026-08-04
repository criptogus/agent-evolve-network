/**
 * Server functions da residência e das credenciais (Pilares 3 e 4).
 * Module scope: só imports e declarações de server function.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  issueCredential,
  listResidencies,
  loadResidency,
  startResidency,
  submitResidencyRound,
  verifyCredential,
} from "./residency.server";
import { planRound } from "./residency";
import { DOMAINS, type DomainId, type ErrorClass } from "./types.ts";

const DomainEnum = z.enum(DOMAINS.map((d) => d.id) as [DomainId, ...DomainId[]]);

const ErrorClassEnum = z.enum([
  "ambiguity_abandon",
  "hallucination",
  "format_break",
  "task_abandon",
  "policy_violation",
  "tool_misuse",
  "instruction_drift",
]);

export const startResidencyFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        domain: DomainEnum,
        focus: z.array(ErrorClassEnum).max(7).default([]),
        installed_skills: z.array(z.string()).max(64).default([]),
        agent_fp: z.string().max(120).optional(),
        rounds: z.number().int().min(1).max(6).optional(),
        round_size: z.number().int().min(1).max(12).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    startResidency({
      domain: data.domain as DomainId,
      focus: data.focus as ErrorClass[],
      installedSkills: data.installed_skills,
      agentFp: data.agent_fp ?? null,
      totalRounds: data.rounds,
      roundSize: data.round_size,
    }),
  );

export const submitResidencyRoundFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        residency_id: z.string().uuid(),
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
          .max(24),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    submitResidencyRound({ residencyId: data.residency_id, answers: data.answers }),
  );

export const nextResidencyRoundFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ residency_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const res = await loadResidency(data.residency_id);
    if (!res) throw new Error("residency_not_found");
    const plan = planRound({
      domain: res.domain,
      focus: res.focus,
      round: res.round,
      size: res.current_case_ids.length || undefined,
      total_rounds: res.total_rounds,
    });
    return { residency_id: res.id, domain: res.domain, status: res.status, ...plan };
  });

export const issueCredentialFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ residency_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => issueCredential(data.residency_id));

export const verifyCredentialFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(32) }).parse(d))
  .handler(async ({ data }) => verifyCredential(data.code));

export const listMyResidencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    return { residencies: await listResidencies(userId) };
  });
