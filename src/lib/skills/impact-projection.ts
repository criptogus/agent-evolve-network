/**
 * Impact projection — turns an evaluation score into the same outcome metrics
 * we publish on the landing page, so a client who submits a skill immediately
 * sees "what does fixing this actually buy me?".
 *
 * Pure module (no I/O): safe to import from server functions, MCP tools and UI.
 *
 * Anchors come from the public SAK network benchmark shown on the landing page:
 * an un-reviewed / low-grade skill vs an A-grade skill. We interpolate between
 * those two anchors using the evaluation score, so the numbers are an
 * *estimate* for this skill, never a promise.
 */

export type ImpactDirection = "up" | "down";

type Anchor = {
  id: string;
  metric: string;
  detail: string;
  unit: "percent" | "count" | "seconds" | "usd" | "days";
  /** value at a low-grade skill (anchor score LOW_SCORE) */
  low: number;
  /** value at an A-grade skill (anchor score HIGH_SCORE) */
  high: number;
  direction: ImpactDirection;
  /** ratio metrics interpolate geometrically, rates linearly */
  scale: "linear" | "ratio";
};

const LOW_SCORE = 40;
const HIGH_SCORE = 95;

const ANCHORS: Anchor[] = [
  {
    id: "task_success_rate",
    metric: "Task success rate",
    detail: "Real-world executions that complete without human rescue",
    unit: "percent",
    low: 42,
    high: 94,
    direction: "up",
    scale: "linear",
  },
  {
    id: "injection_resistance",
    metric: "Prompt-injection resistance",
    detail: "% of adversarial attempts blocked by the skill",
    unit: "percent",
    low: 18,
    high: 99.2,
    direction: "up",
    scale: "linear",
  },
  {
    id: "hallucination_rate",
    metric: "Hallucination rate",
    detail: "Fabricated facts, tools or citations per 1k runs",
    unit: "percent",
    low: 31,
    high: 1.4,
    direction: "down",
    scale: "ratio",
  },
  {
    id: "avg_tokens",
    metric: "Avg. tokens per task",
    detail: "Wasted context = wasted money on every call",
    unit: "count",
    low: 18400,
    high: 4100,
    direction: "down",
    scale: "ratio",
  },
  {
    id: "p95_latency",
    metric: "p95 latency",
    detail: "How long the slowest 5% of calls take",
    unit: "seconds",
    low: 42,
    high: 6.8,
    direction: "down",
    scale: "ratio",
  },
  {
    id: "cost_per_1k",
    metric: "Cost per 1,000 runs",
    detail: "Blended LLM + retry + human-in-the-loop cost",
    unit: "usd",
    low: 38.2,
    high: 4.9,
    direction: "down",
    scale: "ratio",
  },
  {
    id: "pii_leakage",
    metric: "PII / secret leakage",
    detail: "Sensitive strings surfaced in outputs or logs",
    unit: "percent",
    low: 6.1,
    high: 0.02,
    direction: "down",
    scale: "ratio",
  },
];

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function interpolate(a: Anchor, score: number) {
  const t = clamp01((score - LOW_SCORE) / (HIGH_SCORE - LOW_SCORE));
  if (a.scale === "ratio") {
    // geometric: smooth, never crosses zero
    return a.low * Math.pow(a.high / a.low, t);
  }
  return a.low + (a.high - a.low) * t;
}

