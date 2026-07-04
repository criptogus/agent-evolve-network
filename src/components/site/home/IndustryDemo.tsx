import { Link } from "@tanstack/react-router";
import { useState } from "react";

type PackageKind = "skill" | "playbook" | "soul" | "guardrail";

type Example = {
  prompt: string;
  summary: string;
  packages: { name: string; kind: PackageKind }[];
};

type Industry = {
  id: string;
  label: string;
  blurb: string;
  examples: Example[];
};

// Stacks reference real registry packages; summaries describe behavior. Never
// add invented business metrics ("+12% close rate") here — capability claims only.
const INDUSTRIES: Industry[] = [
  {
    id: "healthcare",
    label: "Healthcare",
    blurb: "Clinical-grade specialists with citation-required guardrails.",
    examples: [
      {
        prompt: "Make my agent a cardiologist trained on the latest ESC guidelines.",
        summary:
          "Cites the guideline behind every recommendation and refuses to dose without patient weight.",
        packages: [
          { name: "cardiology-diagnostics", kind: "skill" },
          { name: "medical-guardrails", kind: "guardrail" },
        ],
      },
      {
        prompt: "Build a triage flow for chest-pain intake at our ER.",
        summary:
          "Routes STEMI vs non-STEMI vs musculoskeletal and escalates ambiguous cases to the on-call cardiologist.",
        packages: [
          { name: "chest-pain-triage", kind: "playbook" },
          { name: "cite-required", kind: "guardrail" },
        ],
      },
      {
        prompt: "Summarize a discharge summary for the primary care physician, citing every claim.",
        summary:
          "Extracts diagnosis, meds, follow-ups and red flags — citations link back to the source chart.",
        packages: [{ name: "clinical-summarizer", kind: "skill" }],
      },
      {
        prompt: "Block any answer that gives a dose without patient weight.",
        summary:
          "Hard refusal plus a structured request for the missing fields. Every attempt is logged for audit.",
        packages: [{ name: "dose-safety-shield", kind: "guardrail" }],
      },
    ],
  },
  {
    id: "saas",
    label: "Sales & SaaS",
    blurb: "Revenue agents that prospect, qualify and close in your stack.",
    examples: [
      {
        prompt: "I sell to CFOs of mid-market SaaS. Give it the right playbook.",
        summary:
          "Runs MEDDPICC discovery, surfaces hidden champions and drafts a multi-threading plan.",
        packages: [
          { name: "enterprise-sales-flow", kind: "playbook" },
          { name: "cfo-whisperer-soul", kind: "soul" },
        ],
      },
      {
        prompt: "Triage inbound from our website form and route ICP fits to an AE.",
        summary:
          "Scores ICP fit, detects procurement language, books the right person — never invents pricing.",
        packages: [
          { name: "icp-router", kind: "skill" },
          { name: "no-pricing-fabrication", kind: "guardrail" },
        ],
      },
      {
        prompt: "Write a 3-line follow-up to a CFO who ghosted after the demo.",
        summary:
          "Reuses the demo's strongest moment, names the business outcome, asks one decision question.",
        packages: [
          { name: "follow-up-writer", kind: "skill" },
          { name: "challenger-rep-soul", kind: "soul" },
        ],
      },
      {
        prompt: "Build a guardrail so it never recommends a competitor.",
        summary:
          "Detects competitor mentions and reframes as a value question. Every block is logged for sales ops.",
        packages: [{ name: "competitor-shield", kind: "guardrail" }],
      },
    ],
  },
  {
    id: "legal",
    label: "Legal",
    blurb: "Junior associates that triage contracts with privilege protection.",
    examples: [
      {
        prompt: "Make my agent a junior associate that reviews NDAs and MSAs.",
        summary:
          "Classifies contract type and surfaces high-risk clauses — never gives advice, always defers to the partner of record.",
        packages: [
          { name: "legal-due-diligence", kind: "playbook" },
          { name: "attorney-review", kind: "guardrail" },
        ],
      },
      {
        prompt: "Compare this MSA against our standard paper and flag deviations.",
        summary:
          "Clause-level redline with severity, fallback language, and the partner who owns each issue.",
        packages: [{ name: "clause-redline", kind: "skill" }],
      },
      {
        prompt: "Qualify whether a new matter fits our practice before partner intake.",
        summary:
          "Conflicts check, scope estimate and budget bracket. Flags anything that needs a malpractice review.",
        packages: [{ name: "matter-intake", kind: "skill" }],
      },
      {
        prompt: "Never give legal advice — always defer to the partner of record.",
        summary:
          "Recognizes advice-seeking patterns and returns a deferral with the right partner's name attached.",
        packages: [{ name: "attorney-review", kind: "guardrail" }],
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Brand",
    blurb: "On-voice writers, ad operators and brand-safety guardrails.",
    examples: [
      {
        prompt: "Create a custom soul that talks like our founder.",
        summary:
          "Distilled from your founder's transcripts — captures the cadence, skips the clichés, never overpromises.",
        packages: [{ name: "founder-voice-soul", kind: "soul" }],
      },
      {
        prompt: "SEO + blog writing tuned to our pillar pages and tone of voice.",
        summary:
          "Checks SEO alignment, voice fidelity and factual claims. Returns a clean diff with rationale.",
        packages: [
          { name: "seo-pro", kind: "skill" },
          { name: "brand-voice-writer", kind: "skill" },
        ],
      },
      {
        prompt: "Qualify which growth experiments to run this sprint.",
        summary:
          "Generates an ICE-ranked backlog tied to your north-star metric and kills experiments that won't move it.",
        packages: [{ name: "growth-hacking-pro", kind: "skill" }],
      },
      {
        prompt: "Flag any draft that drifts from our brand voice before it ships.",
        summary:
          "Scores every draft against your voice profile and blocks publishing below threshold.",
        packages: [{ name: "off-brand-shield", kind: "guardrail" }],
      },
    ],
  },
  {
    id: "fintech",
    label: "Fintech",
    blurb: "Compliance-first agents for support, KYC and risk ops.",
    examples: [
      {
        prompt: "Customer-support agent for a Brazilian neobank, in PT-BR, escalates fraud cases.",
        summary:
          "Detects fraud signals, routes by intent — never gives investment advice or promises refunds.",
        packages: [
          { name: "support-pro", kind: "skill" },
          { name: "bacen-compliance", kind: "guardrail" },
        ],
      },
      {
        prompt: "KYC analyst that reviews docs and explains rejections in plain language.",
        summary:
          "Document checks, sanctions screening, plain-language rejections — with a regulator-ready audit trail.",
        packages: [
          { name: "kyc-analyst", kind: "skill" },
          { name: "plain-rejection-writer", kind: "skill" },
        ],
      },
      {
        prompt: "Review a flagged transaction and explain the risk score in 4 lines.",
        summary:
          "Surfaces the contributing signals, similar past cases, and the recommended next action.",
        packages: [{ name: "risk-explainer", kind: "skill" }],
      },
      {
        prompt: "Build a guardrail so it never gives investment advice.",
        summary:
          "Pattern + intent detection. Returns a regulator-safe deferral with the right disclosures.",
        packages: [{ name: "no-advice-shield", kind: "guardrail" }],
      },
    ],
  },
];

const KIND_BADGE: Record<PackageKind, string> = {
  skill: "bg-primary/10 text-primary",
  playbook: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  soul: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  guardrail: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function IndustryDemo() {
  const [activeId, setActiveId] = useState(INDUSTRIES[0].id);
  const active = INDUSTRIES.find((i) => i.id === activeId)!;

  return (
    <section className="border-b border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Plain-English commands
          </span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            If you can write a sentence, you can ship a specialist.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Super Agent Skill does two things at once: it{" "}
            <span className="text-foreground">installs</span> the best existing packages for your
            industry, and it <span className="text-foreground">forges new ones</span> — skills,
            playbooks and souls custom-built from your data — on demand.
          </p>
        </div>

        {/* Industry selector */}
        <div className="mt-10">
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Industry
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Industry selector">
            {INDUSTRIES.map((i) => {
              const isActive = i.id === activeId;
              return (
                <button
                  key={i.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveId(i.id)}
                  className={
                    "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-all " +
                    (isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                  }
                >
                  {i.label}
                </button>
              );
            })}
          </div>
          <p key={active.id} className="mt-4 animate-fade-in text-sm text-muted-foreground">
            {active.blurb}
          </p>
        </div>

        <div key={active.id} className="mt-8 grid animate-fade-in gap-4 md:grid-cols-2">
          {active.examples.map((e, i) => (
            <div
              key={`${active.id}-${i}`}
              className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] text-primary">
                  ›_
                </span>
                <p className="text-[15px] font-medium text-foreground">{e.prompt}</p>
              </div>
              <div className="mt-3 flex items-start gap-3 border-t border-border pt-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-signal/20 font-mono text-[11px] text-signal-foreground">
                  ✓
                </span>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{e.summary}</p>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {e.packages.map((p) => (
                  <li
                    key={p.name}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] ${KIND_BADGE[p.kind]}`}
                  >
                    <span className="uppercase tracking-wider opacity-70">{p.kind}</span>
                    <span className="text-foreground/90">{p.name}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-end gap-2 border-t border-border pt-3">
                <Link
                  to="/generate"
                  search={{ prompt: e.prompt }}
                  className="group mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
                >
                  Try this live
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
