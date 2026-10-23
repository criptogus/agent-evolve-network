/**
 * Persistence for the admission exam. Server-only.
 *
 * Rows are written with the admin client (the exam runs anonymously too), and
 * read back only through owner-scoped helpers — anonymous rows (user_id null)
 * are reachable only by whoever holds the diagnosis id.
 */
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildReport, sampleExam } from "./diagnose";
import { findCase } from "./cases";
import type { CaseAnswer, DiagnosisReport, DomainId } from "./types.ts";

const supabaseAdmin = _supabaseAdmin as any;

export type StartedExam = {
  diagnosis_id: string | null;
  domain: DomainId;
  case_count: number;
  tasks: Array<{ case_id: string; prompt: string; output_contract?: string }>;
  how_to_submit: string;
};

export async function startExam(args: {
  domain: DomainId;
  userId?: string | null;
  agentFp?: string | null;
  installedSkills?: string[];
  limit?: number;
}): Promise<StartedExam> {
  const { cases } = sampleExam(args.domain, args.limit ?? 40);
  const caseIds = cases.map((c) => c.id);

  let diagnosisId: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("agent_diagnoses")
      .insert({
        user_id: args.userId ?? null,
        domain: args.domain,
        agent_fp: args.agentFp ?? null,
        status: "open",
        case_ids: caseIds,
        installed_skills: args.installedSkills ?? [],
      })
      .select("id")
      .single();
    diagnosisId = data?.id ?? null;
  } catch {
    // Persistence is best-effort: the exam still works stateless.
    diagnosisId = null;
  }

  return {
    diagnosis_id: diagnosisId,
    domain: args.domain,
    case_count: cases.length,
    tasks: cases.map((c) => ({
      case_id: c.id,
      prompt: c.prompt,
      output_contract: c.output_contract,
    })),
    how_to_submit:
      "Execute each task on your own host, with no extra hints, and post the results back to diagnose_submit { diagnosis_id, answers: [{ case_id, answer, latency_ms?, tokens? }] }.",
  };
}

export async function loadExam(
  diagnosisId: string,
): Promise<{ domain: DomainId; case_ids: string[]; installed_skills: string[]; user_id: string | null } | null> {
  const { data } = await supabaseAdmin
    .from("agent_diagnoses")
    .select("domain,case_ids,installed_skills,user_id")
    .eq("id", diagnosisId)
    .maybeSingle();
  if (!data) return null;
  return {
    domain: data.domain as DomainId,
    case_ids: (data.case_ids ?? []) as string[],
    installed_skills: (data.installed_skills ?? []) as string[],
    user_id: data.user_id ?? null,
  };
}

export async function submitExam(args: {
  diagnosisId?: string | null;
  domain?: DomainId;
  answers: CaseAnswer[];
  installedSkills?: string[];
}): Promise<DiagnosisReport> {
  let domain = args.domain;
  let caseIds: string[] | null = null;
  let installed = args.installedSkills ?? [];

  if (args.diagnosisId) {
    const exam = await loadExam(args.diagnosisId);
    if (exam) {
      domain = exam.domain;
      caseIds = exam.case_ids;
      if (!args.installedSkills?.length) installed = exam.installed_skills;
    }
  }
  // Stateless submit: infer the exam from the answered case ids.
  if (!caseIds) {
    caseIds = args.answers.map((a) => a.case_id).filter((id) => !!findCase(id));
    domain = domain ?? (findCase(caseIds[0] ?? "")?.domain as DomainId | undefined);
  }
  if (!domain) throw new Error("unknown_domain");

  const report = buildReport({
    diagnosis_id: args.diagnosisId ?? null,
    domain,
    case_ids: caseIds,
    answers: args.answers,
    installed_skills: installed,
  });

  if (args.diagnosisId) {
    try {
      await supabaseAdmin
        .from("agent_diagnoses")
        .update({
          status: "scored",
          overall_score: report.overall_score,
          error_profile: report.error_profile,
          prescription: report.prescription,
          bottleneck: report.bottleneck,
        })
        .eq("id", args.diagnosisId);

      await supabaseAdmin.from("agent_diagnosis_items").insert(
        report.results.map((r) => ({
          diagnosis_id: args.diagnosisId,
          case_id: r.case_id,
          error_class: r.error_class,
          answer: (args.answers.find((a) => a.case_id === r.case_id)?.answer ?? "").slice(0, 8000),
          passed: r.passed,
          reason: r.reason,
          latency_ms: r.latency_ms ?? null,
          tokens: r.tokens ?? null,
        })),
      );
    } catch {
      // Report is already computed; persistence failure must not break the run.
    }
  }

  return report;
}

export type DiagnosisRow = {
  id: string;
  domain: string;
  status: string;
  overall_score: number | null;
  bottleneck: string | null;
  error_profile: any[];
  prescription: any[];
  installed_skills: string[];
  created_at: string;
};

export async function listDiagnoses(userId: string, limit = 20): Promise<DiagnosisRow[]> {
  const { data } = await supabaseAdmin
    .from("agent_diagnoses")
    .select("id,domain,status,overall_score,bottleneck,error_profile,prescription,installed_skills,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as DiagnosisRow[];
}

export async function getDiagnosisForCurriculum(
  diagnosisId: string,
): Promise<{ domain: DomainId; error_profile: any[]; installed_skills: string[] } | null> {
  const { data } = await supabaseAdmin
    .from("agent_diagnoses")
    .select("domain,error_profile,installed_skills")
    .eq("id", diagnosisId)
    .maybeSingle();
  if (!data) return null;
  return {
    domain: data.domain as DomainId,
    error_profile: Array.isArray(data.error_profile) ? data.error_profile : [],
    installed_skills: (data.installed_skills ?? []) as string[],
  };
}