export function formatMetric(unit: Anchor["unit"], v: number): string {
  switch (unit) {
    case "percent":
      return `${v >= 10 ? v.toFixed(0) : v.toFixed(v < 1 ? 2 : 1)}%`;
    case "count":
      return Math.round(v).toLocaleString("en-US");
    case "seconds":
      return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}s`;
    case "usd":
      return `$${v.toFixed(2)}`;
    case "days":
      return v < 1 ? "under 24h" : `${Math.round(v)} days`;
  }
}

export type ImpactRow = {
  id: string;
  metric: string;
  detail: string;
  unit: Anchor["unit"];
  direction: ImpactDirection;
  currentValue: number;
  projectedValue: number;
  current: string;
  projected: string;
  /** relative change, signed, in % (positive = improvement) */
  deltaPct: number;
  delta: string;
};

export type ImpactProjection = {
  currentScore: number;
  targetScore: number;
  currentGrade: string;
  targetGrade: string;
  rows: ImpactRow[];
  /** business framing at the assumed monthly run volume */
  assumptions: { runsPerMonth: number };
  savings: {
    monthlyUsd: number;
    annualUsd: number;
    rescuedRunsPerMonth: number;
    tokensSavedPerMonth: number;
  };
  headline: string;
  confidence: "low" | "medium" | "high";
  disclaimer: string;
};

export function gradeLetter(score: number): string {
  if (score >= 90) return "A";
  if (score >= 78) return "B";
  if (score >= 62) return "C";
  if (score >= 45) return "D";
  return "F";
}

export type ImpactInput = {
  /** 0-100 evaluation / verdict score for the skill as submitted */
  score: number;
  /** realistic ceiling for this doc class (defaults to 92) */
  targetScore?: number;
  /** monthly executions assumption for the money framing */
  runsPerMonth?: number;
  /** how many concrete improvement actions the engine anchored to evidence */
  actionsCount?: number;
  /** true when the semantic pass ran (raises confidence) */
  semanticPass?: boolean;
};

export function projectImpact(input: ImpactInput): ImpactProjection {
  const current = Math.max(0, Math.min(100, input.score));
  const target = Math.max(current, Math.min(100, input.targetScore ?? 92));
  const runsPerMonth = input.runsPerMonth ?? 10_000;

  const rows: ImpactRow[] = ANCHORS.map((a) => {
    const cv = interpolate(a, current);
    const pv = interpolate(a, target);
    const rel = cv === 0 ? 0 : ((pv - cv) / cv) * 100;
    const deltaPct = a.direction === "up" ? rel : rel; // signed vs current
    return {
      id: a.id,
      metric: a.metric,
      detail: a.detail,
      unit: a.unit,
      direction: a.direction,
      currentValue: Math.round(cv * 100) / 100,
      projectedValue: Math.round(pv * 100) / 100,
      current: formatMetric(a.unit, cv),
      projected: formatMetric(a.unit, pv),
      deltaPct: Math.round(deltaPct * 10) / 10,
      delta: `${deltaPct > 0 ? "+" : deltaPct < 0 ? "−" : ""}${Math.abs(Math.round(deltaPct))}%`,
    };
  });

  const cost = rows.find((r) => r.id === "cost_per_1k")!;
  const success = rows.find((r) => r.id === "task_success_rate")!;
  const tokens = rows.find((r) => r.id === "avg_tokens")!;

  const monthlyUsd =
    ((cost.currentValue - cost.projectedValue) * runsPerMonth) / 1000;
  const rescuedRunsPerMonth =
    ((success.projectedValue - success.currentValue) / 100) * runsPerMonth;
  const tokensSavedPerMonth =
    (tokens.currentValue - tokens.projectedValue) * runsPerMonth;

  const confidence: ImpactProjection["confidence"] =
    input.semanticPass && (input.actionsCount ?? 0) >= 2
      ? "high"
      : input.semanticPass || (input.actionsCount ?? 0) >= 1
        ? "medium"
        : "low";

  return {
    currentScore: Math.round(current),
    targetScore: Math.round(target),
    currentGrade: gradeLetter(current),
    targetGrade: gradeLetter(target),
    rows,
    assumptions: { runsPerMonth },
    savings: {
      monthlyUsd: Math.round(monthlyUsd * 100) / 100,
      annualUsd: Math.round(monthlyUsd * 12 * 100) / 100,
      rescuedRunsPerMonth: Math.round(rescuedRunsPerMonth),
      tokensSavedPerMonth: Math.round(tokensSavedPerMonth),
    },
    headline:
      target - current < 2
        ? `Already at grade ${gradeLetter(current)} (${Math.round(current)}/100) — projected gains are marginal.`
        : `Closing the gap from ${gradeLetter(current)} (${Math.round(current)}/100) to ${gradeLetter(target)} (${Math.round(
            target,
          )}/100) projects ~${Math.round(success.projectedValue - success.currentValue)}pp more task success and ~$${Math.round(
            monthlyUsd,
          ).toLocaleString("en-US")}/month saved at ${runsPerMonth.toLocaleString("en-US")} runs.`,
    disclaimer:
      "Projection, not a guarantee: values are interpolated between the published SAK network anchors (low-grade vs A-grade skills) using this skill's evaluation score. Your real numbers depend on model, traffic mix and how many improvement actions you apply — telemetry from your executions replaces these estimates once the skill runs on the network.",
  };
}

/** Compact text version for MCP / CLI responses. */
export function projectionToText(p: ImpactProjection): string {
  const lines = [
    `IMPACT PROJECTION — ${p.currentGrade} (${p.currentScore}) → ${p.targetGrade} (${p.targetScore})`,
    p.headline,
    "",
    ...p.rows.map((r) => `• ${r.metric}: ${r.current} → ${r.projected} (${r.delta})`),
    "",
    `Assumes ${p.assumptions.runsPerMonth.toLocaleString("en-US")} runs/month · confidence: ${p.confidence}`,
    p.disclaimer,
  ];
  return lines.join("\n");
}
