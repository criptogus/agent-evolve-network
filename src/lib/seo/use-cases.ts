// Curated catalog for /use-case/<vertical>/<task> programmatic SEO.
// Each entry generates an indexable landing page that ranks the top skills
// for a specific buyer intent. Keep entries terse — the page is built from
// the registry data, not from prose here.

export interface UseCase {
  vertical: "security" | "fintech" | "healthcare" | "devops" | "general";
  task: string;                        // URL slug
  title: string;                       // H1
  intent: string;                      // meta description / lede
  required_tags: string[];             // packages must include at least one
  recommended_souls?: string[];        // soul slugs to highlight
  recommended_integrations?: string[]; // integration slugs to highlight
}

export const USE_CASES: UseCase[] = [
  {
    vertical: "security",
    task: "pr-security-review",
    title: "AI-powered PR security review",
    intent: "Catch OWASP issues, secret leakage, and unsafe patterns on every pull request without slowing the team down.",
    required_tags: ["security", "code-review"],
    recommended_souls: ["soc2-auditor"],
    recommended_integrations: ["github"],
  },
  {
    vertical: "security",
    task: "cloud-misconfig-audit",
    title: "Continuous cloud misconfiguration auditing",
    intent: "Run AI-driven audits against your cloud accounts to surface IAM, network, and encryption misconfigurations before attackers find them.",
    required_tags: ["security", "cloud"],
    recommended_integrations: ["datadog"],
  },
  {
    vertical: "fintech",
    task: "compliance-disclosure-review",
    title: "Fintech compliance disclosure review",
    intent: "Validate marketing copy, customer comms, and disclosures against SEC, FINRA, and CFPB rules with cited references.",
    required_tags: ["fintech", "compliance"],
    recommended_souls: ["fintech-compliance"],
  },
  {
    vertical: "fintech",
    task: "pci-pii-redaction",
    title: "PCI / PII redaction for logs and tickets",
    intent: "Automatically redact card numbers, CVVs, and PII before logs reach analytics or support tickets.",
    required_tags: ["fintech", "pii"],
    recommended_souls: ["fintech-compliance"],
  },
  {
    vertical: "healthcare",
    task: "phi-safe-summaries",
    title: "HIPAA-safe clinical summaries",
    intent: "Generate clinical or billing summaries that strip the 18 HIPAA Safe Harbor identifiers automatically.",
    required_tags: ["healthcare", "hipaa"],
    recommended_souls: ["healthcare-hipaa"],
  },
  {
    vertical: "devops",
    task: "incident-response-triage",
    title: "On-call incident response triage",
    intent: "Triage paging alerts with blast-radius analysis, SLO impact, and reversible remediation steps your on-call can execute now.",
    required_tags: ["sre", "incidents"],
    recommended_souls: ["k8s-sre"],
    recommended_integrations: ["datadog", "slack"],
  },
  {
    vertical: "devops",
    task: "release-runbook-author",
    title: "Release runbook authoring",
    intent: "Turn change diffs into runbooks with rollback, monitoring, and customer-comms steps tailored to your environment.",
    required_tags: ["devops", "release"],
    recommended_integrations: ["github", "slack"],
  },
  {
    vertical: "general",
    task: "long-form-writing",
    title: "Long-form writing with citations",
    intent: "Produce long-form drafts that maintain narrative voice across thousands of words with citations to source material.",
    required_tags: ["writing"],
  },
];

export function findUseCase(vertical: string, task: string): UseCase | null {
  return USE_CASES.find((u) => u.vertical === vertical && u.task === task) ?? null;
}
