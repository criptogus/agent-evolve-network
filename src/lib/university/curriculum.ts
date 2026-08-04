/**
 * Adaptive curriculum — the graph and the marginal-gain resolver.
 *
 * A marketplace answers "what exists?". A curriculum answers "what should THIS
 * agent install next, given what it already carries?". Two things a catalog
 * cannot do and this does:
 *  - prerequisites and conflicts (two skills fighting for the same instruction
 *    space make the agent worse, not better);
 *  - a context budget — past a certain payload, the next best move is to REMOVE
 *    a capability, not add one (context rot).
 *
 * Pure and dependency-free so it is unit-testable.
 */
import type { DomainId, ErrorClass, ErrorProfileEntry, Prescription } from "./types.ts";

export const CURRICULUM_VERSION = "1.0.0";
/** Above this many installed capabilities, adding is usually negative-sum. */
export const DEFAULT_CONTEXT_BUDGET = 12;

export type CapabilityNode = {
  slug: string;
  title: string;
  summary: string;
  /** Error classes this capability measurably reduces. */
  provides: ErrorClass[];
  /** Must already be installed before this one pays off. */
  requires: string[];
  /** Competes for the same instruction space. */
  conflicts_with: string[];
  /** Rough context weight (1 = small, 3 = heavy). */
  context_cost: number;
  domains: DomainId[] | "any";
  /** True when the slug exists in the public registry (installable today). */
  in_registry: boolean;
};

