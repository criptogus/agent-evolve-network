import { Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Presentation-only figures: the same 90-day network medians the comparison
// table cites (outcome fields recorded per execution — task completed, human
// intervention, rating, latency vs. baseline).
const SAK = "var(--primary)";
const BASELINE = "var(--chart-baseline)";

type Outcome = {
  metric: string;
  short: string;
  ungraded: number;
  sak: number;
  hint: string;
};

const OUTCOMES: Outcome[] = [
  {
    metric: "Task completed",
    short: "Completed",
    ungraded: 42,
    sak: 94,
    hint: "Executions that finished the job end-to-end",
  },
  {
    metric: "No human intervention",
    short: "No rescue",
    ungraded: 51,
    sak: 96,
    hint: "Runs that never needed a human to step in",
  },
  {
    metric: "Positive rating",
    short: "Thumbs up",
    ungraded: 38,
    sak: 91,
    hint: "Thumbs up from the agent's end user",
  },
  {
    metric: "First-try success",
    short: "First try",
    ungraded: 29,
    sak: 87,
    hint: "Completed without a retry loop",
  },
  {
    metric: "Under latency budget",
    short: "In budget",
    ungraded: 44,
    sak: 93,
    hint: "Finished inside the workspace baseline latency",
  },
];

type TooltipEntry = { dataKey?: string | number; value?: number | string; color?: string };

function OutcomeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const row = OUTCOMES.find((o) => o.short === label);
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      <div className="font-medium text-foreground">{row?.metric ?? label}</div>
      {row ? <div className="mt-0.5 text-muted-foreground">{row.hint}</div> : null}
      <ul className="mt-1.5 space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            {p.dataKey === "sak" ? "SAK · A-grade" : "Random skill"}:{" "}
            <span className="font-mono font-semibold text-foreground">{p.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;

function MetricTip({ label, tip }: { label: React.ReactNode; tip: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <UiTooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center gap-1">
            {label}
            <Info className="h-3 w-3 text-muted-foreground/70" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-balance bg-popover text-popover-foreground border-border shadow-elevated">
          {tip}
        </TooltipContent>
      </UiTooltip>
    </TooltipProvider>
  );
}

/**
 * Headline chart for the A-grade hero section: outcome metrics per execution
 * over the last 90 days, random skill vs. certified A-grade skill.
 */
export function OutcomeComparisonChart() {
  return (
    <figure className="mt-8 rounded-2xl border border-primary/30 bg-background p-5 shadow-elevated md:p-6">
      <figcaption className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground md:text-base">
            Outcome per execution — last 90 days
          </div>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground md:text-sm">
            Not pass rate: the outcome actually recorded on every production run on the SAK network.
            Same task, one random skill from the wild, one certified A-grade skill.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: BASELINE }} aria-hidden />
            Random skill
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: SAK }} aria-hidden />
            SAK · A-grade
          </span>
        </div>
      </figcaption>

      {/* Side-by-side columns — the three outcomes that matter most, read in
          one glance before the full chart. */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {(
          [
            {
              key: "ungraded",
              label: "Random skill",
              badge: "F · no proof",
              tone: "baseline",
              rows: [
                { k: "Completion rate", v: "42%", s: "of runs finish the task" },
                { k: "Human intervention", v: "49%", s: "of runs need a rescue" },
                { k: "Latency saved", v: "0s", s: "vs. workspace baseline" },
                { k: "Tokens saved", v: "0", s: "18,400 avg. per task" },
              ],
            },
            {
              key: "sak",
              label: "SAK · A-grade",
              badge: "A · certified",
              tone: "sak",
              rows: [
                { k: "Completion rate", v: "94%", s: "of runs finish the task" },
                { k: "Human intervention", v: "4%", s: "of runs need a rescue" },
                { k: "Latency saved", v: "−35.2s", s: "p95 42s → 6.8s" },
                { k: "Tokens saved", v: "−14,300", s: "4,100 avg. per task" },
              ],
            },
          ] as const
        ).map((col) => {
          const isSak = col.tone === "sak";
          return (
            <div
              key={col.key}
              className={`rounded-2xl border p-4 ${
                isSak
                  ? "border-primary/50 bg-primary/[0.04] shadow-elevated"
                  : "border-border bg-surface-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest ${
                    isSak ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: isSak ? SAK : BASELINE }}
                    aria-hidden
                  />
                  {col.label}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                    isSak
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {col.badge}
                </span>
              </div>
              <dl className="mt-3 divide-y divide-border/70">
                {col.rows.map((r) => (
                  <div key={r.k} className="flex items-baseline justify-between gap-3 py-2.5">
                    <div>
                      <dt className="text-sm font-medium text-foreground">{r.k}</dt>
                      <dd className="text-[11px] text-muted-foreground">{r.s}</dd>
                    </div>
                    <span
                      className={`font-mono text-xl font-semibold tabular-nums md:text-2xl ${
                        isSak ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {r.v}
                    </span>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      <div className="mt-4 h-72 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={OUTCOMES}
            margin={{ top: 18, right: 8, bottom: 0, left: -18 }}
            barCategoryGap="26%"
            barGap={4}
          >
            <CartesianGrid stroke="var(--grid-line)" vertical={false} />
            <XAxis dataKey="short" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <Tooltip
              content={<OutcomeTooltip />}
              cursor={{ fill: "var(--grid-line)", opacity: 0.4 }}
            />
            <Bar dataKey="ungraded" fill={BASELINE} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {OUTCOMES.map((o) => (
                <Cell key={o.metric} fill={BASELINE} />
              ))}
            </Bar>
            <Bar dataKey="sak" fill={SAK} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList
                dataKey="sak"
                position="top"
                formatter={(v: number) => `${v}%`}
                fill="var(--primary)"
                fontSize={11}
                fontFamily="var(--font-mono, monospace)"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { k: "+52 p.p.", v: "more tasks completed" },
          { k: "−92%", v: "human rescues needed" },
          { k: "2.4×", v: "more positive ratings" },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-border bg-surface-muted/40 p-3">
            <div className="font-mono text-lg font-semibold text-primary">{s.k}</div>
            <div className="text-xs text-muted-foreground">{s.v}</div>
          </div>
        ))}
      </div>

      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none font-medium text-foreground/80 hover:text-foreground">
          View chart data as a table
        </summary>
        <table className="mt-3 w-full border-collapse text-left">
          <caption className="mb-1 text-left font-medium text-foreground">
            Outcome per execution, last 90 days (%)
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th className="py-1 pr-2 font-medium">Outcome</th>
              <th className="py-1 pr-2 font-medium">Random skill</th>
              <th className="py-1 font-medium">SAK · A-grade</th>
            </tr>
          </thead>
          <tbody>
            {OUTCOMES.map((o) => (
              <tr key={o.metric} className="border-b border-border/50">
                <td className="py-1 pr-2">{o.metric}</td>
                <td className="py-1 pr-2 font-mono">{o.ungraded}%</td>
                <td className="py-1 font-mono">{o.sak}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
