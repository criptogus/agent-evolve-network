/**
 * Residência + credenciais portáveis — persistência. Server-only.
 *
 * Todas as escritas passam pelo admin client (a residência pode rodar
 * anônima, identificada apenas pelo residency_id) e as leituras são sempre
 * escopadas por id ou por user_id.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  PASS_THRESHOLD,
  RESIDENCY_VERSION,
  ROUND_SIZE,
  TOTAL_ROUNDS,
  gradeRound,
  planRound,
  residencyScore,
  type RoundPlan,
  type RoundResult,
} from "./residency";
import type { CaseAnswer, DomainId, ErrorClass } from "./types.ts";

const supabaseAdmin = _supabaseAdmin as any;

export type ResidencyRow = {
  id: string;
  user_id: string | null;
  domain: DomainId;
  focus: ErrorClass[];
  round: number;
  total_rounds: number;
  pass_threshold: number;
  status: "open" | "graduated";
  round_scores: number[];
  current_case_ids: string[];
  installed_skills: string[];
  created_at?: string;
};

function rowToResidency(data: any): ResidencyRow {
  return {
    id: data.id,
    user_id: data.user_id ?? null,
    domain: data.domain as DomainId,
    focus: Array.isArray(data.focus) ? data.focus : [],
    round: data.round ?? 1,
    total_rounds: data.total_rounds ?? TOTAL_ROUNDS,
    pass_threshold: data.pass_threshold ?? PASS_THRESHOLD,
    status: (data.status ?? "open") as "open" | "graduated",
    round_scores: Array.isArray(data.round_scores) ? data.round_scores : [],
    current_case_ids: Array.isArray(data.current_case_ids) ? data.current_case_ids : [],
    installed_skills: Array.isArray(data.installed_skills) ? data.installed_skills : [],
    created_at: data.created_at,
  };
}

export type StartedResidency = RoundPlan & {
  residency_id: string | null;
  domain: DomainId;
  version: string;
  how_to_submit: string;
};

/** Cria a residência e devolve a rodada 1. */
export async function startResidency(args: {
  domain: DomainId;
  focus?: ErrorClass[];
  userId?: string | null;
  agentFp?: string | null;
  installedSkills?: string[];
  roundSize?: number;
  totalRounds?: number;
}): Promise<StartedResidency> {
  const plan = planRound({
    domain: args.domain,
    focus: args.focus,
    round: 1,
    size: args.roundSize ?? ROUND_SIZE,
    total_rounds: args.totalRounds ?? TOTAL_ROUNDS,
  });

  let residencyId: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("agent_residencies")
      .insert({
        user_id: args.userId ?? null,
        domain: args.domain,
        focus: plan.focus,
        round: 1,
        total_rounds: plan.total_rounds,
        pass_threshold: plan.pass_threshold,
        status: "open",
        round_scores: [],
        current_case_ids: plan.tasks.map((t) => t.case_id),
        installed_skills: args.installedSkills ?? [],
        agent_fp: args.agentFp ?? null,
      })
      .select("id")
      .single();
    residencyId = data?.id ?? null;
  } catch {
    residencyId = null;
  }

  return {
    ...plan,
    residency_id: residencyId,
    domain: args.domain,
    version: RESIDENCY_VERSION,
    how_to_submit:
      "Execute cada tarefa no seu host e devolva em residency_submit { residency_id, answers: [{ case_id, answer }] }. O feedback vem por caso, com a capacidade que corrige.",
  };
}

export async function loadResidency(id: string): Promise<ResidencyRow | null> {
  const { data } = await supabaseAdmin
    .from("agent_residencies")
    .select(
      "id,user_id,domain,focus,round,total_rounds,pass_threshold,status,round_scores,current_case_ids,installed_skills,created_at",
    )
    .eq("id", id)
    .maybeSingle();
  return data ? rowToResidency(data) : null;
}

export type SubmitRoundOutcome = RoundResult & {
  residency_id: string;
  domain: DomainId;
  graduated: boolean;
  residency_score: number;
  next_round: RoundPlan | null;
};

