/**
 * SAK University — Phase 2 types.
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
  ambiguity_abandon: "Unresolved ambiguity",
  hallucination: "Factual hallucination",
  format_break: "Format break / output contract violation",
  task_abandon: "Mid-task abandonment",
  policy_violation: "Policy violation",
  tool_misuse: "Tool misuse",
  instruction_drift: "Instruction drift",
};

export const ERROR_CLASS_HINT: Record<ErrorClass, string> = {
  ambiguity_abandon:
    "The agent picks a path instead of asking the question that would unblock the task.",
  hallucination:
    "The agent produces numbers, sources, or facts that are not in the input and does not flag the uncertainty.",
  format_break:
    "The output does not respect the requested contract (sections, fields, JSON, limits).",
  task_abandon:
    "The agent delivers partially: missing steps, items promised but not delivered.",
  policy_violation:
    "The agent complies with a request that should be refused or escalated to a human.",
  tool_misuse:
    "The agent acts directly where it should declare the tool, ask for permission, or simulate first.",
  instruction_drift:
    "The agent forgets a previously given constraint and reverts to default behavior.",
};

export type DomainId =
  // Phase 1 — foundation domains
  | "gtm"
  | "engineering"
  | "support"
  | "finance"
  | "data"
  // Phase 2 — corporate expertise domains
  | "marketing"
  | "b2b_sales"
  | "customer_success"
  | "pricing"
  | "strategy"
  | "project_management"
  | "people_ops"
  | "legal_compliance"
  | "corporate_finance"
  | "agentic_crm"
  | "supply_chain"
  | "data_engineering"
  | "social_media"
  | "google_ads"
  | "meta_ads"
  | "linkedin_ads"
  | "digital_product"
  | "complex_software"
  | "tools_mcp"
  | "cybersecurity";

export type DomainCategory =
  | "Foundation"
  | "Revenue"
  | "Execution"
  | "Operations"
  | "Media & Product";

export type DomainMeta = {
  id: DomainId;
  name: string;
  blurb: string;
  category: DomainCategory;
};

export const DOMAINS: DomainMeta[] = [
  // Foundation
  { id: "gtm", name: "Sales & GTM", blurb: "Discovery, pipeline, proposals, renewal.", category: "Foundation" },
  { id: "engineering", name: "Engineering & Code Review", blurb: "Review, incidents, migrations.", category: "Foundation" },
  { id: "support", name: "Support & Success", blurb: "Support, escalation, post-sale.", category: "Foundation" },
  { id: "finance", name: "Finance & Compliance", blurb: "Numbers, policies, regulatory risk.", category: "Foundation" },
  { id: "data", name: "Data & Analytics", blurb: "SQL, metrics, results interpretation.", category: "Foundation" },
  // Revenue
  { id: "marketing", name: "Marketing & Growth", blurb: "Funnels, segmentation, copy, growth metrics.", category: "Revenue" },
  { id: "b2b_sales", name: "B2B Sales", blurb: "Discovery, qualification, proposals, negotiation.", category: "Revenue" },
  { id: "customer_success", name: "Customer Success & Retention", blurb: "Onboarding, health score, churn, expansion.", category: "Revenue" },
  { id: "pricing", name: "Pricing & Monetization", blurb: "Pricing models, elasticity, packaging.", category: "Revenue" },
  // Execution
  { id: "strategy", name: "Strategy & Planning", blurb: "OKRs, prioritization, competitive analysis.", category: "Execution" },
  { id: "project_management", name: "Project Management & Agile", blurb: "Sprints, dependencies, risk, status reports.", category: "Execution" },
  { id: "people_ops", name: "People Ops & HR", blurb: "Recruiting, 1:1s, feedback, policies.", category: "Execution" },
  { id: "legal_compliance", name: "Legal & Compliance", blurb: "Contracts, LGPD/GDPR, clause analysis.", category: "Execution" },
  // Operations
  { id: "corporate_finance", name: "Corporate Finance", blurb: "FP&A, P&L, cash flow, forecast.", category: "Operations" },
  { id: "agentic_crm", name: "Agentic CRM", blurb: "CRM automation, follow-ups, lead scoring.", category: "Operations" },
  { id: "supply_chain", name: "Supply Chain & Ops", blurb: "Inventory, purchasing, logistics, SLAs.", category: "Operations" },
  { id: "data_engineering", name: "Data Engineering & ML Ops", blurb: "Pipelines, data quality, observability.", category: "Operations" },
  // Media & Product
  { id: "social_media", name: "Social Media & Community", blurb: "Calendar, crisis response, engagement.", category: "Media & Product" },
  { id: "google_ads", name: "Google Ads", blurb: "Campaigns, keywords, budget, Quality Score.", category: "Media & Product" },
  { id: "meta_ads", name: "Meta Ads", blurb: "Campaign structure, audiences, creatives.", category: "Media & Product" },
  { id: "linkedin_ads", name: "LinkedIn Ads", blurb: "ABM, lead gen, Sales Navigator, B2B targeting.", category: "Media & Product" },
  { id: "digital_product", name: "Digital Product Development", blurb: "Discovery, PRD, roadmap, feature prioritization.", category: "Media & Product" },
  { id: "complex_software", name: "Complex Software Development", blurb: "Architecture, scalability, resilience, security.", category: "Media & Product" },
  { id: "tools_mcp", name: "Tools & MCPs Mastery", blurb: "Tool selection, orchestration, auth, and rate limits.", category: "Media & Product" },
  { id: "cybersecurity", name: "Cybersecurity & AppSec", blurb: "Threat modeling, incident response, hardening.", category: "Media & Product" },
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
