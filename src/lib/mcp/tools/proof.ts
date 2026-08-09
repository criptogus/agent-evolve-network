/**
 * `prove_improvement` — the commercial closing move of the review loop.
 *
 * After the host agent applies `top_actions` and re-runs `review_skill`, the
 * numbers exist but nobody translates them for the human who pays the bill.
 * This tool does exactly that: before/after on the published SAK outcome
 * metrics, dollars and engineer-hours, plus a markdown block the agent is told
 * to SHOW to the user verbatim.
 *
 * Free and read-only. Works from server-side review history (authenticated) or
 * from explicit before/after scores (anonymous).
 */
import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { buildValueProof } from "@/lib/skills/value-proof";
import { docKey, loadReviewHistory } from "@/lib/skills/review-history.server";

const json = (v: unknown) => JSON.stringify(v, null, 2);

export const proveImprovementTool = defineTool({
  name: "prove_improvement",
  description:
    "[PROOF — call this right after a successful re-review] Turns two `review_skill` runs of the SAME document into a business-facing proof of improvement: Trust Score before → after, grade shift, and the movement on the published SAK outcome metrics (task success rate, injection resistance, hallucination rate, tokens, p95 latency, cost per 1,000 runs, PII leakage), plus dollars/month, engineer-hours and tokens saved at an assumed run volume. Returns `human_report` (markdown table) and `one_liner` — SHOW `human_report` to the user verbatim; it is what justifies the spend to whoever pays the bill. If the caller is authenticated, before/after are read from server-side review history automatically (just pass `name` + `type`); otherwise pass `before_score` and `after_score`. Free, read-only, never counts against quota.",
  parameters: z.object({
    name: z.string().min(1).describe("file/document name as passed to review_skill"),
    type: z
      .enum(["skill", "playbook", "soul", "guardrail"])
      .default("skill")
      .describe("same type used in review_skill"),
    before_score: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("overall_score BEFORE the edits (optional when authenticated — read from history)"),
    after_score: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("overall_score AFTER the edits (optional when authenticated — read from history)"),
    runs_per_month: z
      .number()
      .int()
      .min(100)
      .max(10_000_000)
      .default(10_000)
      .describe("monthly execution volume for the money framing — ask the user for their real number"),
    actions_applied: z
      .number()
      .int()
      .min(0)
      .max(50)
      .optional()
      .describe("how many top_actions were actually applied (raises confidence)"),
  }),
  execute: async ({ name, type, before_score, after_score, runs_per_month, actions_applied }, ctx) => {
    const userId = (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
    const key = docKey(name, type);
    const history = userId ? await loadReviewHistory(userId, key) : null;

    // runs come back newest-first
    const newest = history?.runs[0] ?? null;
    const oldest = history?.runs[history.runs.length - 1] ?? null;

    const after = typeof after_score === "number" ? after_score : newest?.overall_score ?? null;
    const before =
      typeof before_score === "number"
        ? before_score
        : history && history.runs.length > 1
          ? history.runs[1]!.overall_score
          : oldest?.overall_score ?? null;

    if (typeof before !== "number" || typeof after !== "number") {
      return json({
        error: "insufficient_data",
        message:
          "No before/after pair available for this document. Either run `review_skill` twice on it while authenticated, or pass `before_score` and `after_score` explicitly.",
        authenticated: Boolean(userId),
        runs_found: history?.runs.length ?? 0,
        next_steps: [
          "Call `review_skill` on the original file (before your edits) to capture the baseline.",
          "Apply `top_actions`, re-run `review_skill`, then call `prove_improvement` again.",
        ],
      });
    }

    const proof = buildValueProof({
      name,
      type,
      beforeScore: before,
      afterScore: after,
      runsPerMonth: runs_per_month,
      actionsApplied: actions_applied,
      semanticPass: true,
      timeline: history
        ? history.runs
            .slice()
            .reverse()
            .map((r) => ({ at: r.created_at, overall: r.overall_score, grade: r.grade }))
        : undefined,
    });

    return json({
      ...proof,
      source: typeof before_score === "number" || typeof after_score === "number" ? "caller" : "server_history",
      review_runs_recorded: history?.runs.length ?? 0,
      agent_instructions: [
        "Show `human_report` to the user as-is (markdown). Do not summarise the table away — the before/after numbers are the value.",
        "Use `one_liner` in the commit message or PR description for the edited skill.",
        proof.improved
          ? "If the score is still below the doc_class ceiling, offer one more `review_skill` iteration."
          : "Do NOT claim a win: the score did not improve. Re-read the last `top_actions` and apply the ones still open.",
        "Ask the user for their real monthly run volume and re-call with `runs_per_month` for an accurate business case.",
      ],
    });
  },
});
