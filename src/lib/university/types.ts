/**
 * SAK University — Phase 1 types.
 *
 * The exam grades an agent by ERROR CLASS, not by topic. Knowing "you drop
 * ambiguity at step 3" is prescriptive; knowing "you scored 62 in sales" is
 * not. Every diagnostic case is bound to exactly one error class so the report
 * maps 1:1 onto the curriculum graph (`provides`).
 */

export const ERROR_CLASSES = [
  "ambiguity_abandon",
  "hallucination",
  "format_break",
  "task_abandon",
  "policy_violation",
  "tool_misuse",
  "instruction_drift",
] as const;

export type ErrorClass = (typeof ERROR_CLASSES)[number];

export const ERROR_CLASS_LABEL: Record<ErrorClass, string> = {
  ambiguity_abandon: "Ambiguidade não resolvida",
  hallucination: "Alucinação factual",
  format_break: "Quebra de formato / contrato de saída",
  task_abandon: "Abandono no meio da tarefa",
  policy_violation: "Violação de política",
  tool_misuse: "Uso indevido de ferramenta",
  instruction_drift: "Deriva de instrução",
};

export const ERROR_CLASS_HINT: Record<ErrorClass, string> = {
  ambiguity_abandon:
    "O agente assume um caminho em vez de fazer a pergunta que desbloqueia a tarefa.",
  hallucination:
    "O agente produz números, fontes ou fatos que não estão no input e não marca a incerteza.",
  format_break:
    "A saída não respeita o contrato pedido (seções, campos, JSON, limites).",
  task_abandon:
    "O agente entrega parcialmente: passos faltando, itens prometidos e não entregues.",
  policy_violation:
    "O agente atende um pedido que deveria ser recusado ou encaminhado a um humano.",
  tool_misuse:
    "O agente age direto onde deveria declarar a ferramenta, pedir permissão ou simular antes.",
  instruction_drift:
    "O agente esquece uma restrição dada antes e volta ao comportamento padrão.",
};

export type DomainId = "gtm" | "engineering" | "support" | "finance" | "data";

export type DomainMeta = { id: DomainId; name: string; blurb: string };

export const DOMAINS: DomainMeta[] = [
  { id: "gtm", name: "Vendas & GTM", blurb: "Discovery, pipeline, propostas, renovação." },
  { id: "engineering", name: "Engenharia & Code Review", blurb: "Revisão, incidentes, migrações." },
  { id: "support", name: "Suporte & Sucesso", blurb: "Atendimento, escalonamento, pós-venda." },
  { id: "finance", name: "Financeiro & Compliance", blurb: "Números, políticas, risco regulatório." },
  { id: "data", name: "Dados & Analytics", blurb: "SQL, métricas, leitura de resultado." },
];

/** Deterministic expectations. Everything here is checkable without an LLM. */
export type CaseExpect = {
  /** Every string must appear (case-insensitive, typography-normalized). */
  must_include?: string[];
  /** At least one of each group must appear. */
  must_include_any?: string[][];
  /** None of these may appear. */
  must_not_include?: string[];
  /** Answer must be a refusal / redirect to a human. */
  must_refuse?: boolean;
  /** Answer must ask a clarifying question before acting. */
  must_ask?: boolean;
  /** Answer must parse as JSON (optionally with these top-level keys). */
  must_be_json?: boolean;
  json_keys?: string[];
  /** Length guards — catch stubs and rambling. */
  min_words?: number;
  max_words?: number;
};

export type DiagnosticCase = {
  id: string;
  domain: DomainId;
  error_class: ErrorClass;
  /** What the agent is asked to do. Sent verbatim to the agent. */
  prompt: string;
  /** Output contract shown to the agent (never the expectations). */
  output_contract?: string;
  expect: CaseExpect;
};

/** What the agent posts back per case. */
export type CaseAnswer = {
  case_id: string;
  answer: string;
  latency_ms?: number;
  tokens?: number;
};

export type CaseResult = {
  case_id: string;
  error_class: ErrorClass;
  passed: boolean;
  reason: string;
  latency_ms?: number;
  tokens?: number;
};

export type ErrorProfileEntry = {
  error_class: ErrorClass;
  label: string;
  total: number;
  failed: number;
  fail_rate: number;
};

export type Prescription = {
  slug: string;
  title: string;
  fixes: ErrorClass[];
  why: string;
  expected_gain_pp: number;
};

export type DiagnosisReport = {
  diagnosis_id: string | null;
  domain: DomainId;
  answered: number;
  total: number;
  overall_score: number;
  grade: string;
  bottleneck: string;
  error_profile: ErrorProfileEntry[];
  results: CaseResult[];
  cost: { avg_latency_ms: number | null; avg_tokens: number | null };
  prescription: Prescription[];
  next_step: string;
};
