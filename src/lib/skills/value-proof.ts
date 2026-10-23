/**
 * Value proof — the "did it actually get better, and what is that worth?"
 * layer for MCP responses.
 *
 * Impact *projection* answers "what would fixing this buy me?". Value proof
 * answers the question the human paying the bill asks after the agent
 * finished editing: "prove the edit helped". It takes a BEFORE score and an
 * AFTER score for the same document and renders the realized movement on the
 * same public SAK outcome metrics, plus money/time framing and a
 * copy-pasteable report the piloting agent can hand to its human.
 *
 * Pure module (no I/O): safe from server functions, MCP tools and UI.
 */

import { projectImpact, gradeLetter, type ImpactRow } from "@/lib/skills/impact-projection";

export type ValueProofRow = {
  id: string;
  metric: string;
  detail: string;
  before: string;
  after: string;
  change: string;
  /** signed relative change in % (sign is raw vs before, not "goodness") */
  changePct: number;
  improved: boolean;
};

export type ValueProof = {
  document: { name: string; type: string };
  before: { score: number; grade: string };
  after: { score: number; grade: string };
  score_change: number;
  grade_changed: boolean;
  improved: boolean;
  rows: ValueProofRow[];
  business_case: {
    runs_per_month: number;
    monthly_usd_saved: number;
    annual_usd_saved: number;
    rescued_runs_per_month: number;
    tokens_saved_per_month: number;
    engineer_hours_saved_per_month: number;
  };
  headline: string;
  /** Markdown block the piloting agent should show to the human. */
  human_report: string;
  /** One-line message for chat / Slack / commit body. */
  one_liner: string;
  disclaimer: string;
};

const HOURS_PER_RESCUE = 0.25; // 15 min of human babysitting per rescued run

function fmtUsd(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function toProofRow(r: ImpactRow): ValueProofRow {
  const improved =
    r.direction === "up" ? r.projectedValue > r.currentValue : r.projectedValue < r.currentValue;
  return {
    id: r.id,
    metric: r.metric,
    detail: r.detail,
    before: r.current,
    after: r.projected,
    change: r.delta,
    changePct: r.deltaPct,
    improved,
  };
}

export function buildValueProof(input: {
  name: string;
  type: string;
  beforeScore: number;
  afterScore: number;
  runsPerMonth?: number;
  actionsApplied?: number;
  semanticPass?: boolean;
  /** Optional score timeline (oldest → newest) for the report footer. */
  timeline?: Array<{ at?: string | null; overall: number; grade?: string | null }>;
}): ValueProof {
  const before = Math.max(0, Math.min(100, input.beforeScore));
  const after = Math.max(0, Math.min(100, input.afterScore));
  const runsPerMonth = input.runsPerMonth ?? 10_000;
  const improved = after > before;

  // Interpolate between the two REAL scores: current = before, target = after.
  const p = projectImpact({
    score: Math.min(before, after),
    targetScore: Math.max(before, after),
    runsPerMonth,
    actionsCount: input.actionsApplied,
    semanticPass: input.semanticPass,
  });

  const rows = p.rows.map(toProofRow).map((row) =>
    improved
      ? row
      : // regression: swap before/after so the table still reads chronologically
        { ...row, before: row.after, after: row.before, improved: false },
  );

  const sign = improved ? 1 : -1;
  const monthly = sign * p.savings.monthlyUsd;
  const rescued = sign * p.savings.rescuedRunsPerMonth;
  const tokens = sign * p.savings.tokensSavedPerMonth;
  const hours = Math.round(rescued * HOURS_PER_RESCUE);

  const beforeGrade = gradeLetter(before);
  const afterGrade = gradeLetter(after);
  const gradeChanged = beforeGrade !== afterGrade;

  const headline = improved
    ? `${input.name}: ${beforeGrade} (${Math.round(before)}) → ${afterGrade} (${Math.round(after)}) — +${Math.round(
        after - before,
      )} points, ${fmtUsd(monthly)}/month of avoidable spend removed at ${runsPerMonth.toLocaleString("en-US")} runs/month.`
    : after === before
      ? `${input.name}: score unchanged at ${afterGrade} (${Math.round(after)}) — the edit did not move the engine. Apply the remaining top_actions before claiming a win.`
      : `${input.name}: score REGRESSED ${beforeGrade} (${Math.round(before)}) → ${afterGrade} (${Math.round(
          after,
        )}). Revert or fix before shipping — this edit costs ~${fmtUsd(Math.abs(monthly))}/month.`;

  const successRow = rows.find((r) => r.id === "task_success_rate");
  const injectionRow = rows.find((r) => r.id === "injection_resistance");
  const costRow = rows.find((r) => r.id === "cost_per_1k");

  const human_report = [
    `## Skill upgraded: ${input.name} (${input.type})`,
    "",
    `**Trust Score: ${Math.round(before)} → ${Math.round(after)} (grade ${beforeGrade} → ${afterGrade})**`,
    "",
    "| Outcome metric | Before | After | Change |",
    "| --- | --- | --- | --- |",
    ...rows.map((r) => `| ${r.metric} | ${r.before} | ${r.after} | ${r.change} |`),
    "",
    "**What this is worth**",
    `- ${improved ? "Saves" : "Costs"} ~${fmtUsd(Math.abs(monthly))}/month (${fmtUsd(
      Math.abs(monthly * 12),
    )}/year) at ${runsPerMonth.toLocaleString("en-US")} runs/month`,
    `- ${Math.abs(Math.round(rescued)).toLocaleString("en-US")} runs/month ${
      improved ? "no longer need" : "now need"
    } a human rescue (~${Math.abs(hours)} engineer-hours)`,
    `- ${Math.abs(Math.round(tokens)).toLocaleString("en-US")} tokens/month ${improved ? "saved" : "wasted"}`,
    ...(successRow ? [`- Task success rate ${successRow.before} → ${successRow.after}`] : []),
    ...(injectionRow ? [`- Prompt-injection resistance ${injectionRow.before} → ${injectionRow.after}`] : []),
    ...(costRow ? [`- Cost per 1,000 runs ${costRow.before} → ${costRow.after}`] : []),
    ...(input.timeline && input.timeline.length > 1
      ? [
          "",
          "**Score history**",
          input.timeline
            .map((t) => `${Math.round(t.overall)}${t.grade ? ` (${t.grade})` : ""}`)
            .join(" → "),
        ]
      : []),
    "",
    `_${p.disclaimer}_`,
  ].join("\n");

  const one_liner = improved
    ? `${input.name} went from grade ${beforeGrade} (${Math.round(before)}) to ${afterGrade} (${Math.round(
        after,
      )}) — projected ${fmtUsd(monthly)}/month saved and ${Math.round(rescued).toLocaleString("en-US")} fewer human rescues per month.`
    : headline;

  return {
    document: { name: input.name, type: input.type },
    before: { score: Math.round(before), grade: beforeGrade },
    after: { score: Math.round(after), grade: afterGrade },
    score_change: Math.round((after - before) * 10) / 10,
    grade_changed: gradeChanged,
    improved,
    rows,
    business_case: {
      runs_per_month: runsPerMonth,
      monthly_usd_saved: Math.round(monthly * 100) / 100,
      annual_usd_saved: Math.round(monthly * 12 * 100) / 100,
      rescued_runs_per_month: Math.round(rescued),
      tokens_saved_per_month: Math.round(tokens),
      engineer_hours_saved_per_month: hours,
    },
    headline,
    human_report,
    one_liner,
    disclaimer: p.disclaimer,
  };
}
