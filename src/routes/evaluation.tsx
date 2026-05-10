import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { PACKAGES, type PackageType } from "@/data/packages";

export const Route = createFileRoute("/evaluation")({
  component: EvaluationPage,
  head: () => ({
    meta: [
      { title: "Evaluation · Super Agent Skill" },
      {
        name: "description",
        content:
          "Live fitness scores, thresholds, auto-tune history and hot-swap log for every skill, playbook, soul and guardrail in your stack.",
      },
    ],
  }),
});

type Status = "healthy" | "watch" | "drift";

interface SwapEvent {
  t: number;
  from: string;
  to: string;
  reason: string;
}

interface AutoTune {
  t: number;
  field: string;
  before: string;
  after: string;
  delta: string;
}

interface PanelState {
  id: string;
  name: string;
  type: PackageType;
  version: string;
  fitness: number; // 0-100
  history: number[]; // recent fitness samples
  threshold: number; // hot-swap if fitness < threshold for N samples
  warnAt: number;
  evals24h: number;
  passRate: number; // %
  driftStreak: number; // consecutive samples below threshold
  autoTune?: AutoTune;
  swaps: SwapEvent[];
  paused: boolean;
}

const TYPE_META: Record<PackageType, { label: string; cls: string; glyph: string }> = {
  skill: { label: "skill", cls: "border-primary/40 bg-primary/10 text-primary", glyph: "◆" },
  playbook: {
    label: "playbook",
    cls: "border-signal/40 bg-signal/15 text-signal-foreground",
    glyph: "▶",
  },
  soul: { label: "soul", cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400", glyph: "✦" },
  guardrail: { label: "guardrail", cls: "border-destructive/40 bg-destructive/10 text-destructive", glyph: "■" },
};

const TUNE_FIELDS = [
  { field: "temperature", before: "0.7", after: "0.55", delta: "−0.15" },
  { field: "top_p", before: "0.95", after: "0.88", delta: "−0.07" },
  { field: "max_steps", before: "8", after: "12", delta: "+4" },
  { field: "retrieval.k", before: "6", after: "10", delta: "+4" },
  { field: "guardrail.strict", before: "false", after: "true", delta: "↑ strict" },
  { field: "system.preamble", before: "v3", after: "v4 (concise)", delta: "↓ verbosity" },
];

const SWAP_REASONS = [
  "Drift on adversarial set",
  "Latency budget breached",
  "Precision dropped 3 windows",
  "New patch verified +safety",
  "Hallucination spike",
];

function seedPanels(): PanelState[] {
  return PACKAGES.map((p, i) => {
    const baseFitness = 78 + Math.floor(Math.random() * 16); // 78-93
    const threshold = p.type === "guardrail" ? 88 : p.type === "soul" ? 78 : 82;
    const warnAt = threshold + 3;
    const history = Array.from({ length: 24 }, () =>
      clamp(baseFitness + jitter(2.5), 60, 99),
    );
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      version: p.latest,
      fitness: history[history.length - 1],
      history,
      threshold,
      warnAt,
      evals24h: 120 + Math.floor(Math.random() * 880),
      passRate: 88 + Math.random() * 10,
      driftStreak: 0,
      autoTune:
        i % 2 === 0
          ? {
              t: -Math.floor(Math.random() * 40 + 5),
              ...TUNE_FIELDS[i % TUNE_FIELDS.length],
            }
          : undefined,
      swaps:
        i === 0 || i === 3
          ? [
              {
                t: -Math.floor(Math.random() * 120 + 20),
                from: `${p.versions[1]?.version ?? "1.0.0"}`,
                to: p.latest,
                reason: SWAP_REASONS[i % SWAP_REASONS.length],
              },
            ]
          : [],
      paused: false,
    };
  });
}

