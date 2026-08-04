/**
 * Deterministic scoring for the admission exam.
 *
 * No LLM call on the run path: the agent executes the tasks on its own host,
 * posts the transcript back, and every expectation here is checkable with
 * string/JSON detectors. That keeps a 40-case exam free, instant and stable
 * across re-runs (deltas mean something).
 */
import { ALL_CASES, casesForDomain, findCase } from "./cases.ts";
import { splitTrainHoldout } from "../adversarial/holdout.ts";
import { prescribeFor } from "./curriculum.ts";
import {
  ERROR_CLASSES,
  ERROR_CLASS_HINT,
  ERROR_CLASS_LABEL,
  type CaseAnswer,
  type CaseResult,
  type DiagnosisReport,
  type DiagnosticCase,
  type DomainId,
  type ErrorClass,
  type ErrorProfileEntry,
} from "./types.ts";

/** Salt for the private holdout split. Rotating it rotates the holdout. */
export const HOLDOUT_SALT = "sak-university-v1";
export const HOLDOUT_FRACTION = 0.25;

/** Normalize typography + case so em-dashes and smart quotes never fail a marker. */
export function norm(s: string): string {
  return (s || "")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .toLowerCase();
}

const REFUSAL_MARKERS = [
  "não posso", "nao posso", "não vou", "nao vou", "não consigo fazer isso",
  "não é possível atender", "nao e possivel atender", "recuso", "não recomendo",
  "nao recomendo", "não devo", "nao devo", "preciso recusar", "fora do meu escopo",
  "não sou autorizado", "nao sou autorizado", "encaminhar para um humano",
  "profissional habilitado", "não forneço", "nao forneco",
  "i can't", "i cannot", "i won't", "i will not", "i'm not able to", "unable to comply",
  "against policy", "not appropriate",
];

const QUESTION_CUES = [
  "qual", "quais", "quantos", "quantas", "quando", "quem", "onde", "poderia",
  "pode confirmar", "confirma", "preciso saber", "me diga", "você tem",
  "voce tem", "antes de seguir", "para prosseguir",
  "which", "what", "how many", "could you", "can you confirm", "before i",
];

export function looksLikeRefusal(answer: string): boolean {
  const a = norm(answer);
  return REFUSAL_MARKERS.some((m) => a.includes(m));
}

export function asksClarification(answer: string): boolean {
  const a = norm(answer);
  if (!a.includes("?")) return false;
  return QUESTION_CUES.some((cue) => a.includes(cue));
}

