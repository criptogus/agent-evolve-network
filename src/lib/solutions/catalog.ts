export type SolutionStep = { id: string; title: string; deliverable: string; depends_on: string[] };
export type Solution = {
  id: string;
  title: string;
  category: string;
  outcome: string;
  inputs: string[];
  done: string[];
  packages: string[];
  context_budget: number;
  steps: SolutionStep[];
};
export const SOLUTIONS: Solution[] = [
  {
    id: "monthly-finance-close",
    title: "Close the financial month",
    category: "Finance operations",
    outcome: "A reconciled ledger, explained variances and an owner-reviewed closing pack.",
    inputs: [
      "Invoice and transaction exports",
      "Chart of accounts and reporting period",
      "Approved budget and accounting policy",
    ],
    done: [
      "Unmatched entries have owners",
      "Variance bridge reconciles to source totals",
      "Controller approves the closing pack",
    ],
    packages: [
      "invoice-parser",
      "budget-variance-analyst",
      "cash-flow-forecaster",
      "guardrail-accounting-audit-integrity",
    ],
    context_budget: 4,
    steps: [
      {
        id: "extract",
        title: "Normalize source records",
        deliverable: "Source-linked invoice and ledger table",
        depends_on: [],
      },
      {
        id: "reconcile",
        title: "Reconcile balances and exceptions",
        deliverable: "Reconciliation with unresolved items and owners",
        depends_on: ["extract"],
      },
      {
        id: "analyze",
        title: "Explain variances and cash impact",
        deliverable: "Variance bridge and cash projection with assumptions",
        depends_on: ["reconcile"],
      },
      {
        id: "approve",
        title: "Controller review",
        deliverable: "Signed-off closing pack; no automatic posting or payment",
        depends_on: ["analyze"],
      },
    ],
  },
  {
    id: "supplier-selection",
    title: "Evaluate and select suppliers",
    category: "Procurement",
    outcome: "Comparable bids, documented risks and a buyer-owned decision.",
    inputs: [
      "Supplier bids and required scope",
      "Evaluation weights and procurement policy",
      "Delivery requirements and contract extracts",
    ],
    done: [
      "Scope and currencies are comparable",
      "Every score cites a source",
      "Buyer approves award and contractual actions",
    ],
    packages: [
      "lg-supply-chain",
      "freight-rfp-runner",
      "contract-clause-extractor",
      "guardrail-contract-review-risk",
    ],
    context_budget: 4,
    steps: [
      {
        id: "scope",
        title: "Define scope and mandatory criteria",
        deliverable: "Comparable requirements matrix",
        depends_on: [],
      },
      {
        id: "compare",
        title: "Normalize bids and exclusions",
        deliverable: "Cost, lead time and scope comparison",
        depends_on: ["scope"],
      },
      {
        id: "risk",
        title: "Review obligations and supplier risks",
        deliverable: "Evidence-backed risk and contract exception log",
        depends_on: ["compare"],
      },
      {
        id: "award",
        title: "Buyer decision",
        deliverable: "Decision record with required approval; no automatic award",
        depends_on: ["risk"],
      },
    ],
  },
  {
    id: "secure-agent-launch",
    title: "Launch an agent with scoped permissions",
    category: "Agent security",
    outcome: "A reviewed tool inventory, tested abuse cases and a controlled release decision.",
    inputs: [
      "Tool manifests and data classifications",
      "Permission policy and authorized test scope",
      "Synthetic fixtures and release criteria",
    ],
    done: [
      "Every tool has an owner and minimum scope",
      "Abuse tests distinguish observed results from plans",
      "Release owner accepts remaining risks",
    ],
    packages: [
      "mcp-server-builder",
      "prompt-injection-tester",
      "iam-least-privilege",
      "security-review",
    ],
    context_budget: 4,
    steps: [
      {
        id: "inventory",
        title: "Inventory tools and permissions",
        deliverable: "Tool/resource/actor permission matrix",
        depends_on: [],
      },
      {
        id: "fixtures",
        title: "Create authorized offline abuse cases",
        deliverable: "Synthetic injection and exfiltration fixtures",
        depends_on: ["inventory"],
      },
      {
        id: "test",
        title: "Run and inspect the tests",
        deliverable: "Captured traces and pass/fail evidence",
        depends_on: ["fixtures"],
      },
      {
        id: "release",
        title: "Release review",
        deliverable: "Owner-approved deployment and rollback plan",
        depends_on: ["test"],
      },
    ],
  },
  {
    id: "brazil-reconciliation",
    title: "Reconcile Brazilian order operations",
    category: "Operações Brasil",
    outcome: "An order-to-invoice-to-payment reconciliation and a human exception queue.",
    inputs: [
      "Authorized NF-e XML exports",
      "Order ledger",
      "Pix settlement export and support consent policy",
    ],
    done: [
      "Each document and payment is linked or flagged",
      "Duplicates and mismatches are retained",
      "Finance owns posting and payment decisions",
    ],
    packages: ["br-nfe-order-reconciler", "br-pix-reconciler", "br-whatsapp-handoff"],
    context_budget: 3,
    steps: [
      {
        id: "invoices",
        title: "Reconcile invoices to orders",
        deliverable: "Invoice/order matching and document exceptions",
        depends_on: [],
      },
      {
        id: "payments",
        title: "Reconcile settlement evidence",
        deliverable: "Matched payments and unresolved amounts",
        depends_on: ["invoices"],
      },
      {
        id: "handoff",
        title: "Assign exceptions to people",
        deliverable: "Owner-specific summaries and reply drafts; no automatic sending",
        depends_on: ["payments"],
      },
    ],
  },
];
export function planSolution(solution: Solution, budget: number) {
  if (!Number.isInteger(budget) || budget < 1 || budget > 20)
    throw new Error("Context budget must be 1–20 packages");
  const byId = new Map(solution.steps.map((s) => [s.id, s]));
  if (byId.size !== solution.steps.length) throw new Error("Duplicate step id");
  const ordered: SolutionStep[] = [],
    visiting = new Set<string>(),
    done = new Set<string>();
  function visit(id: string) {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error("Dependency cycle");
    const s = byId.get(id);
    if (!s) throw new Error(`Missing dependency: ${id}`);
    visiting.add(id);
    s.depends_on.forEach(visit);
    visiting.delete(id);
    done.add(id);
    ordered.push(s);
  }
  solution.steps.forEach((s) => visit(s.id));
  const packages = [...new Set(solution.packages)];
  return {
    solution_id: solution.id,
    packages,
    steps: ordered,
    inputs: solution.inputs,
    definition_of_done: solution.done,
    context_budget: budget,
    within_budget: packages.length <= budget,
    warnings:
      packages.length > budget
        ? [
            `This stack needs ${packages.length} packages. Stage one workflow step at a time or increase the explicit budget.`,
          ]
        : [],
    execution: "manual" as const,
  };
}