/** Corrige a rodada atual, avança (ou repete) e grava o progresso. */
export async function submitResidencyRound(args: {
  residencyId: string;
  answers: CaseAnswer[];
}): Promise<SubmitRoundOutcome> {
  const res = await loadResidency(args.residencyId);
  if (!res) throw new Error("residency_not_found");

  const result = gradeRound({
    domain: res.domain,
    round: res.round,
    total_rounds: res.total_rounds,
    case_ids: res.current_case_ids,
    answers: args.answers,
    installed_skills: res.installed_skills,
    pass_threshold: res.pass_threshold,
  });

  const scores = result.passed ? [...res.round_scores, result.score] : res.round_scores;
  const graduated = result.passed && res.round >= res.total_rounds;
  const nextRound = result.passed && !graduated ? res.round + 1 : res.round;

  const nextPlan =
    graduated
      ? null
      : planRound({
          domain: res.domain,
          focus: result.passed ? res.focus : result.still_failing.length ? result.still_failing : res.focus,
          round: nextRound,
          size: res.current_case_ids.length || ROUND_SIZE,
          total_rounds: res.total_rounds,
        });

  try {
    await supabaseAdmin
      .from("agent_residency_rounds")
      .insert({
        residency_id: res.id,
        round: res.round,
        score: result.score,
        passed: result.passed,
        feedback: result.feedback,
      });
    await supabaseAdmin
      .from("agent_residencies")
      .update({
        round: nextRound,
        round_scores: scores,
        status: graduated ? "graduated" : "open",
        current_case_ids: nextPlan ? nextPlan.tasks.map((t) => t.case_id) : res.current_case_ids,
        focus: nextPlan ? nextPlan.focus : res.focus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", res.id);
  } catch {
    // Correção já está calculada; falha de persistência não invalida o retorno.
  }

  return {
    ...result,
    residency_id: res.id,
    domain: res.domain,
    graduated,
    residency_score: residencyScore(scores),
    next_round: nextPlan,
  };
}

export async function listResidencies(userId: string, limit = 20): Promise<ResidencyRow[]> {
  const { data } = await supabaseAdmin
    .from("agent_residencies")
    .select(
      "id,user_id,domain,focus,round,total_rounds,pass_threshold,status,round_scores,current_case_ids,installed_skills,created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as any[]).map(rowToResidency);
}

/* ------------------------------------------------------------------ *
 * Pilar 4 — credencial portável
 * ------------------------------------------------------------------ */

export const CREDENTIAL_VALID_DAYS = 180;

function signingSecret(): string {
  return (
    process.env["CREDENTIAL_SIGNING_SECRET"] ??
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    "sak-credential-dev-secret"
  );
}

function credentialCode(): string {
  // Legível em terminal e colável em README: SAK-XXXXXX-XXXXXX
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = randomBytes(12);
  const chars = [...raw].map((b) => alphabet[b % alphabet.length]).join("");
  return `SAK-${chars.slice(0, 6)}-${chars.slice(6, 12)}`;
}

export type CredentialPayload = {
  code: string;
  domain: DomainId;
  score: number;
  rounds: number;
  focus: ErrorClass[];
  issued_at: string;
  expires_at: string;
};

export function signCredential(p: CredentialPayload): string {
  const canonical = [p.code, p.domain, p.score, p.rounds, p.focus.join("+"), p.issued_at, p.expires_at].join("|");
  return createHmac("sha256", signingSecret()).update(canonical).digest("hex").slice(0, 40);
}

function signatureMatches(p: CredentialPayload, signature: string): boolean {
  const expected = signCredential(p);
  if (expected.length !== (signature ?? "").length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export type IssuedCredential = CredentialPayload & {
  id: string | null;
  signature: string;
  verify_url: string;
  badge_markdown: string;
};

/** Emite a credencial de uma residência formada. Idempotente por residência. */
export async function issueCredential(residencyId: string): Promise<IssuedCredential> {
  const res = await loadResidency(residencyId);
  if (!res) throw new Error("residency_not_found");
  if (res.status !== "graduated") throw new Error("residency_not_graduated");

  const existing = await supabaseAdmin
    .from("agent_credentials")
    .select("id,code,domain,score,rounds,focus,issued_at,expires_at,signature")
    .eq("residency_id", residencyId)
    .eq("revoked", false)
    .maybeSingle();
  if (existing?.data) {
    const d = existing.data;
    return decorate({
      id: d.id,
      code: d.code,
      domain: d.domain as DomainId,
      score: d.score,
      rounds: d.rounds,
      focus: Array.isArray(d.focus) ? d.focus : [],
      issued_at: d.issued_at,
      expires_at: d.expires_at,
      signature: d.signature,
    });
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + CREDENTIAL_VALID_DAYS * 24 * 3600 * 1000);
  const payload: CredentialPayload = {
    code: credentialCode(),
    domain: res.domain,
    score: residencyScore(res.round_scores),
    rounds: res.round_scores.length,
    focus: res.focus,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
  const signature = signCredential(payload);

  let id: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("agent_credentials")
      .insert({
        code: payload.code,
        residency_id: res.id,
        user_id: res.user_id,
        domain: payload.domain,
        score: payload.score,
        rounds: payload.rounds,
        focus: payload.focus,
        issued_at: payload.issued_at,
        expires_at: payload.expires_at,
        signature,
        revoked: false,
      })
      .select("id")
      .single();
    id = data?.id ?? null;
  } catch {
    id = null;
  }

  return decorate({ ...payload, id, signature });
}

function decorate(c: CredentialPayload & { id: string | null; signature: string }): IssuedCredential {
  const verify = `https://superagentskill.com/credential/${c.code}`;
  return {
    ...c,
    verify_url: verify,
    badge_markdown: `[![SAK ${c.domain} — ${c.score}/100](https://superagentskill.com/api/public/credential/${c.code}/badge)](${verify})`,
  };
}

export type CredentialVerification = {
  ok: boolean;
  reason: string;
  credential: (CredentialPayload & { verify_url: string; badge_markdown: string; revoked: boolean }) | null;
};

/** Verificação pública: assinatura + validade + revogação. */
export async function verifyCredential(code: string): Promise<CredentialVerification> {
  const clean = (code ?? "").trim().toUpperCase().slice(0, 32);
  const { data } = await supabaseAdmin
    .from("agent_credentials")
    .select("code,domain,score,rounds,focus,issued_at,expires_at,signature,revoked")
    .eq("code", clean)
    .maybeSingle();

  if (!data) return { ok: false, reason: "Credencial não encontrada.", credential: null };

  const payload: CredentialPayload = {
    code: data.code,
    domain: data.domain as DomainId,
    score: data.score,
    rounds: data.rounds,
    focus: Array.isArray(data.focus) ? data.focus : [],
    issued_at: data.issued_at,
    expires_at: data.expires_at,
  };
  const decorated = { ...decorate({ ...payload, id: null, signature: data.signature }), revoked: !!data.revoked };
  const view = {
    code: decorated.code,
    domain: decorated.domain,
    score: decorated.score,
    rounds: decorated.rounds,
    focus: decorated.focus,
    issued_at: decorated.issued_at,
    expires_at: decorated.expires_at,
    verify_url: decorated.verify_url,
    badge_markdown: decorated.badge_markdown,
    revoked: decorated.revoked,
  };

  if (!signatureMatches(payload, data.signature)) {
    return { ok: false, reason: "Assinatura inválida — credencial adulterada.", credential: view };
  }
  if (data.revoked) return { ok: false, reason: "Credencial revogada pelo emissor.", credential: view };
  if (new Date(payload.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "Credencial expirada — refaça a residência para revalidar.", credential: view };
  }
  return { ok: true, reason: "Credencial válida e assinada pelo SAK.", credential: view };
}
