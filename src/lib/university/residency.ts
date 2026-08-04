/**
 * SAK University — Pillar 3: Residency (treino com feedback).
 *
 * O exame de admissão diagnostica. A residência TREINA: rodadas curtas de
 * casos focados nas classes de erro que o agente falhou, com feedback por
 * caso (o que falhou, por quê e qual capacidade corrige) e uma barra de
 * aprovação por rodada. Quem passa em todas as rodadas se forma e recebe a
 * credencial portável (Pilar 4).
 *
 * Tudo aqui é determinístico: nenhuma chamada de LLM, mesmo input = mesmo
 * resultado. Isso é o que torna a credencial auditável.
 */
import { casesForDomain, findCase } from "./cases";
import { prescribeFor } from "./curriculum";
import { scoreCase } from "./diagnose";
import {
  ERROR_CLASSES,
  ERROR_CLASS_HINT,
  ERROR_CLASS_LABEL,
  type CaseAnswer,
  type DiagnosticCase,
  type DomainId,
  type ErrorClass,
} from "./types.ts";

export const RESIDENCY_VERSION = "1.0.0";
/** Casos por rodada. Curto o suficiente para o agente rodar em um turno. */
export const ROUND_SIZE = 4;
/** Rodadas para se formar. */
export const TOTAL_ROUNDS = 3;
/** % de acerto mínimo por rodada. */
export const PASS_THRESHOLD = 75;

export type ResidencyTask = {
  case_id: string;
  prompt: string;
  output_contract?: string;
  drills: ErrorClass;
};

export type RoundPlan = {
  round: number;
  total_rounds: number;
  focus: ErrorClass[];
  pass_threshold: number;
  tasks: ResidencyTask[];
};

export type RoundCaseFeedback = {
  case_id: string;
  error_class: ErrorClass;
  label: string;
  passed: boolean;
  reason: string;
  /** O que mudar na próxima tentativa. Prescritivo, nunca genérico. */
  coach: string;
};

export type RoundResult = {
  round: number;
  total_rounds: number;
  score: number;
  passed: boolean;
  pass_threshold: number;
  feedback: RoundCaseFeedback[];
  /** Classes que continuam falhando depois desta rodada. */
  still_failing: ErrorClass[];
  next_step: string;
};

function normalizeFocus(focus: ErrorClass[] | undefined): ErrorClass[] {
  const seen = new Set<ErrorClass>();
  for (const f of focus ?? []) if (ERROR_CLASSES.includes(f)) seen.add(f);
  return [...seen];
}

/**
 * Seleciona os casos de uma rodada. Prioriza as classes em foco, roda o
 * ponteiro conforme a rodada (para não repetir o mesmo caso na sequência) e
 * completa com casos de outras classes do domínio quando o pool é curto.
 * Repetição é aceitável em treino — o objetivo é o comportamento, não a
 * memorização de um caso específico.
 */
export function planRound(args: {
  domain: DomainId;
  focus?: ErrorClass[];
  round?: number;
  size?: number;
  total_rounds?: number;
}): RoundPlan {
  const round = Math.max(1, Math.min(args.total_rounds ?? TOTAL_ROUNDS, args.round ?? 1));
  const size = Math.max(1, Math.min(12, args.size ?? ROUND_SIZE));
  const totalRounds = Math.max(1, Math.min(10, args.total_rounds ?? TOTAL_ROUNDS));
  const focus = normalizeFocus(args.focus);

  const pool = casesForDomain(args.domain);
  const focused = focus.length ? pool.filter((c) => focus.includes(c.error_class)) : pool;
  const rest = pool.filter((c) => !focused.includes(c));
  const ordered: DiagnosticCase[] = [...focused, ...rest];
  if (!ordered.length) {
    return { round, total_rounds: totalRounds, focus, pass_threshold: PASS_THRESHOLD, tasks: [] };
  }

  const offset = ((round - 1) * size) % ordered.length;
  const tasks: ResidencyTask[] = [];
  for (let i = 0; i < size; i += 1) {
    const kase = ordered[(offset + i) % ordered.length]!;
    tasks.push({
      case_id: kase.id,
      prompt: kase.prompt,
      output_contract: kase.output_contract,
      drills: kase.error_class,
    });
  }

  return { round, total_rounds: totalRounds, focus, pass_threshold: PASS_THRESHOLD, tasks };
}

/** Frase prescritiva por classe de erro, com a capacidade que corrige. */
function coachFor(ec: ErrorClass, installed: string[]): string {
  const [rx] = prescribeFor([ec], installed);
  const hint = ERROR_CLASS_HINT[ec];
  return rx
    ? `${hint} Na próxima tentativa aplique \`${rx.slug}\` (${rx.title}): ${rx.why}`
    : `${hint} Repita o caso aplicando explicitamente o comportamento esperado antes de produzir a saída final.`;
}

export function gradeRound(args: {
  domain: DomainId;
  round: number;
  total_rounds?: number;
  case_ids: string[];
  answers: CaseAnswer[];
  installed_skills?: string[];
  pass_threshold?: number;
}): RoundResult {
  const totalRounds = Math.max(1, args.total_rounds ?? TOTAL_ROUNDS);
  const threshold = Math.max(1, Math.min(100, args.pass_threshold ?? PASS_THRESHOLD));
  const installed = args.installed_skills ?? [];
  const byId = new Map(args.answers.map((a) => [a.case_id, a]));

  const feedback: RoundCaseFeedback[] = [];
  for (const id of args.case_ids) {
    const kase = findCase(id);
    if (!kase) continue;
    const answer = byId.get(id)?.answer ?? "";
    const graded = answer.trim()
      ? scoreCase(kase, answer)
      : { passed: false, reason: "Caso não respondido." };
    feedback.push({
      case_id: id,
      error_class: kase.error_class,
      label: ERROR_CLASS_LABEL[kase.error_class],
      passed: graded.passed,
      reason: graded.reason,
      coach: graded.passed
        ? "Comportamento correto — mantenha esta rotina no soul do agente."
        : coachFor(kase.error_class, installed),
    });
  }

  const passedCount = feedback.filter((f) => f.passed).length;
  const score = feedback.length ? Math.round((passedCount / feedback.length) * 100) : 0;
  const passed = feedback.length > 0 && score >= threshold;
  const stillFailing = [...new Set(feedback.filter((f) => !f.passed).map((f) => f.error_class))];

  const isLast = args.round >= totalRounds;
  const next_step = !passed
    ? `Rodada ${args.round} reprovada (${score}% < ${threshold}%). Aplique o coach de cada caso e repita a MESMA rodada: residency_next { residency_id }.`
    : isLast
      ? "Residência concluída. Emita a credencial portável com credential_issue { residency_id }."
      : `Rodada ${args.round} aprovada. Siga para a rodada ${args.round + 1}: residency_next { residency_id }.`;

  return {
    round: args.round,
    total_rounds: totalRounds,
    score,
    passed,
    pass_threshold: threshold,
    feedback,
    still_failing: stillFailing,
    next_step,
  };
}

/** Score final da residência: média das rodadas aprovadas. */
export function residencyScore(roundScores: number[]): number {
  if (!roundScores.length) return 0;
  return Math.round(roundScores.reduce((a, b) => a + b, 0) / roundScores.length);
}
