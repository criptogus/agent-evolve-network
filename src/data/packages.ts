export type PackageType = "skill" | "playbook" | "soul" | "guardrail";

export interface PackageVersion {
  version: string;
  date: string;
  notes: string;
  status: "stable" | "beta" | "deprecated";
}

export interface CompatibilityCheck {
  runtime: string;
  status: "supported" | "partial" | "unsupported";
  detail: string;
}

export interface Package {
  id: string;
  name: string;
  type: PackageType;
  author: string;
  authorVerified?: boolean;
  downloads: string;
  rating: number;
  reviews: number;
  description: string;
  longDescription: string;
  latest: string;
  versions: PackageVersion[];
  compatibility: CompatibilityCheck[];
  dependencies: { name: string; version: string }[];
  scopes: string[];
  size: string;
  license: string;
  examples: { title: string; body: string }[];
  metrics: { label: string; value: string; delta?: string }[];
}

export const PACKAGES: Package[] = [
  {
    id: "cardiology-diagnostics",
    name: "cardiology-diagnostics",
    type: "skill",
    author: "@mayo-health",
    authorVerified: true,
    downloads: "84.2k",
    rating: 4.9,
    reviews: 1284,
    description: "Differential diagnosis flow trained on 12k cardiology cases.",
    longDescription:
      "A clinical reasoning skill that walks an agent through ECG interpretation, risk stratification, and differential diagnosis for cardiac presentations. Tuned on 12,000+ de-identified case files reviewed by board-certified cardiologists. Includes structured output for EHR integration and explicit uncertainty acknowledgement.",
    latest: "2.1.0",
    versions: [
      { version: "2.1.0", date: "2 days ago", status: "stable", notes: "Improved pediatric ECG patterns. +6% precision on rare arrhythmias." },
      { version: "2.0.4", date: "3 weeks ago", status: "stable", notes: "Patch: STEMI threshold tuning, EHR schema fixes." },
      { version: "2.0.0", date: "2 months ago", status: "stable", notes: "Major: structured outputs, FHIR-compatible payloads." },
      { version: "1.9.2", date: "5 months ago", status: "deprecated", notes: "Legacy free-text outputs. End-of-life Q3." },
    ],
    compatibility: [
      { runtime: "Claude 3.5+", status: "supported", detail: "Full tool calling, structured outputs." },
      { runtime: "Cursor (MCP 1.0+)", status: "supported", detail: "Verified via gateway." },
      { runtime: "Codex / GPT-4 class", status: "supported", detail: "Native function calling." },
      { runtime: "OpenClaw", status: "partial", detail: "Structured outputs require manual schema mapping." },
      { runtime: "Hermes 2", status: "supported", detail: "Verified by community." },
      { runtime: "Grok 2", status: "unsupported", detail: "Awaiting MCP gateway support for medical scopes." },
    ],
    dependencies: [
      { name: "no-hallucination", version: "^1.0" },
      { name: "medical-guardrails", version: ">=0.8" },
    ],
    scopes: ["agent:upgrade", "registry:read", "feedback:write"],
    size: "412 KB",
    license: "Commercial · Mayo Health EULA",
    examples: [
      {
        title: "ECG triage",
        body: "Patient: 58M, chest pain 2h, diaphoresis.\n→ Skill produces ECG interpretation, GRACE score, recommended workup, and a differential ranked by likelihood with citations.",
      },
      {
        title: "Pediatric arrhythmia",
        body: "Patient: 7F, palpitations on exertion.\n→ Skill flags long-QT screening, recommends Holter, and explicitly notes pediatric reference ranges differ.",
      },
    ],
    metrics: [
      { label: "Precision", value: "94.2%", delta: "+6%" },
      { label: "Avg. assessment time", value: "1.4s" },
      { label: "Hallucination rate", value: "0.3%", delta: "−0.2pp" },
    ],
  },
  {
    id: "enterprise-sales-flow",
    name: "enterprise-sales-flow",
    type: "playbook",
    author: "@oracle-labs",
    authorVerified: true,
    downloads: "212k",
    rating: 4.8,
    reviews: 3120,
    description: "End-to-end MEDDPICC + multi-thread enterprise sales motion.",
    longDescription:
      "A complete enterprise sales playbook from discovery to close. Bakes in MEDDPICC qualification, multi-threading, mutual action plans, and procurement navigation. Optimized for $100k+ ACV deals.",
    latest: "1.4.2",
    versions: [
      { version: "1.4.2", date: "1 week ago", status: "stable", notes: "Better procurement objection handling. +12% close rate observed." },
      { version: "1.4.0", date: "1 month ago", status: "stable", notes: "Added mutual action plan generator." },
      { version: "1.3.0", date: "3 months ago", status: "stable", notes: "MEDDPICC scoring overhaul." },
    ],
    compatibility: [
      { runtime: "Claude 3.5+", status: "supported", detail: "Recommended runtime." },
      { runtime: "Cursor", status: "supported", detail: "Full feature support." },
      { runtime: "Codex / GPT-4 class", status: "supported", detail: "Native compatibility." },
      { runtime: "OpenClaw", status: "supported", detail: "Verified." },
      { runtime: "Hermes 2", status: "partial", detail: "Multi-thread orchestration needs manual setup." },
      { runtime: "Grok 2", status: "supported", detail: "Verified via gateway." },
    ],
    dependencies: [{ name: "mckinsey-consultant", version: "^2.0" }],
    scopes: ["agent:upgrade", "registry:read", "feedback:write"],
    size: "289 KB",
    license: "MIT",
    examples: [
      {
        title: "Discovery → Qualified",
        body: "Inbound lead from Series C SaaS.\n→ Playbook drives 5-question discovery, scores MEDDPICC, identifies 3 stakeholders to multi-thread.",
      },
    ],
    metrics: [
      { label: "Close rate uplift", value: "+12%", delta: "vs baseline" },
      { label: "Avg. cycle compression", value: "−18 days" },
      { label: "Stakeholders threaded", value: "3.4 avg" },
    ],
  },
  {
    id: "steve-jobs-soul",
    name: "steve-jobs-soul",
    type: "soul",
    author: "@superagentskill",
    authorVerified: true,
    downloads: "1.2M",
    rating: 4.7,
    reviews: 18420,
    description: "Reality distortion field, taste, brutal product clarity.",
    longDescription:
      "A personality layer that makes your agent obsess over taste, simplicity, and saying no. Sharp, sometimes blunt, always principled. Best paired with product, design, or strategy playbooks.",
    latest: "3.0.1",
    versions: [
      { version: "3.0.1", date: "4 days ago", status: "stable", notes: "Tone calibration: less brusque on first interactions." },
      { version: "3.0.0", date: "2 weeks ago", status: "stable", notes: "Major rewrite. New decision-making heuristics." },
      { version: "2.8.0", date: "3 months ago", status: "deprecated", notes: "Legacy. Migrate to 3.x." },
    ],
    compatibility: [
      { runtime: "Claude 3.5+", status: "supported", detail: "Full personality fidelity." },
      { runtime: "Cursor", status: "supported", detail: "Verified." },
      { runtime: "Codex / GPT-4 class", status: "supported", detail: "Verified." },
      { runtime: "OpenClaw", status: "supported", detail: "Verified." },
      { runtime: "Hermes 2", status: "supported", detail: "Verified." },
      { runtime: "Grok 2", status: "supported", detail: "Verified." },
    ],
    dependencies: [],
    scopes: ["agent:upgrade", "feedback:write"],
    size: "94 KB",
    license: "MIT",
    examples: [
      {
        title: "Roadmap review",
        body: "PM proposes 14 features for Q3.\n→ Agent cuts to 3, explains why the other 11 are noise, and reframes one as the real product.",
      },
    ],
    metrics: [
      { label: "Soul alignment score", value: "99%" },
      { label: "Decisiveness", value: "+34%" },
      { label: "Avg. words per reply", value: "−42%" },
    ],
  },
  {
    id: "medical-guardrails",
    name: "medical-guardrails",
    type: "guardrail",
    author: "@hippocratic-ai",
    authorVerified: true,
    downloads: "94k",
    rating: 5.0,
    reviews: 642,
    description: "FDA-aligned safety boundaries for clinical agent use cases.",
    longDescription:
      "Hard safety boundaries for any clinical agent. Blocks unsafe drug recommendations, enforces citation of authoritative sources, escalates to human clinicians when uncertainty exceeds threshold.",
    latest: "0.9.0",
    versions: [
      { version: "0.9.0", date: "1 week ago", status: "beta", notes: "Public beta. Production-ready, awaiting final FDA-aligned audit." },
      { version: "0.8.4", date: "1 month ago", status: "beta", notes: "Drug interaction database refresh." },
    ],
    compatibility: [
      { runtime: "Claude 3.5+", status: "supported", detail: "Recommended." },
      { runtime: "Cursor", status: "supported", detail: "Verified." },
      { runtime: "Codex / GPT-4 class", status: "supported", detail: "Verified." },
      { runtime: "OpenClaw", status: "partial", detail: "Escalation hooks need wiring." },
      { runtime: "Hermes 2", status: "supported", detail: "Verified." },
      { runtime: "Grok 2", status: "unsupported", detail: "Pending medical scope approval." },
    ],
    dependencies: [{ name: "no-hallucination", version: "^1.0" }],
    scopes: ["agent:upgrade", "feedback:write"],
    size: "178 KB",
    license: "Apache-2.0",
    examples: [
      {
        title: "Unsafe dosage attempt",
        body: "Agent suggests 2g acetaminophen for a child.\n→ Guardrail blocks, returns weight-based dosing, escalates to clinician.",
      },
    ],
    metrics: [
      { label: "Unsafe outputs blocked", value: "100%" },
      { label: "False positive rate", value: "0.8%" },
      { label: "Avg. latency added", value: "120ms" },
    ],
  },
  {
    id: "growth-hacking-pro",
    name: "growth-hacking-pro",
    type: "skill",
    author: "@reforge",
    downloads: "318k",
    rating: 4.6,
    reviews: 5108,
    description: "ICE prioritization, north-star metric design, retention loops.",
    longDescription:
      "Battle-tested growth skill covering experiment design, ICE scoring, north-star metric selection, and retention loop architecture.",
    latest: "1.6.0",
    versions: [
      { version: "1.6.0", date: "5 days ago", status: "stable", notes: "Added activation loop templates." },
      { version: "1.5.0", date: "1 month ago", status: "stable", notes: "ICE scoring v2." },
    ],
    compatibility: [
      { runtime: "Claude 3.5+", status: "supported", detail: "Verified." },
      { runtime: "Cursor", status: "supported", detail: "Verified." },
      { runtime: "Codex / GPT-4 class", status: "supported", detail: "Verified." },
      { runtime: "OpenClaw", status: "supported", detail: "Verified." },
      { runtime: "Hermes 2", status: "partial", detail: "Some templates render plain text." },
      { runtime: "Grok 2", status: "supported", detail: "Verified." },
    ],
    dependencies: [],
    scopes: ["agent:upgrade", "feedback:write"],
    size: "156 KB",
    license: "MIT",
    examples: [
      { title: "Experiment backlog", body: "Generates ICE-scored experiment backlog from a single growth question." },
    ],
    metrics: [
      { label: "Experiment velocity", value: "+2.4x" },
      { label: "Hypothesis quality", value: "92%" },
    ],
  },
  {
    id: "mckinsey-consultant",
    name: "mckinsey-consultant",
    type: "soul",
    author: "@strategy-co",
    downloads: "402k",
    rating: 4.8,
    reviews: 7320,
    description: "MECE thinking, pyramid principle, executive communication.",
    longDescription:
      "Strategy consultant personality. Structures every answer with MECE, communicates via the pyramid principle, and pressure-tests assumptions before recommendations.",
    latest: "2.3.0",
    versions: [
      { version: "2.3.0", date: "1 week ago", status: "stable", notes: "Better executive summary generation." },
      { version: "2.2.0", date: "2 months ago", status: "stable", notes: "Added 2x2 frameworks." },
    ],
    compatibility: [
      { runtime: "Claude 3.5+", status: "supported", detail: "Recommended." },
      { runtime: "Cursor", status: "supported", detail: "Verified." },
      { runtime: "Codex / GPT-4 class", status: "supported", detail: "Verified." },
      { runtime: "OpenClaw", status: "supported", detail: "Verified." },
      { runtime: "Hermes 2", status: "supported", detail: "Verified." },
      { runtime: "Grok 2", status: "supported", detail: "Verified." },
    ],
    dependencies: [],
    scopes: ["agent:upgrade", "feedback:write"],
    size: "108 KB",
    license: "MIT",
    examples: [
      { title: "Board memo", body: "Turns a 3-page brief into a 1-page MECE board memo with pyramid-principle structure." },
    ],
    metrics: [
      { label: "Structure score", value: "97%" },
      { label: "Executive readability", value: "+58%" },
    ],
  },
];

export function getPackage(id: string): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}
