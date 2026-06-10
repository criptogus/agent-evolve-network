import type { Artifact, Kind } from "@/lib/generate/types";

export const SAMPLES = [
  "I run a cardiology clinic and want my agent to triage chest-pain cases using the latest 2026 ESC guidelines.",
  "I sell to CFOs of mid-market SaaS. Build the playbook and give it a McKinsey soul.",
  "Create a custom soul that talks like our founder Marina, plus a guardrail that never recommends competitors.",
  "Make my agent an SDR for a Series B fintech: prospect on LinkedIn, qualify, book demos in HubSpot.",
];

/* ---------- prompt → plan (deterministic, keyword-based) ---------- */

export function planFromPrompt(prompt: string): {
  industry: string;
  role: string;
  enrich: Artifact[];
  generate: Artifact[];
} {
  const p = prompt.toLowerCase();

  let industry = "Generalist";
  let role = "Knowledge worker";

  if (/(cardio|chest pain|esc|arrhythm)/.test(p)) {
    industry = "Healthcare · Cardiology";
    role = "Clinical assistant";
    return {
      industry,
      role,
      enrich: [
        artifact("skill", "cardiology-diagnostics", "2.1.0", "enriched", {
          summary: "ESC 2026 chest-pain triage, ACS pathways, risk scoring (HEART, GRACE).",
          bullets: ["12-lead ECG interpretation", "Troponin kinetics", "Rule-out ACS in 0/1h"],
          delta: { health: 6.4, precision: 5.8, safety: 1.2, latency: -40 },
        }),
        artifact("guardrail", "medical-guardrails", "1.4.0", "enriched", {
          summary: "Blocks unverified diagnoses, requires citations, defers ambiguous to MD.",
          bullets: ["Citation-required", "No drug dosing without weight", "Escalate red flags"],
          delta: { health: 2.1, precision: 0.4, safety: 6.0, latency: 10 },
        }),
      ],
      generate: [
        artifact("playbook", "chest-pain-triage", "0.1.0", "generated", {
          summary: "Custom intake → risk score → escalation flow tuned to your clinic.",
          bullets: ["Intake template", "Risk-stratified routing", "Handoff note to cardiologist"],
          delta: { health: 3.2, precision: 2.6, safety: 1.4, latency: -30 },
        }),
      ],
    };
  }

  if (/(cfo|enterprise|saas|sales|sdr|prospect|hubspot|linkedin|outbound|close)/.test(p)) {
    industry = "Enterprise SaaS";
    role = "Revenue agent";
    const enrich: Artifact[] = [
      artifact("playbook", "enterprise-sales-flow", "1.4.2", "enriched", {
        summary: "MEDDPICC qualification, multi-thread outreach, deal review cadence.",
        bullets: ["MEDDPICC scoring", "Champion enablement", "Mutual close plan"],
        delta: { health: 5.2, precision: 4.1, safety: 0.2, latency: -20 },
      }),
    ];
    if (/sdr|prospect|linkedin|hubspot/.test(p)) {
      enrich.push(
        artifact("skill", "linkedin-prospecting", "1.2.0", "enriched", {
          summary: "Persona research + InMail sequences benchmarked above 18% reply.",
          bullets: ["ICP scoring", "Trigger-based outreach", "HubSpot sync"],
          delta: { health: 3.4, precision: 3.2, safety: 0.0, latency: -15 },
        }),
      );
    }
    const generate: Artifact[] = [];
    if (/mckinsey|consultant/.test(p) || /cfo/.test(p)) {
      generate.push(
        artifact("soul", "cfo-whisperer", "0.1.0", "generated", {
          summary: "Speaks ROI, payback period and unit economics. Concise, numerate.",
          bullets: ["Quantifies every claim", "TCO framing", "MoM/QoQ language"],
          delta: { health: 3.6, precision: 2.8, safety: 0.4, latency: 0 },
        }),
      );
    }
    if (/competitor|never recommend/.test(p)) {
      generate.push(
        artifact("guardrail", "competitor-shield", "0.1.0", "generated", {
          summary: "Blocks 14 competitor mentions and rerouting to comparison frames.",
          bullets: ["Brand allowlist", "Comparison reframing", "Audit log"],
          delta: { health: 1.4, precision: 0.0, safety: 3.2, latency: 5 },
        }),
      );
    }
    if (generate.length === 0) {
      generate.push(
        artifact("soul", "challenger-rep", "0.1.0", "generated", {
          summary: "Challenger-style soul tuned for your ICP and tone of voice.",
          bullets: ["Insight-led openers", "Reframing objections", "Confident close"],
          delta: { health: 2.8, precision: 2.0, safety: 0.2, latency: -5 },
        }),
      );
    }
    return { industry, role, enrich, generate };
  }

  if (/(legal|law|due diligence|contract|nda)/.test(p)) {
    industry = "Legal";
    role = "Junior associate";
    return {
      industry,
      role,
      enrich: [
        artifact("skill", "legal-due-diligence", "1.6.0", "enriched", {
          summary: "Contract review, red-flag detection, NDA/MSA clause comparison.",
          bullets: ["Clause taxonomy", "Risk heatmap", "Redline suggestions"],
          delta: { health: 5.8, precision: 5.0, safety: 1.6, latency: -25 },
        }),
        artifact("guardrail", "legal-compliance", "2.0.0", "enriched", {
          summary: "Jurisdiction-aware, never gives legal advice, attorney-review flag.",
          bullets: ["Jurisdiction tagging", "Privilege protection", "Citation-required"],
          delta: { health: 2.0, precision: 0.6, safety: 5.4, latency: 10 },
        }),
      ],
      generate: [
        artifact("playbook", "deal-room-prep", "0.1.0", "generated", {
          summary: "Custom checklist + memo flow modeled on your last 30 deals.",
          bullets: ["Doc index", "Issue list draft", "Closing checklist"],
          delta: { health: 2.8, precision: 2.2, safety: 0.8, latency: -10 },
        }),
      ],
    };
  }

  if (/(hematolog|oncolog|onco)/.test(p)) {
    industry = "Healthcare · Hematology";
    role = "Specialist assistant";
    return {
      industry,
      role,
      enrich: [
        artifact("skill", "hematology-specialist", "1.3.0", "enriched", {
          summary: "CBC interpretation, anemia workup, coagulation pathways.",
          bullets: ["Smear hints", "Reticulocyte logic", "DDx ranking"],
          delta: { health: 6.0, precision: 5.4, safety: 1.0, latency: -30 },
        }),
        artifact("guardrail", "medical-guardrails", "1.4.0", "enriched", {
          summary: "Citation-required, deferral on red flags, dosing safety net.",
          bullets: ["Cite-or-quiet", "Red-flag escalation", "Dose sanity check"],
          delta: { health: 2.0, precision: 0.4, safety: 5.6, latency: 10 },
        }),
      ],
      generate: [
        artifact("soul", "humanized-clinician", "0.1.0", "generated", {
          summary: "Calm, specific tone for patient-facing summaries in plain Portuguese.",
          bullets: ["Avoids jargon", "Names uncertainty", "Always next step"],
          delta: { health: 2.4, precision: 1.4, safety: 0.6, latency: 0 },
        }),
      ],
    };
  }

  if (/(founder|marina|ceo|talk like|voice of)/.test(p)) {
    industry = "Brand voice";
    role = "Voice of the company";
    return {
      industry,
      role,
      enrich: [
        artifact("skill", "brand-voice-writer", "1.2.0", "enriched", {
          summary: "On-brand long-form and short-form with tone fidelity scoring.",
          bullets: ["Tone score ≥ 0.85", "Style guide pinned", "Terminology lock"],
          delta: { health: 4.2, precision: 3.6, safety: 0.4, latency: -15 },
        }),
      ],
      generate: [
        artifact("soul", "founder-soul", "0.1.0", "generated", {
          summary: "Distilled from 412 transcripts. Cadence, idioms, decision style locked in.",
          bullets: ["Signature phrases", "Story arcs", "Opinionated POV"],
          delta: { health: 4.6, precision: 2.8, safety: 0.2, latency: -10 },
        }),
        artifact("guardrail", "off-brand-shield", "0.1.0", "generated", {
          summary: "Flags off-voice drafts before they ship. Suggests rewrites.",
          bullets: ["Tone fidelity gate", "Forbidden terms", "Rewrite hints"],
          delta: { health: 1.6, precision: 0.4, safety: 3.4, latency: 5 },
        }),
      ],
    };
  }

  // Default fallback — generic but useful
  return {
    industry,
    role,
    enrich: [
      artifact("skill", "research-pro", "1.5.0", "enriched", {
        summary: "Structured research with sources, dedup and recency weighting.",
        bullets: ["Source diversity", "Freshness boost", "Cite-on-claim"],
        delta: { health: 4.0, precision: 3.6, safety: 0.6, latency: -20 },
      }),
      artifact("guardrail", "no-hallucination", "1.4.0", "enriched", {
        summary: "Blocks low-confidence claims, requires citations, hedges uncertainty.",
        bullets: ["Confidence floor", "Citation-required", "Hedging policy"],
        delta: { health: 2.4, precision: 0.6, safety: 4.8, latency: 10 },
      }),
    ],
    generate: [
      artifact("soul", "your-house-style", "0.1.0", "generated", {
        summary: "Soul tuned to your brief — tone, cadence and decision style.",
        bullets: ["Cadence locked", "Vocabulary curated", "Opinion calibrated"],
        delta: { health: 2.8, precision: 1.6, safety: 0.4, latency: -5 },
      }),
    ],
  };
}

export function artifact(
  kind: Kind,
  name: string,
  version: string,
  source: "enriched" | "generated",
  rest: { summary: string; bullets: string[]; delta: Artifact["delta"] },
): Artifact {
  return { kind, name, version, source, ...rest };
}
