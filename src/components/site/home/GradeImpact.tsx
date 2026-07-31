import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SakValueCharts } from "./SakValueCharts";
import { OutcomeComparisonChart, MetricTip } from "./OutcomeComparisonChart";

type Row = {
  metric: string;
  detail: string;
  tip: string;
  bad: string;
  good: string;
  delta: string;
  direction: "up" | "down";
};

const ROWS: Row[] = [
  {
    metric: "Task success rate",
    detail: "Real-world executions that complete without human rescue",
    tip: "Measured per execution on the SAK network: did the run reach the stated end-state with no human rewrite or restart?",
    bad: "42%",
    good: "94%",
    delta: "+124%",
    direction: "up",
  },
  {
    metric: "Prompt-injection resistance",
    detail: "% of adversarial attempts blocked by the skill",
    tip: "SkillForge runs a fixed adversarial harness (jailbreak, role-play, data-exfiltration probes) and records the block rate.",
    bad: "18%",
    good: "99.2%",
    delta: "+451%",
    direction: "up",
  },
  {
    metric: "Hallucination rate",
    detail: "Fabricated facts, tools or citations per 1k runs",
    tip: "Outputs are checked against a ground-truth oracle for invented facts, tools, URLs or citations.",
    bad: "31%",
    good: "1.4%",
    delta: "−95%",
    direction: "down",
  },
  {
    metric: "Avg. tokens per task",
    detail: "Wasted context = wasted money on every call",
    tip: "Total input + output tokens consumed to complete one representative task, averaged over the last 90 days.",
    bad: "18,400",
    good: "4,100",
    delta: "−78%",
    direction: "down",
  },
  {
    metric: "p95 latency",
    detail: "How long the slowest 5% of calls take",
    tip: "The 95th percentile wall-clock time for the skill to finish the task, including retries.",
    bad: "42s",
    good: "6.8s",
    delta: "−84%",
    direction: "down",
  },
  {
    metric: "Cost per 1,000 runs",
    detail: "Blended LLM + retry + human-in-the-loop cost",
    tip: "Blended cost of model tokens, retry loops and estimated human rescue time for 1,000 production runs.",
    bad: "$38.20",
    good: "$4.90",
    delta: "−87%",
    direction: "down",
  },
  {
    metric: "PII / secret leakage",
    detail: "Sensitive strings surfaced in outputs or logs",
    tip: "Detected by scanning outputs and logs for known synthetic secrets and PII markers during adversarial runs.",
    bad: "6.1%",
    good: "0.02%",
    delta: "−99.7%",
    direction: "down",
  },
  {
    metric: "Mean time to patch a CVE",
    detail: "From disclosure to a signed, verified release",
    tip: "Median hours from a published CVE affecting a dependency to a signed, re-tested release on the marketplace.",
    bad: "27 days",
    good: "under 24h",
    delta: "−96%",
    direction: "down",
  },
];

