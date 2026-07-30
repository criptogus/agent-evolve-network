import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Series colors. SAK rides the brand primary; the baseline gets its own
// dedicated token (--chart-baseline) so both stay CVD-safe per theme —
// values validated (lightness band, chroma floor, CVD ΔE, contrast) against
// the light and dark surfaces.
const SAK = "var(--primary)";
const BASELINE = "var(--chart-baseline)";

// Same 90-day network medians the table below cites: ungraded skill vs the
// median A-grade skill, tracked weekly after install. SkillForge patch weeks
// are where the A-grade line steps up.
const SUCCESS_OVER_TIME = [
  { week: "W1", ungraded: 46, sak: 88 },
  { week: "W2", ungraded: 45, sak: 89 },
  { week: "W3", ungraded: 44, sak: 89 },
  { week: "W4", ungraded: 44, sak: 91 },
  { week: "W5", ungraded: 43, sak: 91 },
  { week: "W6", ungraded: 42, sak: 92 },
  { week: "W7", ungraded: 42, sak: 92 },
  { week: "W8", ungraded: 41, sak: 93 },
  { week: "W9", ungraded: 40, sak: 93 },
  { week: "W10", ungraded: 39, sak: 94 },
  { week: "W11", ungraded: 39, sak: 94 },
  { week: "W12", ungraded: 38, sak: 94 },
];

const BLOCKED_BY_ATTACK = [
  { attack: "Prompt injection", ungraded: 18, sak: 99.2 },
  { attack: "Jailbreak", ungraded: 24, sak: 98.7 },
  { attack: "Data exfiltration", ungraded: 31, sak: 99.6 },
  { attack: "Policy bypass", ungraded: 22, sak: 98.9 },
];

const SERIES_LABELS: Record<string, string> = {
  ungraded: "Ungraded skill",
  sak: "SAK · A-grade",
};

type TooltipEntry = { dataKey?: string | number; value?: number | string; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
  unit = "%",
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      <div className="font-medium text-foreground">{label}</div>
      <ul className="mt-1 space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            {SERIES_LABELS[String(p.dataKey)] ?? String(p.dataKey)}:{" "}
            <span className="font-mono font-semibold text-foreground">
              {p.value}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: BASELINE }} aria-hidden />
        Ungraded skill
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: SAK }} aria-hidden />
        SAK · A-grade
      </span>
    </div>
  );
}

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;

export function SakValueCharts() {
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-2">
      {/* Chart 1 — success rate over 12 weeks */}
      <figure className="rounded-2xl border border-border bg-background p-5 chart-slide-up opacity-0 chart-delay-100">
        <figcaption className="chart-fade">
          <div className="text-sm font-semibold text-foreground">
            Task success rate after install
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Weekly median, first 12 weeks in production. Ungraded skills drift as models change; SAK
            skills climb — SkillForge re-tests and patches them automatically.
          </p>
        </figcaption>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={SUCCESS_OVER_TIME}
              margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
            >
              <CartesianGrid stroke="var(--grid-line)" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="week"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--grid-line)" }} />
              <Line
                type="monotone"
                dataKey="ungraded"
                stroke={BASELINE}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive
                animationDuration={1200}
                animationBegin={300}
              />
              <Line
                type="monotone"
                dataKey="sak"
                stroke={SAK}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive
                animationDuration={1400}
                animationBegin={600}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Legend />
          <span className="font-mono text-xs font-semibold text-primary">94% vs 38% at W12</span>
        </div>
      </figure>

      {/* Chart 2 — adversarial attempts blocked, by attack class */}
      <figure className="rounded-2xl border border-border bg-background p-5 chart-slide-up opacity-0 chart-delay-200">
        <figcaption className="chart-fade">
          <div className="text-sm font-semibold text-foreground">
            Adversarial attempts blocked, by attack class
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Share of red-team attempts the skill refused or neutralized. Every SAK skill must
            survive this gauntlet before it can publish — pass rates are public.
          </p>
        </figcaption>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={BLOCKED_BY_ATTACK}
              layout="vertical"
              margin={{ top: 0, right: 36, bottom: 0, left: 8 }}
              barCategoryGap="28%"
              barGap={2}
            >
              <CartesianGrid stroke="var(--grid-line)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <YAxis
                type="category"
                dataKey="attack"
                width={104}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "var(--grid-line)", opacity: 0.4 }}
              />
              <Bar
                dataKey="ungraded"
                fill={BASELINE}
                barSize={9}
                radius={[0, 4, 4, 0]}
                isAnimationActive
                animationDuration={900}
                animationBegin={400}
              />
              <Bar
                dataKey="sak"
                fill={SAK}
                barSize={9}
                radius={[0, 4, 4, 0]}
                isAnimationActive
                animationDuration={1100}
                animationBegin={700}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Legend />
          <span className="font-mono text-xs font-semibold text-primary">≥98.7% every class</span>
        </div>
      </figure>

      {/* Accessible table view of both charts */}
      <details className="lg:col-span-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none font-medium text-foreground/80 hover:text-foreground">
          View chart data as a table
        </summary>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <table className="w-full border-collapse text-left">
            <caption className="mb-1 text-left font-medium text-foreground">
              Task success rate by week (%)
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th className="py-1 pr-2 font-medium">Week</th>
                <th className="py-1 pr-2 font-medium">Ungraded</th>
                <th className="py-1 font-medium">SAK · A-grade</th>
              </tr>
            </thead>
            <tbody>
              {SUCCESS_OVER_TIME.map((r, idx) => (
                <tr
                  key={r.week}
                  className="border-b border-border/50 chart-fade"
                  style={{ animationDelay: `${800 + idx * 40}ms` }}
                >
                  <td className="py-1 pr-2 font-mono">{r.week}</td>
                  <td className="py-1 pr-2 font-mono">{r.ungraded}%</td>
                  <td className="py-1 font-mono">{r.sak}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full border-collapse text-left">
            <caption className="mb-1 text-left font-medium text-foreground">
              Adversarial attempts blocked (%)
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th className="py-1 pr-2 font-medium">Attack class</th>
                <th className="py-1 pr-2 font-medium">Ungraded</th>
                <th className="py-1 font-medium">SAK · A-grade</th>
              </tr>
            </thead>
            <tbody>
              {BLOCKED_BY_ATTACK.map((r, idx) => (
                <tr
                  key={r.attack}
                  className="border-b border-border/50 chart-fade"
                  style={{ animationDelay: `${1000 + idx * 80}ms` }}
                >
                  <td className="py-1 pr-2">{r.attack}</td>
                  <td className="py-1 pr-2 font-mono">{r.ungraded}%</td>
                  <td className="py-1 font-mono">{r.sak}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
