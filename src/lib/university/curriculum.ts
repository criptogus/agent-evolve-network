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

export const CURRICULUM_VERSION = "2.0.0";
/** Above this many installed capabilities, adding is usually negative-sum. */
export const DEFAULT_CONTEXT_BUDGET = 14;

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
  // -------------------------------------------------------------------------
  // Foundation capabilities (Phase 1)
  // -------------------------------------------------------------------------
  {
    slug: "clarify-before-acting",
    title: "Clarify before acting",
    summary: "Input contract: identifies the missing field and asks ONE unblocking question instead of assuming.",
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
    summary: "Qualification questions and decision-maker mapping — resolves ambiguity in a sales context.",
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
    summary: "States only what is in the input; the unknown becomes a declared gap, with the exact missing data point.",
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
    summary: "Searches and cites a source before stating a claim — reduces hallucination when the answer depends on an external fact.",
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
    summary: "Format as contract: JSON/sections/limits validated before responding, with self-correction.",
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
    summary: "Translates a business request into SQL with explicit assumptions and a stable output contract.",
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
    summary: "Completion checklist: counts the promised items and never delivers partially without saying what is missing.",
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
    summary: "Plan with milestones, owners, and dates — closes the partial-delivery gap in long cycles.",
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
    summary: "Incident procedure with a per-step abort criterion — avoids abandonment mid-response.",
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
    summary: "Guardrail: blocks PII, secrets, and card data in the output, with a safe alternative.",
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
    summary: "Refuses and escalates requests for investment recommendations and unsubstantiated contract interpretation.",
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
    summary: "Every irreversible action goes through simulation/explicit confirmation before executing.",
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
    summary: "Review with severity, findings, and patch — and no destructive action without a gate.",
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
    summary: "Repeats and verifies the conversation constraints before every response — kills instruction drift.",
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
    summary: "Detects attempts to override instructions — the adversarial variant of drift.",
    provides: ["instruction_drift", "policy_violation"],
    requires: ["constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: "any",
    in_registry: true,
  },

  // -------------------------------------------------------------------------
  // Phase 2 — Revenue
  // -------------------------------------------------------------------------
  {
    slug: "marketing-funnel-analyst",
    title: "Marketing funnel analyst",
    summary: "Reads the funnel and returns JSON with stage, rate, bottleneck, and action — without inventing numbers.",
    provides: ["format_break", "hallucination"],
    requires: ["output-contract", "grounded-answers"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["marketing"],
    in_registry: true,
  },
  {
    slug: "growth-experiment-designer",
    title: "Growth experiment designer",
    summary: "Formulates numbered hypotheses with metric, scope, and stopping criterion.",
    provides: ["task_abandon", "instruction_drift"],
    requires: ["finish-the-task", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["marketing"],
    in_registry: true,
  },
  {
    slug: "b2b-qualification-framework",
    title: "B2B qualification framework",
    summary: "Maps fit, pain, decision, and next step without inventing prospect data.",
    provides: ["ambiguity_abandon", "hallucination"],
    requires: ["clarify-before-acting", "grounded-answers"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["b2b_sales"],
    in_registry: true,
  },
  {
    slug: "proposal-author",
    title: "Proposal author",
    summary: "Generates a proposal with a JSON output contract and numbered next steps.",
    provides: ["format_break", "task_abandon"],
    requires: ["output-contract", "finish-the-task"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["b2b_sales"],
    in_registry: true,
  },
  {
    slug: "churn-rescue-playbook",
    title: "Churn rescue playbook",
    summary: "Classifies churn risk and proposes a playbook with an owner, without promising a result.",
    provides: ["task_abandon", "policy_violation"],
    requires: ["finish-the-task", "no-pii-in-output"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["customer_success"],
    in_registry: true,
  },
  {
    slug: "health-score-interpreter",
    title: "Health score interpreter",
    summary: "Interprets account health signals and responds in JSON without inventing data.",
    provides: ["hallucination", "format_break"],
    requires: ["grounded-answers", "output-contract"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["customer_success"],
    in_registry: true,
  },
  {
    slug: "pricing-model-builder",
    title: "Pricing model builder",
    summary: "Builds a pricing scenario with assumptions and margin impact in JSON.",
    provides: ["format_break", "hallucination"],
    requires: ["output-contract", "grounded-answers"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["pricing"],
    in_registry: true,
  },
  {
    slug: "discount-policy-gate",
    title: "Discount policy gate",
    summary: "Blocks predatory discounts and requires finance confirmation.",
    provides: ["policy_violation", "instruction_drift"],
    requires: ["no-pii-in-output", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["pricing"],
    in_registry: true,
  },

  // -------------------------------------------------------------------------
  // Phase 2 — Execution
  // -------------------------------------------------------------------------
  {
    slug: "strategy-option-analyzer",
    title: "Strategy option analyzer",
    summary: "Compares strategic options in JSON: objective, options, recommendation, and risk.",
    provides: ["ambiguity_abandon", "hallucination"],
    requires: ["clarify-before-acting", "grounded-answers"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["strategy"],
    in_registry: true,
  },
  {
    slug: "okr-decomposer",
    title: "OKR decomposer",
    summary: "Decomposes an objective into numbered initiatives with a success metric.",
    provides: ["task_abandon", "format_break"],
    requires: ["finish-the-task", "output-contract"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["strategy"],
    in_registry: true,
  },
  {
    slug: "sprint-prioritizer",
    title: "Sprint prioritizer",
    summary: "Prioritizes the sprint by declaring dependencies and criteria before ordering.",
    provides: ["ambiguity_abandon", "instruction_drift"],
    requires: ["clarify-before-acting", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["project_management"],
    in_registry: true,
  },
  {
    slug: "status-report-author",
    title: "Status report author",
    summary: "Generates a status report JSON with task, owner, date, and blocker.",
    provides: ["format_break", "task_abandon"],
    requires: ["output-contract", "finish-the-task"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["project_management"],
    in_registry: true,
  },
  {
    slug: "hiring-rubric-writer",
    title: "Hiring rubric writer",
    summary: "Creates an interview rubric in JSON with fit, strengths, gaps, and recommendation.",
    provides: ["format_break", "task_abandon"],
    requires: ["output-contract", "finish-the-task"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["people_ops"],
    in_registry: true,
  },
  {
    slug: "feedback-framework",
    title: "Feedback framework",
    summary: "Writes feedback without discriminatory terms and without promoting a data leak.",
    provides: ["policy_violation", "instruction_drift"],
    requires: ["no-pii-in-output", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["people_ops"],
    in_registry: true,
  },
  {
    slug: "contract-risk-scanner",
    title: "Contract risk scanner",
    summary: "Analyzes a clause and returns JSON with risk, suggestion, and a legal flag.",
    provides: ["format_break", "policy_violation"],
    requires: ["output-contract", "no-pii-in-output"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["legal_compliance"],
    in_registry: true,
  },
  {
    slug: "lgpd-checklist",
    title: "LGPD checklist",
    summary: "Blocks data flows without a legal basis and requires a 'this is not legal advice' disclaimer.",
    provides: ["policy_violation", "instruction_drift"],
    requires: ["no-pii-in-output", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["legal_compliance"],
    in_registry: true,
  },

  // -------------------------------------------------------------------------
  // Phase 2 — Operations
  // -------------------------------------------------------------------------
  {
    slug: "financial-model-template",
    title: "Financial model template",
    summary: "Builds a financial projection in JSON with metric, value, assumption, and confidence.",
    provides: ["format_break", "hallucination"],
    requires: ["output-contract", "grounded-answers"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["corporate_finance"],
    in_registry: true,
  },
  {
    slug: "forecast-assumption-tracker",
    title: "Forecast assumption tracker",
    summary: "Every projection includes declared base, optimistic, and pessimistic scenarios.",
    provides: ["instruction_drift", "ambiguity_abandon"],
    requires: ["constraint-memory", "clarify-before-acting"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["corporate_finance"],
    in_registry: true,
  },
  {
    slug: "crm-automation-planner",
    title: "CRM automation planner",
    summary: "Plans CRM automations with numbered next steps and a destructive-action gate.",
    provides: ["task_abandon", "tool_misuse"],
    requires: ["finish-the-task", "destructive-action-gate"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["agentic_crm"],
    in_registry: true,
  },
  {
    slug: "lead-scoring-designer",
    title: "Lead scoring designer",
    summary: "Defines lead scoring in JSON without inventing CRM data.",
    provides: ["format_break", "hallucination"],
    requires: ["output-contract", "grounded-answers"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["agentic_crm"],
    in_registry: true,
  },
  {
    slug: "inventory-policy-engine",
    title: "Inventory policy engine",
    summary: "Calculates reorder point and safety stock accounting for seasonality.",
    provides: ["ambiguity_abandon", "instruction_drift"],
    requires: ["clarify-before-acting", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["supply_chain"],
    in_registry: true,
  },
  {
    slug: "supplier-risk-gate",
    title: "Supplier risk gate",
    summary: "Blocks suppliers that violate compliance and requires confirmation for changes.",
    provides: ["policy_violation", "tool_misuse"],
    requires: ["no-pii-in-output", "destructive-action-gate"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["supply_chain"],
    in_registry: true,
  },
  {
    slug: "data-pipeline-spec",
    title: "Data pipeline spec",
    summary: "Specifies a pipeline in JSON with source, destination, frequency, tests, and SLA.",
    provides: ["format_break", "task_abandon"],
    requires: ["output-contract", "finish-the-task"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["data_engineering"],
    in_registry: true,
  },
  {
    slug: "data-quality-contract",
    title: "Data quality contract",
    summary: "Defines data quality tests without inventing volumes or schemas.",
    provides: ["hallucination", "format_break"],
    requires: ["grounded-answers", "output-contract"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["data_engineering"],
    in_registry: true,
  },

  // -------------------------------------------------------------------------
  // Phase 2 — Media & Product
  // -------------------------------------------------------------------------
  {
    slug: "content-calendar-planner",
    title: "Content calendar planner",
    summary: "Builds a posting calendar with platform, copy, CTA, hashtags, and best time in JSON.",
    provides: ["task_abandon", "format_break"],
    requires: ["finish-the-task", "output-contract"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["social_media"],
    in_registry: true,
  },
  {
    slug: "crisis-response-protocol",
    title: "Crisis response protocol",
    summary: "Blocks sarcastic responses and proposes a numbered crisis plan with owners.",
    provides: ["policy_violation", "instruction_drift"],
    requires: ["no-pii-in-output", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["social_media"],
    in_registry: true,
  },
  {
    slug: "search-ads-structurer",
    title: "Search ads structurer",
    summary: "Structures a Search campaign in JSON with campaign, group, keywords, match type, and budget.",
    provides: ["format_break", "task_abandon"],
    requires: ["output-contract", "finish-the-task"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["google_ads"],
    in_registry: true,
  },
  {
    slug: "ads-policy-gate",
    title: "Ads policy gate",
    summary: "Blocks prohibited claims in ads and requires proof for superlatives.",
    provides: ["policy_violation", "instruction_drift"],
    requires: ["no-pii-in-output", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["google_ads", "meta_ads", "linkedin_ads"],
    in_registry: true,
  },
  {
    slug: "meta-creative-tester",
    title: "Meta creative tester",
    summary: "A/B creative test plan with 4 numbered variations and a hypothesis.",
    provides: ["task_abandon", "format_break"],
    requires: ["finish-the-task", "output-contract"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["meta_ads"],
    in_registry: true,
  },
  {
    slug: "linkedin-abm-orchestrator",
    title: "LinkedIn ABM orchestrator",
    summary: "Orchestrates a LinkedIn ABM flow with numbered steps and destructive-action gates.",
    provides: ["task_abandon", "tool_misuse"],
    requires: ["finish-the-task", "destructive-action-gate"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["linkedin_ads"],
    in_registry: true,
  },
  {
    slug: "prd-writer",
    title: "PRD writer",
    summary: "Writes a PRD in JSON with problem, hypothesis, metric, scope, and dependencies.",
    provides: ["format_break", "task_abandon"],
    requires: ["output-contract", "finish-the-task"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["digital_product"],
    in_registry: true,
  },
  {
    slug: "product-discovery-guide",
    title: "Product discovery guide",
    summary: "Asks discovery questions before proposing a solution and keeps constraints.",
    provides: ["ambiguity_abandon", "instruction_drift"],
    requires: ["clarify-before-acting", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["digital_product"],
    in_registry: true,
  },
  {
    slug: "architecture-decision-record",
    title: "Architecture decision record",
    summary: "Compares architectural options in JSON with pros, cons, decision, and rationale.",
    provides: ["format_break", "ambiguity_abandon"],
    requires: ["output-contract", "clarify-before-acting"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["complex_software"],
    in_registry: true,
  },
  {
    slug: "production-deploy-gate",
    title: "Production deploy gate",
    summary: "Requires a rollback plan, canary, and confirmation before deploying to production.",
    provides: ["tool_misuse", "instruction_drift"],
    requires: ["destructive-action-gate", "constraint-memory"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["complex_software"],
    in_registry: true,
  },
  {
    slug: "tool-registry",
    title: "Tool registry",
    summary: "Catalogs tools in JSON with purpose, input schema, and fallback.",
    provides: ["tool_misuse", "format_break"],
    requires: ["destructive-action-gate", "output-contract"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["tools_mcp"],
    in_registry: true,
  },
  {
    slug: "mcp-auth-guard",
    title: "MCP auth guard",
    summary: "Blocks the use of shared credentials and requires a declared rate limit.",
    provides: ["policy_violation", "tool_misuse"],
    requires: ["no-pii-in-output", "destructive-action-gate"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["tools_mcp"],
    in_registry: true,
  },
  {
    slug: "threat-modeler",
    title: "Threat modeler",
    summary: "Models a threat in JSON with threat, likelihood, impact, mitigation, and owner.",
    provides: ["format_break", "ambiguity_abandon"],
    requires: ["output-contract", "clarify-before-acting"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["cybersecurity"],
    in_registry: true,
  },
  {
    slug: "incident-runbook",
    title: "Incident runbook",
    summary: "Incident runbook with numbered controls and a destructive-action gate.",
    provides: ["task_abandon", "tool_misuse"],
    requires: ["finish-the-task", "destructive-action-gate"],
    conflicts_with: [],
    context_cost: 2,
    domains: ["cybersecurity"],
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
      ? `Conflicts with ${conflicts.join(", ")} — install only if replacing the current capability.`
      : missing.length
        ? `Depends on ${missing.join(", ")} — install the prerequisite first.`
        : `Targets ${fixes.map((f) => f).join(", ")} where the exam failed, at a context cost of ${node.context_cost}.`;

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
          why: `Does not cover any error class this agent failed and costs ${n.context_cost} of context.`,
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
      ? `This agent already carries ${installed.length} capabilities (cap ${budget}). Above the cap, adding hurts performance: remove or swap before installing.`
      : "Ranked by marginal gain: coverage of the error class that hurts the most, discounting what is already installed and penalizing conflicts and context cost.",
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