export function GradeImpact() {
  return (
    <section
      id="a-grade-difference"
      className="relative overflow-hidden border-b border-border bg-surface-muted/30 py-20 md:py-28"
    >
      {/* Spotlight treatment — this is the main sales argument. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-12rem] h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center chart-fade">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            The A-grade difference
          </span>
          <span className="ml-2 inline-flex items-center rounded-full border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Illustrative targets
          </span>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            A random skill vs. a SAK <span className="text-primary">A-grade</span> skill
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            The same task, two skills: one ungraded prompt from the wild, one certified A on
            SuperAgent Skill. Figures below are certification targets, illustrative of the gap the
            SAK pipeline is designed to produce — each one flips to a live, measured number as the
            paired-benchmark telemetry reaches sample-size thresholds.
          </p>
        </div>

        {/* Header cards */}
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-5 chart-slide-up chart-delay-100 opacity-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Ungraded skill
              </span>
              <span className="rounded-md border border-border px-2 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
                F · no proof
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Copy-pasted prompt, no adversarial testing, unsigned release.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-background p-5 shadow-elevated chart-slide-up chart-delay-200 opacity-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-primary">
                SAK A-grade skill
              </span>
              <span className="rounded-md border border-primary/50 bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                A · certified
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Adversarial harness passed, Ed25519-signed, re-tested daily by SkillForge.
            </p>
          </div>
        </div>

        {/* Headline outcome chart — the fastest read of the A-grade delta. */}
        <div className="chart-slide-up chart-delay-300 opacity-0">
          <OutcomeComparisonChart />
        </div>

        {/* Comparative charts — the value curve and the security gap */}
        <div className="chart-slide-up chart-delay-400 opacity-0">
          <SakValueCharts />
        </div>

        {/* Comparison table */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-background chart-slide-up chart-delay-500 opacity-0">
          <div className="hidden grid-cols-12 border-b border-border bg-surface-muted/60 px-5 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground md:grid">
            <div className="col-span-5">Metric</div>
            <div className="col-span-2 text-right">Ungraded</div>
            <div className="col-span-2 text-right">SAK · A</div>
            <div className="col-span-3 text-right">Difference</div>
          </div>
          <ul className="divide-y divide-border">
            {ROWS.map((row, idx) => (
              <li
                key={row.metric}
                className="grid grid-cols-2 gap-2 px-5 py-4 md:grid-cols-12 md:items-center md:gap-4 chart-fade"
                style={{ animationDelay: `${600 + idx * 60}ms` }}
              >
                <div className="col-span-2 md:col-span-5">
                  <div className="text-sm font-semibold text-foreground">
                    <MetricTip label={row.metric} tip={row.tip} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{row.detail}</div>
                </div>
                <div className="md:col-span-2 md:text-right">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground md:hidden">
                    Ungraded
                  </div>
                  <div className="font-mono text-base text-muted-foreground line-through decoration-destructive/60">
                    {row.bad}
                  </div>
                </div>
                <div className="md:col-span-2 md:text-right">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-primary md:hidden">
                    SAK · A
                  </div>
                  <div className="font-mono text-base font-semibold text-foreground">
                    {row.good}
                  </div>
                </div>
                <div className="col-span-2 md:col-span-3 md:text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-semibold ${
                      row.direction === "up"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {row.direction === "up" ? (
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {row.delta}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom summary */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
          {[
            { k: "2.2×", v: "more tasks completed per agent per day (target)" },
            { k: "$33/1k runs", v: "saved on LLM spend at the same volume" },
            { k: "300× fewer", v: "leaks & jailbreaks reaching production (target)" },
          ].map((s, idx) => (
            <div
              key={s.k}
              className="rounded-2xl border border-border bg-background p-5 text-center chart-slide-up chart-fade opacity-0"
              style={{ animationDelay: `${800 + idx * 100}ms` }}
            >
              <div className="font-mono text-2xl font-semibold text-primary">{s.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link
            to="/evaluation"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface-elevated px-4 font-medium text-foreground transition-colors hover:bg-accent"
          >
            How we measure it <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse A-grade skills <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {/* Contextual lead CTA — converts visitors convinced by the A-grade delta. */}
        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-primary/30 bg-primary/[0.03] p-6 text-center shadow-elevated md:p-8">
          <h3 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
            Quer ver o mesmo delta no seu agente?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe pass rate, intervenção humana, latência e ROI por skill no painel SAK. Entre
            na fila de acesso ou veja seus números agora.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/admin/roi"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ver meu ROI no admin <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-5 font-medium text-foreground transition-colors hover:bg-accent"
            >
              Solicitar acesso
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Acesso ao ROI requer conta SAK. Novos usuários começam no plano Free.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Illustrative certification targets, not yet measured medians. Comparative numbers are
          produced by our paired adversarial benchmark (same suite, certified skill vs. raw baseline
          prompt, Wilson 95% lower bounds, Ed25519-signed results) and replace these figures as
          sample thresholds are met — every skill page shows its live numbers today.
        </p>
      </div>
    </section>
  );
}