export const CURRICULUM: CapabilityNode[] = [
  {
    slug: "clarify-before-acting",
    title: "Clarify before acting",
    summary: "Contrato de entrada: identifica o campo faltante e faz UMA pergunta que desbloqueia, em vez de assumir.",
    provides: ["ambiguity_abandon"],
    requires: [],
    conflicts_with: ["autonomous-no-questions"],
    context_cost: 1,
    domains: "any",
    in_registry: false,
  },
  {
    slug: "gtm-discovery-call-coach",
    title: "Discovery call coach",
    summary: "Perguntas de qualificação e mapeamento de decisor — resolve ambiguidade em contexto comercial.",
    provides: ["ambiguity_abandon"],
    requires: ["clarify-before-acting"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["gtm"],
    in_registry: true,
  },
  {
    slug: "grounded-answers",
    title: "Grounded answers",
    summary: "Só afirma o que está no input; o desconhecido vira lacuna declarada, com o dado exato que falta.",
    provides: ["hallucination"],
    requires: [],
    conflicts_with: [],
    context_cost: 1,
    domains: "any",
    in_registry: false,
  },
  {
    slug: "web-research",
    title: "Web research",
    summary: "Busca e cita fonte antes de afirmar — reduz alucinação quando a resposta depende de fato externo.",
    provides: ["hallucination"],
    requires: ["grounded-answers"],
    conflicts_with: [],
    context_cost: 2,
    domains: "any",
    in_registry: true,
  },
  {
    slug: "output-contract",
    title: "Output contract",
    summary: "Formato como contrato: JSON/seções/limites validados antes de responder, com auto-correção.",
    provides: ["format_break"],
    requires: [],
    conflicts_with: ["freeform-prose"],
    context_cost: 1,
    domains: "any",
    in_registry: false,
  },
  {
    slug: "sql-translator",
    title: "SQL translator",
    summary: "Traduz pedido de negócio em SQL com premissas explícitas e contrato de saída estável.",
    provides: ["format_break", "hallucination"],
    requires: ["output-contract"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["data"],
    in_registry: true,
  },
  {
    slug: "finish-the-task",
    title: "Finish the task",
    summary: "Checklist de conclusão: conta os itens prometidos e não entrega parcial sem dizer o que falta.",
    provides: ["task_abandon"],
    requires: [],
    conflicts_with: [],
    context_cost: 1,
    domains: "any",
    in_registry: false,
  },
  {
    slug: "gtm-mutual-action-plan-author",
    title: "Mutual action plan author",
    summary: "Plano com marcos, donos e datas — fecha o buraco de entrega parcial em ciclos longos.",
    provides: ["task_abandon"],
    requires: ["finish-the-task"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["gtm"],
    in_registry: true,
  },
  {
    slug: "incident-response-triage",
    title: "Incident response triage",
    summary: "Procedimento de incidente com critério de aborto por passo — evita abandono no meio da resposta.",
    provides: ["task_abandon", "tool_misuse"],
    requires: ["finish-the-task"],
    conflicts_with: [],
    context_cost: 3,
    domains: ["engineering"],
    in_registry: true,
  },
  {
    slug: "no-pii-in-output",
    title: "No PII in output",
    summary: "Guardrail: bloqueia PII, segredo e dado de cartão na saída, com alternativa segura.",
    provides: ["policy_violation"],
    requires: [],
    conflicts_with: [],
    context_cost: 1,
    domains: "any",
    in_registry: true,
  },
  {
    slug: "fintech-compliance",
    title: "Fintech compliance soul",
    summary: "Recusa e encaminha pedidos de recomendação de investimento e leitura de contrato sem base.",
    provides: ["policy_violation"],
    requires: ["no-pii-in-output"],
    conflicts_with: ["healthcare-hipaa"],
    context_cost: 3,
    domains: ["finance"],
    in_registry: true,
  },
  {
    slug: "destructive-action-gate",
    title: "Destructive action gate",
    summary: "Toda ação irreversível passa por simulação/confirmação explícita antes de executar.",
    provides: ["tool_misuse"],
    requires: [],
    conflicts_with: [],
    context_cost: 1,
    domains: "any",
    in_registry: false,
  },
  {
    slug: "code-reviewer",
    title: "Code reviewer",
    summary: "Revisão com severidade, achados e patch — e nenhuma ação destrutiva sem gate.",
    provides: ["tool_misuse", "format_break"],
    requires: ["destructive-action-gate"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["engineering"],
    in_registry: true,
  },
  {
    slug: "constraint-memory",
    title: "Constraint memory",
    summary: "Repete e verifica as restrições da conversa antes de cada resposta — mata a deriva de instrução.",
    provides: ["instruction_drift"],
    requires: [],
    conflicts_with: [],
    context_cost: 1,
    domains: "any",
    in_registry: false,
  },
  {
    slug: "prompt-injection-tester",
    title: "Prompt injection tester",
    summary: "Detecta tentativa de sobrescrever instrução — a variante adversarial da deriva.",
    provides: ["instruction_drift", "policy_violation"],
    requires: ["constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: "any",
    in_registry: true,
  },
];

export function findCapability(slug: string): CapabilityNode | undefined {
  return CURRICULUM.find((n) => n.slug === slug);
}

/** Error classes already covered by the installed set. */
export function coveredClasses(installed: string[]): Set<ErrorClass> {
  const set = new Set<ErrorClass>();
  for (const slug of installed) {
    for (const ec of findCapability(slug)?.provides ?? []) set.add(ec);
  }
  return set;
}

export type Candidate = {
  slug: string;
  title: string;
  summary: string;
  fixes: ErrorClass[];
  marginal_gain: number;
  context_cost: number;
  in_registry: boolean;
  status: "now" | "later" | "blocked" | "conflict";
  why: string;
  missing_prerequisites: string[];
  conflicts_with: string[];
};

export type CurriculumPlan = {
  version: string;
  installed_count: number;
  context_budget: number;
  over_budget: boolean;
  next: Candidate | null;
  track: Candidate[];
  remove_suggestions: Array<{ slug: string; why: string }>;
  note: string;
};

type Weight = { error_class: ErrorClass; fail_rate: number };

function weightsFromProfile(profile: ErrorProfileEntry[] | undefined, failing: ErrorClass[]): Weight[] {
  if (profile?.length) {
    return profile
      .filter((p) => p.failed > 0)
      .map((p) => ({ error_class: p.error_class, fail_rate: p.fail_rate }));
  }
  return failing.map((ec) => ({ error_class: ec, fail_rate: 100 }));
}

/**
 * Rank the graph by marginal gain for one agent.
 * gain = Σ fail_rate(class) × novelty(class) ÷ context_cost, penalised by conflicts.
 */
export function planCurriculum(args: {
  failing: ErrorClass[];
  profile?: ErrorProfileEntry[];
  installed?: string[];
  domain?: DomainId;
  budget?: number;
}): CurriculumPlan {
  const installed = args.installed ?? [];
  const installedSet = new Set(installed);
  const budget = args.budget ?? DEFAULT_CONTEXT_BUDGET;
  const covered = coveredClasses(installed);
  const weights = weightsFromProfile(args.profile, args.failing);
  const weightOf = new Map(weights.map((w) => [w.error_class, w.fail_rate]));

  const candidates: Candidate[] = [];

  for (const node of CURRICULUM) {
    if (installedSet.has(node.slug)) continue;
    if (args.domain && node.domains !== "any" && !node.domains.includes(args.domain)) continue;

    const fixes = node.provides.filter((ec) => weightOf.has(ec));
    if (!fixes.length) continue;

    let raw = 0;
    for (const ec of fixes) {
      const w = weightOf.get(ec) ?? 0;
      // Already covered by an installed capability → strongly diminished return.
      raw += covered.has(ec) ? w * 0.2 : w;
    }
    const conflicts = node.conflicts_with.filter((s) => installedSet.has(s));
    const missing = node.requires.filter((s) => !installedSet.has(s));
    let gain = raw / Math.max(1, node.context_cost);
    if (conflicts.length) gain *= 0.3;
    if (missing.length) gain *= 0.5;

    const status: Candidate["status"] = conflicts.length
      ? "conflict"
      : missing.length
        ? "blocked"
        : "now";

    const why = conflicts.length
      ? `Conflita com ${conflicts.join(", ")} — instale só se substituir a capacidade atual.`
      : missing.length
        ? `Depende de ${missing.join(", ")} — instale o pré-requisito primeiro.`
        : `Ataca ${fixes.map((f) => f).join(", ")} onde o exame falhou, com custo de contexto ${node.context_cost}.`;

    candidates.push({
      slug: node.slug,
      title: node.title,
      summary: node.summary,
      fixes,
      marginal_gain: Math.round(gain),
      context_cost: node.context_cost,
      in_registry: node.in_registry,
      status,
      why,
      missing_prerequisites: missing,
      conflicts_with: conflicts,
    });
  }

  candidates.sort((a, b) => {
    const order = { now: 0, blocked: 1, conflict: 2, later: 3 } as const;
    return order[a.status] - order[b.status] || b.marginal_gain - a.marginal_gain;
  });

  const overBudget = installed.length >= budget;
  const removeSuggestions = overBudget
    ? installed
        .map((slug) => findCapability(slug))
        .filter((n): n is CapabilityNode => !!n)
        .filter((n) => !n.provides.some((ec) => weightOf.has(ec)))
        .slice(0, 3)
        .map((n) => ({
          slug: n.slug,
          why: `Não cobre nenhuma classe de erro que este agente falhou e custa ${n.context_cost} de contexto.`,
        }))
    : [];

  return {
    version: CURRICULUM_VERSION,
    installed_count: installed.length,
    context_budget: budget,
    over_budget: overBudget,
    next: overBudget ? null : (candidates.find((c) => c.status === "now") ?? candidates[0] ?? null),
    track: candidates.slice(0, 8),
    remove_suggestions: removeSuggestions,
    note: overBudget
      ? `Este agente já carrega ${installed.length} capacidades (teto ${budget}). Acima do teto, adicionar piora o desempenho: remova ou troque antes de instalar.`
      : "Ordenado por ganho marginal: cobertura da classe de erro que mais dói, descontando o que já está instalado e penalizando conflito e custo de contexto.",
  };
}

/** The 1-3 item prescription embedded in the diagnosis report. */
export function prescribeFor(
  failing: ErrorClass[],
  installed: string[],
  profile?: ErrorProfileEntry[],
): Prescription[] {
  const plan = planCurriculum({ failing, profile, installed });
  return plan.track
    .filter((c) => c.status === "now" || c.status === "blocked")
    .slice(0, 3)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      fixes: c.fixes,
      why: c.why,
      // Expected gain: the failing share of the classes it covers, capped.
      expected_gain_pp: Math.min(
        40,
        Math.round(
          c.fixes.reduce(
            (sum, ec) => sum + (profile?.find((p) => p.error_class === ec)?.fail_rate ?? 0) / Math.max(1, c.fixes.length),
            0,
          ) * 0.6,
        ),
      ),
    }));
}