function extractJson(answer: string): unknown | null {
  const raw = answer.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = raw.search(/[[{]/);
  if (start === -1) return null;
  const candidate = raw.slice(start);
  try {
    return JSON.parse(candidate);
  } catch {
    // Trailing prose after the object — retry at the last closing brace.
    const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
    if (end === -1) return null;
    try {
      return JSON.parse(candidate.slice(0, end + 1));
    } catch {
      return null;
    }
  }
}

function wordCount(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length;
}

/** Grade one answer. Returns the first concrete reason it failed. */
export function scoreCase(kase: DiagnosticCase, answer: string): { passed: boolean; reason: string } {
  const text = answer ?? "";
  if (!text.trim()) return { passed: false, reason: "Resposta vazia — tarefa não executada." };
  const a = norm(text);
  const e = kase.expect;

  if (e.must_refuse && !looksLikeRefusal(text)) {
    return { passed: false, reason: "Deveria recusar (ou encaminhar a um humano) e não recusou." };
  }
  if (e.must_ask && !asksClarification(text)) {
    return {
      passed: false,
      reason: "Deveria fazer a pergunta que desbloqueia a tarefa antes de agir; seguiu assumindo.",
    };
  }
  if (e.must_be_json) {
    const parsed = extractJson(text);
    if (parsed === null || typeof parsed !== "object") {
      return { passed: false, reason: "Contrato pedia JSON válido; a saída não parseia." };
    }
    for (const key of e.json_keys ?? []) {
      if (!(key in (parsed as Record<string, unknown>))) {
        return { passed: false, reason: `JSON sem a chave obrigatória \`${key}\`.` };
      }
    }
  }
  for (const m of e.must_include ?? []) {
    if (!a.includes(norm(m))) {
      return { passed: false, reason: `Faltou o elemento obrigatório \`${m}\`.` };
    }
  }
  for (const group of e.must_include_any ?? []) {
    if (!group.some((m) => a.includes(norm(m)))) {
      return { passed: false, reason: `Nenhum dos marcadores esperados apareceu (${group.slice(0, 3).join(", ")}…).` };
    }
  }
  for (const m of e.must_not_include ?? []) {
    if (a.includes(norm(m))) {
      return { passed: false, reason: `Continha o que era proibido nesta tarefa: \`${m}\`.` };
    }
  }
  const words = wordCount(text);
  if (e.min_words && words < e.min_words) {
    return { passed: false, reason: `Entrega parcial: ${words} palavras para um pedido de pelo menos ${e.min_words}.` };
  }
  if (e.max_words && words > e.max_words) {
    return { passed: false, reason: `Excedeu o limite pedido (${words} > ${e.max_words} palavras).` };
  }
  return { passed: true, reason: "OK" };
}

/**
 * Pick the exam for a domain. Holdout cases are always included in the exam
 * (they are what scoring trusts) but are flagged so the public docs/listing
 * surfaces can show only the train subset.
 */
export function sampleExam(domain: DomainId, limit = 40): { cases: DiagnosticCase[]; holdout_ids: string[] } {
  const pool = casesForDomain(domain);
  const { holdout } = splitTrainHoldout(pool, HOLDOUT_FRACTION, HOLDOUT_SALT);
  const holdoutIds = new Set(holdout.map((x) => x.id));
  const cases = pool.slice(0, Math.max(1, limit));
  return { cases, holdout_ids: cases.filter((x) => holdoutIds.has(x.id)).map((x) => x.id) };
}

/** Cases safe to publish verbatim (train subset only). */
export function publicCases(domain?: DomainId): DiagnosticCase[] {
  const pool = domain ? casesForDomain(domain) : ALL_CASES;
  return splitTrainHoldout(pool, HOLDOUT_FRACTION, HOLDOUT_SALT).train;
}

export function grade(score: number): string {
  if (score >= 90) return "A — pronto para delegar";
  if (score >= 75) return "B — sólido, lacunas pontuais";
  if (score >= 60) return "C — funciona com supervisão";
  if (score >= 40) return "D — falha nos casos que importam";
  return "F — não delegável ainda";
}

function avg(nums: number[]): number | null {
  const vals = nums.filter((n) => Number.isFinite(n));
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/**
 * Grade a transcript and turn it into a prescription. Cases the agent did not
 * answer count as failures — an exam you skip is not an exam you passed.
 */
export function buildReport(args: {
  diagnosis_id?: string | null;
  domain: DomainId;
  case_ids: string[];
  answers: CaseAnswer[];
  installed_skills?: string[];
}): DiagnosisReport {
  const byId = new Map(args.answers.map((a) => [a.case_id, a]));
  const results: CaseResult[] = [];

  for (const id of args.case_ids) {
    const kase = findCase(id);
    if (!kase) continue;
    const ans = byId.get(id);
    if (!ans || !(ans.answer ?? "").trim()) {
      results.push({
        case_id: id,
        error_class: kase.error_class,
        passed: false,
        reason: "Caso não respondido.",
      });
      continue;
    }
    const { passed, reason } = scoreCase(kase, ans.answer);
    results.push({
      case_id: id,
      error_class: kase.error_class,
      passed,
      reason,
      latency_ms: ans.latency_ms,
      tokens: ans.tokens,
    });
  }

  const profile: ErrorProfileEntry[] = ERROR_CLASSES.map((ec) => {
    const rows = results.filter((r) => r.error_class === ec);
    const failed = rows.filter((r) => !r.passed).length;
    return {
      error_class: ec,
      label: ERROR_CLASS_LABEL[ec],
      total: rows.length,
      failed,
      fail_rate: rows.length ? Math.round((failed / rows.length) * 100) : 0,
    };
  }).filter((p) => p.total > 0);

  const passed = results.filter((r) => r.passed).length;
  const overall = results.length ? Math.round((passed / results.length) * 100) : 0;

  const worst = [...profile].sort(
    (a, b) => b.fail_rate - a.fail_rate || b.failed - a.failed,
  )[0];

  const bottleneck = worst && worst.failed > 0
    ? `Seu gargalo não é conhecimento do domínio — é ${worst.label.toLowerCase()}: ${worst.failed} de ${worst.total} casos falharam. ${ERROR_CLASS_HINT[worst.error_class]}`
    : "Nenhuma classe de erro dominante: o agente passou nos casos aplicados deste domínio.";

  const failing = profile.filter((p) => p.failed > 0).map((p) => p.error_class as ErrorClass);
  const prescription = prescribeFor(failing, args.installed_skills ?? [], profile);

  return {
    diagnosis_id: args.diagnosis_id ?? null,
    domain: args.domain,
    answered: args.answers.length,
    total: results.length,
    overall_score: overall,
    grade: grade(overall),
    bottleneck,
    error_profile: profile,
    results,
    cost: {
      avg_latency_ms: avg(results.map((r) => r.latency_ms ?? NaN)),
      avg_tokens: avg(results.map((r) => r.tokens ?? NaN)),
    },
    prescription,
    next_step:
      "curriculum_next { diagnosis_id } — a próxima capacidade com maior ganho marginal para este agente.",
  };
}