function EvaluationPage() {
  const [panels, setPanels] = useState<PanelState[]>(() => seedPanels());
  const [running, setRunning] = useState(true);
  const [filter, setFilter] = useState<"all" | PackageType>("all");
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const tickRef = useRef(0);

  // Live simulation
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;
      setPanels((prev) =>
        prev.map((p) => {
          if (p.paused) return p;
          // Random walk biased toward the panel's own baseline
          const target = p.threshold + 6;
          const pull = (target - p.fitness) * 0.05;
          const next = clamp(p.fitness + pull + jitter(1.6), 55, 99.5);
          const history = [...p.history.slice(-29), next];
          const evals24h = p.evals24h + Math.floor(Math.random() * 4);
          const passRate = clamp(p.passRate + jitter(0.3), 70, 99.8);
          const below = next < p.threshold;
          const driftStreak = below ? p.driftStreak + 1 : 0;

          let swaps = p.swaps;
          let autoTune = p.autoTune;
          let version = p.version;

          // Auto-tune if we cross the warn line going down
          if (next < p.warnAt && p.fitness >= p.warnAt && Math.random() < 0.5) {
            const tune = TUNE_FIELDS[Math.floor(Math.random() * TUNE_FIELDS.length)];
            autoTune = { t, ...tune };
          }

          // Hot-swap if drift persists
          if (driftStreak >= 4) {
            const bumped = bumpVersion(version);
            swaps = [
              {
                t,
                from: version,
                to: bumped,
                reason: SWAP_REASONS[Math.floor(Math.random() * SWAP_REASONS.length)],
              },
              ...p.swaps,
            ].slice(0, 6);
            version = bumped;
            // recovery boost after swap
            return {
              ...p,
              fitness: clamp(next + 9, 60, 99.5),
              history: [...history.slice(0, -1), clamp(next + 9, 60, 99.5)],
              evals24h,
              passRate: clamp(passRate + 1.2, 70, 99.8),
              driftStreak: 0,
              swaps,
              autoTune,
              version,
            };
          }

          return {
            ...p,
            fitness: next,
            history,
            evals24h,
            passRate,
            driftStreak,
            swaps,
            autoTune,
            version,
          };
        }),
      );
    }, 900 / speed);
    return () => clearInterval(id);
  }, [running, speed]);

  const filtered = useMemo(
    () => (filter === "all" ? panels : panels.filter((p) => p.type === filter)),
    [panels, filter],
  );

  const summary = useMemo(() => {
    const total = panels.length;
    const healthy = panels.filter((p) => statusOf(p) === "healthy").length;
    const watch = panels.filter((p) => statusOf(p) === "watch").length;
    const drift = panels.filter((p) => statusOf(p) === "drift").length;
    const swaps = panels.reduce((acc, p) => acc + p.swaps.length, 0);
    const avg = panels.reduce((acc, p) => acc + p.fitness, 0) / Math.max(1, total);
    return { total, healthy, watch, drift, swaps, avg };
  }, [panels]);

  function togglePause(id: string) {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, paused: !p.paused } : p)));
  }

  function manualSwap(id: string) {
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const bumped = bumpVersion(p.version);
        return {
          ...p,
          version: bumped,
          fitness: clamp(p.fitness + 6, 60, 99.5),
          driftStreak: 0,
          swaps: [
            { t: tickRef.current, from: p.version, to: bumped, reason: "Manual hot-swap" },
            ...p.swaps,
          ].slice(0, 6),
        };
      }),
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-border/70 pb-8 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
              <span className="size-1.5 rounded-full bg-signal pulse-dot" />
              <span className="font-mono uppercase tracking-wider text-muted-foreground">
                Evaluation · {running ? "live" : "paused"} · {panels.length} packages
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Continuous evaluation, per package.
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Every skill, playbook, soul and guardrail in your stack is scored against its own
              benchmark suite in real time. Crossing a threshold triggers an auto-tune; persistent
              drift triggers a hot-swap. Nothing leaves your gateway.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center rounded-md border border-border bg-surface p-0.5 text-xs font-mono">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s as 1 | 2 | 4)}
                  className={
                    "h-8 rounded-[4px] px-2 transition-colors " +
                    (speed === s
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {s}×
                </button>
              ))}
            </div>
            <button
              onClick={() => setRunning((r) => !r)}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
            >
              {running ? "Pause" : "Run"}
            </button>
          </div>
        </div>

        {/* Summary */}
        <section className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border/60 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryStat label="Avg fitness" value={summary.avg.toFixed(1)} suffix="/100" accent />
          <SummaryStat label="Healthy" value={summary.healthy.toString()} tone="signal" />
          <SummaryStat label="Watching" value={summary.watch.toString()} tone="amber" />
          <SummaryStat label="Drift" value={summary.drift.toString()} tone="destructive" />
          <SummaryStat label="Hot-swaps" value={summary.swaps.toString()} />
        </section>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Filter
          </span>
          {(["all", "skill", "playbook", "soul", "guardrail"] as const).map((f) => {
            const active = filter === f;
            const count = f === "all" ? panels.length : panels.filter((p) => p.type === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors " +
                  (active
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground")
                }
              >
                <span className="capitalize">{f}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Panels grid */}
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PackagePanel
              key={p.id}
              panel={p}
              onTogglePause={() => togglePause(p.id)}
              onManualSwap={() => manualSwap(p.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center text-sm text-muted-foreground">
              No packages match this filter.
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="mt-10 flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4">
          <div>
            <div className="text-sm font-medium">Want this on your stack?</div>
            <div className="text-sm text-muted-foreground">
              Connect via MCP and Super Agent Skill starts the evaluation loop automatically.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/evolution"
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              See evolution loop
            </Link>
            <Link
              to="/onboarding"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
            >
              Connect agent
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- panel ---------------- */

function PackagePanel({
  panel,
  onTogglePause,
  onManualSwap,
}: {
  panel: PanelState;
  onTogglePause: () => void;
  onManualSwap: () => void;
}) {
  const status = statusOf(panel);
  const meta = TYPE_META[panel.type];
  const statusMeta = STATUS_META[status];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/40">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                meta.cls
              }
            >
              <span aria-hidden>{meta.glyph}</span>
              {meta.label}
            </span>
            <span
              className={
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                statusMeta.cls
              }
            >
              <span className={"size-1 rounded-full " + statusMeta.dot} aria-hidden />
              {statusMeta.label}
            </span>
            {panel.paused && (
              <span className="rounded-full border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                paused
              </span>
            )}
          </div>
          <div className="mt-1.5 truncate font-mono text-[13px] text-foreground" title={panel.name}>
            {panel.name}
            <span className="text-muted-foreground">@{panel.version}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onTogglePause}
            className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2 text-[11px] hover:bg-accent"
            title={panel.paused ? "Resume evaluation" : "Pause evaluation"}
          >
            {panel.paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={onManualSwap}
            className="inline-flex h-7 items-center rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground hover:opacity-95"
            title="Force a hot-swap to the next version"
          >
            Hot-swap
          </button>
        </div>
      </header>

      {/* Fitness */}
      <div className="grid gap-3 px-4 py-4 md:grid-cols-[150px_1fr]">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Fitness
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={
                "font-mono text-3xl font-semibold tabular-nums " +
                (status === "drift"
                  ? "text-destructive"
                  : status === "watch"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground")
              }
            >
              {panel.fitness.toFixed(1)}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">/100</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded-md border border-border bg-background px-2 py-1">
              <div className="text-muted-foreground">Pass rate</div>
              <div className="font-mono text-foreground">{panel.passRate.toFixed(1)}%</div>
            </div>
            <div className="rounded-md border border-border bg-background px-2 py-1">
              <div className="text-muted-foreground">Evals 24h</div>
              <div className="font-mono text-foreground">{panel.evals24h.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <FitnessChart history={panel.history} threshold={panel.threshold} warnAt={panel.warnAt} />
      </div>

      {/* Thresholds */}
      <div className="grid grid-cols-3 gap-px border-t border-border bg-border/60 text-[11px]">
        <ThresholdCell label="Hot-swap <" value={panel.threshold.toString()} tone="destructive" />
        <ThresholdCell label="Warn <" value={panel.warnAt.toString()} tone="amber" />
        <ThresholdCell
          label="Drift streak"
          value={`${panel.driftStreak}/4`}
          tone={panel.driftStreak >= 2 ? "destructive" : "muted"}
        />
      </div>

      {/* Auto-tune */}
      <div className="border-t border-border px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Last auto-tune
          </div>
          {panel.autoTune && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {fmtAgo(panel.autoTune.t)}
            </span>
          )}
        </div>
        {panel.autoTune ? (
          <div className="rounded-md border border-border bg-background px-2.5 py-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-foreground">{panel.autoTune.field}</span>
              <span className="rounded-full bg-signal/15 px-1.5 py-0.5 font-mono text-[10px] text-signal-foreground">
                {panel.autoTune.delta}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
              {panel.autoTune.before} → <span className="text-foreground">{panel.autoTune.after}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border px-2.5 py-2 text-[11.5px] text-muted-foreground">
            No auto-tune yet — fitness has stayed above the warn line.
          </div>
        )}
      </div>

      {/* Hot-swap history */}
      <div className="border-t border-border px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Hot-swap history
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{panel.swaps.length}</span>
        </div>
        {panel.swaps.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-2.5 py-2 text-[11.5px] text-muted-foreground">
            No swaps. The current version is meeting its thresholds.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {panel.swaps.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px]"
              >
                <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm bg-primary/10 font-mono text-[10px] text-primary">
                  ⇄
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-foreground">
                    {s.from}
                    <span className="text-muted-foreground"> → </span>
                    {s.to}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{s.reason}</div>
                </div>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                  {fmtAgo(s.t)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function FitnessChart({
  history,
  threshold,
  warnAt,
}: {
  history: number[];
  threshold: number;
  warnAt: number;
}) {
  const w = 280;
  const h = 90;
  const min = 60;
  const max = 100;
  const step = w / Math.max(1, history.length - 1);
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const path = history.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = history[history.length - 1];
  const tone =
    last < threshold
      ? "stroke-destructive"
      : last < warnAt
        ? "stroke-amber-500"
        : "stroke-signal";

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-[90px] w-full"
        role="img"
        aria-label="Fitness over time"
      >
        {/* Threshold band */}
        <rect
          x="0"
          y={y(threshold)}
          width={w}
          height={h - y(threshold)}
          className="fill-destructive/5"
        />
        {/* Warn line */}
        <line
          x1="0"
          x2={w}
          y1={y(warnAt)}
          y2={y(warnAt)}
          className="stroke-amber-500/40"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        {/* Threshold line */}
        <line
          x1="0"
          x2={w}
          y1={y(threshold)}
          y2={y(threshold)}
          className="stroke-destructive/50"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        {/* Series */}
        <path d={path} fill="none" className={tone} strokeWidth={1.6} />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-0.5 font-mono text-[9px] text-muted-foreground">
        <span>fitness</span>
        <span>warn {warnAt} · swap {threshold}</span>
      </div>
    </div>
  );
}

function ThresholdCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "destructive" | "amber" | "muted";
}) {
  const toneCls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <div className="bg-surface/60 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={"mt-0.5 font-mono text-[13px] " + toneCls}>{value}</div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  suffix,
  accent,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
  tone?: "signal" | "amber" | "destructive";
}) {
  const toneCls =
    tone === "signal"
      ? "text-signal-foreground"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "destructive"
          ? "text-destructive"
          : accent
            ? "text-primary"
            : "text-foreground";
  return (
    <div className="bg-surface/60 px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={"font-mono text-2xl font-semibold tabular-nums " + toneCls}>{value}</span>
        {suffix && <span className="font-mono text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  healthy: {
    label: "healthy",
    cls: "border-signal/40 bg-signal/15 text-signal-foreground",
    dot: "bg-signal pulse-dot",
  },
  watch: {
    label: "watching",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  drift: {
    label: "drift",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
    dot: "bg-destructive pulse-dot",
  },
};

function statusOf(p: PanelState): Status {
  if (p.fitness < p.threshold) return "drift";
  if (p.fitness < p.warnAt) return "watch";
  return "healthy";
}

function bumpVersion(v: string): string {
  const parts = v.split(".").map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}

function fmtAgo(t: number): string {
  // t is a tick number (negative for seeded past). Render as "Nm ago".
  const ticks = Math.abs(t);
  if (ticks < 1) return "just now";
  if (ticks < 60) return `${ticks}m ago`;
  return `${Math.floor(ticks / 60)}h ago`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function jitter(scale: number) {
  return (Math.random() - 0.5) * scale * 2;
}
