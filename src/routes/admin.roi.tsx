import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getWorkspaceRoi,
  getSkillUplift,
  listExperiments,
  listExecutionOutcomes,
} from "@/lib/experiments/uplift.functions";


export const Route = createFileRoute("/admin/roi")({
  head: () => ({
    meta: [
      { title: "ROI & Uplift by Customer — Admin" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Admin dashboard proving value: counterfactual skill on/off uplift and aggregated ROI per workspace.",
      },
    ],
  }),
  component: AdminRoiPage,
});

const RANGES = [7, 30, 90] as const;

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function AdminRoiPage() {
  const [days, setDays] = useState<number>(30);
  const [slug, setSlug] = useState("");
  const [querySlug, setQuerySlug] = useState("");
  const [onlyWithOutcome, setOnlyWithOutcome] = useState(false);

  const fetchRoi = useServerFn(getWorkspaceRoi);
  const fetchUplift = useServerFn(getSkillUplift);
  const fetchExperiments = useServerFn(listExperiments);
  const fetchOutcomes = useServerFn(listExecutionOutcomes);

  const roi = useQuery({
    queryKey: ["admin-roi", days],
    queryFn: () => fetchRoi({ data: { days } }),
  });
  const experiments = useQuery({
    queryKey: ["admin-experiments"],
    queryFn: () => fetchExperiments(),
  });
  const uplift = useQuery({
    queryKey: ["admin-uplift", querySlug, days],
    queryFn: () => fetchUplift({ data: { slug: querySlug, days } }),
    enabled: querySlug.length > 0,
  });
  const outcomes = useQuery({
    queryKey: ["admin-outcomes", days, querySlug, onlyWithOutcome],
    queryFn: () =>
      fetchOutcomes({
        data: {
          days,
          limit: 50,
          slug: querySlug || undefined,
          onlyWithOutcome,
        },
      }),
  });


  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">ROI &amp; Uplift by Customer</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Customer proof of value: counterfactual uplift (skill on vs. off) and
            aggregated results by anonymized workspace. Empty until executions arrive with
            outcome data (<code>task_completed</code>, <code>arm</code>).
          </p>
          <div className="flex gap-2 pt-2">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  days === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {r} days
              </button>
            ))}
          </div>
        </header>

        {/* Totals */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roi.data
            ? [
                { label: "Executions", value: roi.data.totals.executions.toLocaleString("en-US") },
                {
                  label: "Completion rate (network)",
                  value: pct(roi.data.totals.network_completion_rate),
                },
                { label: "Agent hours saved", value: `${roi.data.totals.hours_saved}h` },
                {
                  label: "Guardrail blocks",
                  value: roi.data.totals.guardrail_blocks.toLocaleString("en-US"),
                },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-border bg-card p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{c.value}</div>
                </div>
              ))
            : null}
        </section>

        {/* Uplift lookup */}
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Counterfactual Uplift by Skill</h2>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuerySlug(slug.trim());
            }}
          >
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="package slug, e.g. code-reviewer"
              className="min-w-[16rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Measure
            </button>
          </form>

          {uplift.isLoading && querySlug ? (
            <p className="text-sm text-muted-foreground">Calculating…</p>
          ) : null}
          {uplift.data ? (
            uplift.data.has_control_arm ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat
                    label="Control (skill off)"
                    value={pct(uplift.data.completion.control_rate)}
                    sub={`n=${uplift.data.completion.n_control}`}
                  />
                  <Stat
                    label="Treatment (skill on)"
                    value={pct(uplift.data.completion.treatment_rate)}
                    sub={`n=${uplift.data.completion.n_treatment}`}
                  />
                  <Stat
                    label="Absolute uplift"
                    value={`${uplift.data.completion.absolute_uplift >= 0 ? "+" : ""}${(
                      uplift.data.completion.absolute_uplift * 100
                    ).toFixed(1)} p.p.`}
                    sub={`95% CI [${(uplift.data.completion.ci_low * 100).toFixed(1)}, ${(
                      uplift.data.completion.ci_high * 100
                    ).toFixed(1)}] · p=${uplift.data.completion.p_value}`}
                  />
                </div>
                <p className="text-sm">
                  {uplift.data.completion.significant ? (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Statistically significant
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Not yet significant (needs more executions per arm)
                    </span>
                  )}{" "}
                  · autonomy (no human intervention):{" "}
                  {(uplift.data.autonomy.absolute_uplift * 100).toFixed(1)} p.p.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No control arm for <code>{uplift.data.slug}</code> in the last{" "}
                {uplift.data.window_days} days. Configure an experiment and report executions with{" "}
                <code>arm</code>.
              </p>
            )
          ) : null}
        </section>

        {/* Per-execution outcome */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Outcome per Execution</h2>
              <p className="text-sm text-muted-foreground">
                Value beyond pass rate: task completed, human intervention, and latency
                saved vs. baseline, execution by execution
                {querySlug ? (
                  <>
                    {" "}
                    (filtered by <code>{querySlug}</code>)
                  </>
                ) : null}
                .
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyWithOutcome}
                onChange={(e) => setOnlyWithOutcome(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Only with reported outcome
            </label>
          </div>

          {outcomes.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Outcome coverage"
                value={pct(outcomes.data.summary.outcome_coverage)}
                sub={`${outcomes.data.summary.with_outcome}/${outcomes.data.summary.rows} executions`}
              />
              <Stat
                label="Tasks completed"
                value={pct(outcomes.data.summary.completion_rate)}
                sub="among executions with outcome"
              />
              <Stat
                label="Human intervention"
                value={pct(outcomes.data.summary.intervention_rate)}
                sub={`👍 ${outcomes.data.summary.thumbs_up} · 👎 ${outcomes.data.summary.thumbs_down}`}
              />
              <Stat
                label="Latency saved"
                value={`${(outcomes.data.summary.latency_saved_ms / 1000).toFixed(1)}s`}
                sub={`average ${outcomes.data.summary.avg_latency_saved_ms} ms/execution`}
              />
            </div>
          ) : null}

          {outcomes.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading executions…</p>
          ) : null}
          {outcomes.error ? (
            <p className="text-sm text-destructive">Failed to load (admin only).</p>
          ) : null}

          {outcomes.data?.executions.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>When</Th>
                    <Th>Package</Th>
                    <Th>Arm</Th>
                    <Th>Exec</Th>
                    <Th>Task completed</Th>
                    <Th>Intervention</Th>
                    <Th>Latency</Th>
                    <Th>Latency saved</Th>
                    <Th>Tokens saved</Th>
                    <Th>Rating</Th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.data.executions.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <Td className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("en-US")}
                      </Td>
                      <Td className="font-mono text-xs">
                        {e.package_slug}
                        {e.version ? `@${e.version}` : ""}
                      </Td>
                      <Td className="text-xs">{e.arm ?? "—"}</Td>
                      <Td>{e.success ? "ok" : (e.error_kind ?? "error")}</Td>
                      <Td>{tri(e.task_completed)}</Td>
                      <Td>{tri(e.human_intervention)}</Td>
                      <Td>{e.latency_ms != null ? `${e.latency_ms} ms` : "—"}</Td>
                      <Td
                        className={
                          e.latency_saved_ms == null
                            ? ""
                            : e.latency_saved_ms >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                        }
                      >
                        {e.latency_saved_ms != null ? `${e.latency_saved_ms} ms` : "—"}
                      </Td>
                      <Td>
                        {e.tokens_saved != null
                          ? e.tokens_saved.toLocaleString("en-US")
                          : "—"}
                      </Td>
                      <Td>{e.user_rating === 1 ? "👍" : e.user_rating === -1 ? "👎" : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !outcomes.isLoading ? (
            <p className="text-sm text-muted-foreground">
              No executions{onlyWithOutcome ? " with reported outcome" : ""} in this period.
            </p>
          ) : null}
        </section>

        {/* Experiments */}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Experiments</h2>
          {experiments.data?.experiments?.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>Package</Th>
                    <Th>Key</Th>
                    <Th>Hypothesis</Th>
                    <Th>Control</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.data.experiments.map((e: any) => (
                    <tr key={`${e.package_slug}:${e.key}`} className="border-t border-border">
                      <Td>{e.package_slug}</Td>
                      <Td>{e.key}</Td>
                      <Td className="max-w-sm truncate">{e.hypothesis ?? "—"}</Td>
                      <Td>{pct(Number(e.control_share ?? 0))}</Td>
                      <Td>{e.status}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No experiments registered yet.
            </p>
          )}
        </section>

        {/* Per-workspace ROI */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">ROI by Workspace</h2>
          {roi.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {roi.error ? (
            <p className="text-sm text-destructive">Failed to load (admin only).</p>
          ) : null}
          {roi.data?.workspaces.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>Workspace</Th>
                    <Th>Executions</Th>
                    <Th>Completion</Th>
                    <Th>Human intervention</Th>
                    <Th>Hours saved</Th>
                    <Th>Tokens saved</Th>
                    <Th>Guardrails</Th>
                    <Th>👍/👎</Th>
                    <Th>Packages</Th>
                  </tr>
                </thead>
                <tbody>
                  {roi.data.workspaces.map((w) => (
                    <tr key={w.workspace_hash} className="border-t border-border">
                      <Td className="font-mono text-xs">{w.workspace_hash.slice(0, 12)}</Td>
                      <Td>{w.executions.toLocaleString("en-US")}</Td>
                      <Td>{pct(w.completion_rate)}</Td>
                      <Td>{pct(w.intervention_rate)}</Td>
                      <Td>{w.hours_saved}h</Td>
                      <Td>{w.tokens_saved.toLocaleString("en-US")}</Td>
                      <Td>{w.guardrail_blocks}</Td>
                      <Td>
                        {w.thumbs_up}/{w.thumbs_down}
                      </Td>
                      <Td>{w.packages_used}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !roi.isLoading ? (
            <p className="text-sm text-muted-foreground">
              No executions with outcome data in this period.
            </p>
          ) : null}
        </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

function tri(v: boolean | null) {
  if (v === true) return <span className="text-emerald-600 dark:text-emerald-400">yes</span>;
  if (v === false) return <span className="text-destructive">no</span>;
  return <span className="text-muted-foreground">—</span>;
}
