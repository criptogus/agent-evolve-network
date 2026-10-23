/**
 * Project profile: a one-question onboarding answer ("what are you building?")
 * used to rank packages by fit instead of by niche stack keywords.
 *
 * Technical and business profiles share one persisted selection, so a new
 * user never has to know what "Expo EAS pipeline" or "OAuth flow auditor" is.
 */

export const PROJECT_TYPES = [
  {
    value: "web_app",
    label: "Web app",
    description: "Frontend or full-stack product with a UI",
    /** Signals that make a package a good fit for this project type. */
    keywords: [
      "frontend",
      "react",
      "ui",
      "ux",
      "component",
      "accessibility",
      "a11y",
      "css",
      "tailwind",
      "seo",
      "landing",
      "form",
      "design",
      "web",
      "performance",
    ],
  },
  {
    value: "api",
    label: "API / service",
    description: "HTTP APIs, integrations, webhooks",
    keywords: [
      "api",
      "rest",
      "endpoint",
      "webhook",
      "openapi",
      "schema",
      "validation",
      "integration",
      "http",
      "rate limit",
      "contract",
      "sdk",
    ],
  },
  {
    value: "mcp_agent",
    label: "MCP agent",
    description: "Agents, tools and MCP servers",
    keywords: [
      "agent",
      "mcp",
      "tool",
      "prompt",
      "guardrail",
      "eval",
      "context",
      "memory",
      "playbook",
      "soul",
      "llm",
      "autonomy",
    ],
  },
  {
    value: "backend",
    label: "Backend / data",
    description: "Databases, jobs, infrastructure, reliability",
    keywords: [
      "backend",
      "database",
      "sql",
      "postgres",
      "migration",
      "queue",
      "job",
      "cron",
      "cache",
      "observability",
      "logging",
      "incident",
      "security review",
      "data",
      "etl",
      "pipeline",
    ],
  },
  {
    value: "brazil_ops",
    label: "Brazil operations",
    description: "NF-e, Pix and WhatsApp operations",
    keywords: ["operações brasil", "nf-e", "pix", "whatsapp", "reconciliação", "reconciliation"],
  },
  {
    value: "agent_security",
    label: "Agent security",
    description: "MCP, permissions and tool safety",
    keywords: [
      "segurança de agentes",
      "tool poisoning",
      "exfiltration",
      "permission policy",
      "prompt injection",
    ],
  },
  {
    value: "procurement",
    label: "Procurement & suppliers",
    description: "Bids, sourcing, contracts and supplier risk",
    keywords: [
      "compras e fornecedores",
      "supplier",
      "procurement",
      "quotation",
      "sourcing",
      "bid comparison",
    ],
  },
  {
    value: "industrial_ops",
    label: "Industrial operations",
    description: "OEE, maintenance, FMEA and quality",
    keywords: [
      "indústria e manutenção",
      "manufacturing",
      "maintenance",
      "oee",
      "fmea",
      "quality deviation",
    ],
  },
  {
    value: "corporate_knowledge",
    label: "Corporate knowledge",
    description: "Source access, freshness and reliable retrieval",
    keywords: [
      "conhecimento corporativo",
      "knowledge",
      "rag",
      "retrieval",
      "source access",
      "document freshness",
    ],
  },
  {
    value: "game_dev",
    label: "Game development",
    description: "Playable prototypes, assets and playtests",
    keywords: ["desenvolvimento de jogos", "godot", "unity", "game", "playtest", "frame-time"],
  },
  {
    value: "sales_growth",
    label: "Sales & growth",
    description: "Pipeline, campaigns and customer acquisition",
    keywords: ["sales", "marketing", "gtm", "campaign", "pipeline", "outbound"],
  },
  {
    value: "finance_ops",
    label: "Finance operations",
    description: "Cash flow, reconciliation and reporting",
    keywords: ["finance", "cash flow", "invoice", "reconciliation", "financial", "budget variance"],
  },
  {
    value: "people_ops",
    label: "People operations",
    description: "Hiring, onboarding and team development",
    keywords: ["hiring", "people ops", "interview", "employee", "onboarding", "performance review"],
  },
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number]["value"];

export const PROJECT_PROFILE_STORAGE_KEY = "sak.project_type";

export function isProjectType(value: unknown): value is ProjectType {
  return PROJECT_TYPES.some((t) => t.value === value);
}

export function projectTypeLabel(value: ProjectType): string {
  return PROJECT_TYPES.find((t) => t.value === value)?.label ?? value;
}

/**
 * Fit bonus (0..2) for a package given the selected project type. Never
 * negative: a low-fit package is demoted by comparison, not hidden.
 */
export function projectFitScore(
  item: { name: string; description: string; type?: string; vertical?: string | null },
  projectType: ProjectType | null,
): number {
  if (!projectType) return 0;
  const spec = PROJECT_TYPES.find((t) => t.value === projectType);
  if (!spec) return 0;
  const text =
    `${item.name} ${item.description} ${item.vertical ?? ""} ${item.type ?? ""}`.toLowerCase();
  let hits = 0;
  for (const kw of spec.keywords) if (text.includes(kw)) hits++;
  if (hits === 0) return 0;
  // Saturating: two strong signals is already a clear fit.
  return Math.min(2, hits * 1);
}
