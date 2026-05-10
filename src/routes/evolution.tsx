import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/evolution")({
  component: EvolutionPage,
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Evolution Engine · AgentForge" },
      {
        name: "description",
        content:
          "Watch the AgentForge Evolution Engine run live: observe → assess → recommend → install → verify, with metrics rising in real time.",
      },
    ],
  }),
});

type Phase = "observe" | "assess" | "recommend" | "install" | "verify";
const PHASES: { id: Phase; label: string; detail: string }[] = [
  { id: "observe", label: "Observe", detail: "Stream interactions from the MCP gateway." },
  { id: "assess", label: "Self-assess", detail: "Score reasoning, domain, safety, fluency." },
  { id: "recommend", label: "Recommend", detail: "Pick the upgrade with the highest expected lift." },
  { id: "install", label: "Hot-swap", detail: "Install via MCP with zero downtime." },
  { id: "verify", label: "Verify", detail: "Replay benchmark suite, lock in improvements." },
];

interface Tick {
  t: number;
  health: number;
  precision: number;
  latency: number; // lower = better
  hallucination: number; // lower = better
}

interface RunRecord {
  id: string;
  prompt: string;
  startedAt: number;
  generations: number;
  health: number;
  installs: number;
  ticks: number;
}

const HISTORY_KEY = "agentforge.evolution.history.v1";
const AUTORUN_KEY = "agentforge.evolution.autorun.v1";

function loadAutorun(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(AUTORUN_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

function saveAutorun(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTORUN_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function loadHistory(): RunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RunRecord[]).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: RunRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 12)));
  } catch {
    /* quota or disabled — ignore */
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

const UPGRADES = [
  { name: "cardiology-diagnostics@2.1.0", note: "+6% precision on rare arrhythmias" },
  { name: "no-hallucination@1.4.0", note: "−0.3pp hallucination rate" },
  { name: "mckinsey-consultant@2.3.0", note: "+34% decisiveness" },
  { name: "enterprise-sales-flow@1.4.2", note: "+12% close rate" },
  { name: "steve-jobs-soul@3.0.1", note: "−42% verbosity, +taste" },
  { name: "growth-hacking-pro@1.6.0", note: "+2.4× experiment velocity" },
];

const MAX_POINTS = 60;

function EvolutionPage() {
  const { prompt } = Route.useSearch();
  const [autorun, setAutorunState] = useState<boolean>(() => loadAutorun());
  const [running, setRunning] = useState(autorun);
  function setAutorun(v: boolean) {
    setAutorunState(v);
    saveAutorun(v);
    // Sync running state with the new preference
    setRunning(v);
  }
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [phase, setPhase] = useState<Phase>("observe");
  const [generation, setGeneration] = useState(1);
  const [series, setSeries] = useState<Tick[]>(() => seedSeries());
  const [activePrompt, setActivePrompt] = useState<string | undefined>(prompt);
  const [log, setLog] = useState<{ t: number; kind: "info" | "ok" | "warn" | "evolve"; text: string }[]>(() =>
    prompt
      ? [
          { t: 0, kind: "info", text: `› Command received: "${prompt}"` },
          { t: 0, kind: "info", text: "Routing to Evolution Engine…" },
        ]
      : [{ t: 0, kind: "info", text: "Evolution engine standing by. Press Run to start." }],
  );
  const [installed, setInstalled] = useState<string[]>([]);
  const tickRef = useRef(0);
  const phaseIdxRef = useRef(0);

  // History (per-prompt) persisted to localStorage
  const [history, setHistory] = useState<RunRecord[]>(() => loadHistory());
  const runIdRef = useRef<string | null>(null);
  const navigate = useNavigate({ from: "/evolution" });

  const startRun = useCallback((p: string) => {
    const id = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    runIdRef.current = id;
    const record: RunRecord = {
      id,
      prompt: p,
      startedAt: Date.now(),
      generations: 1,
      health: 0,
      installs: 0,
      ticks: 0,
    };
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, 12);
      saveHistory(next);
      return next;
    });
  }, []);

  // Echo new prompts coming via URL changes — start a new history run
  useEffect(() => {
    if (!prompt || prompt === activePrompt) return;
    setActivePrompt(prompt);
    setLog((l) => [
      ...l.slice(-40),
      { t: tickRef.current, kind: "info", text: `› Command received: "${prompt}"` },
    ]);
    setRunning(autorun);
    startRun(prompt);
  }, [prompt, activePrompt, startRun]);

  // First-mount: if there's already a prompt from URL, register it
  useEffect(() => {
    if (prompt && !runIdRef.current) startRun(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Main loop
  useEffect(() => {
    if (!running) return;
    const interval = 700 / speed;
    const id = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;

      // advance phase every ~5 ticks
      if (t % 5 === 0) {
        phaseIdxRef.current = (phaseIdxRef.current + 1) % PHASES.length;
        const next = PHASES[phaseIdxRef.current].id;
        setPhase(next);

        if (next === "observe") {
          setGeneration((g) => g + 1);
          pushLog("info", "—— New generation ——");
        }
        if (next === "assess") pushLog("info", "Self-assessment running across 412 traces…");
        if (next === "recommend") {
          const u = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
          pushLog("warn", `Gap detected → recommend ${u.name}`);
        }
        if (next === "install") {
          const u = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
          pushLog("ok", `Hot-swap: installed ${u.name}`);
          setInstalled((arr) => [u.name, ...arr].slice(0, 5));
        }
        if (next === "verify") {
          pushLog("evolve", "● Agent evolved. Improvements locked in.");
        }
      }

      setSeries((prev) => {
        const last = prev[prev.length - 1];
        const evolveBoost = phase === "verify" ? 1 : 0;
        const next: Tick = {
          t,
          health: clamp(
            last.health + jitter(0.08) + evolveBoost * 0.6,
            70,
            99.6,
          ),
          precision: clamp(
            last.precision + jitter(0.1) + evolveBoost * 0.4,
            72,
            99,
          ),
          latency: clamp(last.latency + jitter(8) - evolveBoost * 6, 380, 1400),
          hallucination: clamp(
            last.hallucination + jitter(0.04) - evolveBoost * 0.08,
            0.05,
            3,
          ),
        };
        const merged = [...prev, next];
        return merged.length > MAX_POINTS ? merged.slice(-MAX_POINTS) : merged;
      });
    }, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed, phase]);

  function pushLog(kind: "info" | "ok" | "warn" | "evolve", text: string) {
    setLog((l) => [...l.slice(-40), { t: tickRef.current, kind, text }]);
  }

  function reset() {
    tickRef.current = 0;
    phaseIdxRef.current = 0;
    setPhase("observe");
    setGeneration(1);
    setSeries(seedSeries());
    setInstalled([]);
    setLog([{ t: 0, kind: "info", text: "Engine reset. Standing by." }]);
  }

  const last = series[series.length - 1];
  const first = series[0];
  const delta = useMemo(
    () => ({
      health: last.health - first.health,
      precision: last.precision - first.precision,
      latency: first.latency - last.latency,
      hallucination: first.hallucination - last.hallucination,
    }),
    [last, first],
  );

  // Sync live stats into the current history record
  useEffect(() => {
    const id = runIdRef.current;
    if (!id) return;
    setHistory((prev) => {
      let touched = false;
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const updated: RunRecord = {
          ...r,
          generations: generation,
          health: round1(last.health),
          installs: installed.length,
          ticks: tickRef.current,
        };
        if (
          updated.generations === r.generations &&
          updated.health === r.health &&
          updated.installs === r.installs
        ) {
          return r;
        }
        touched = true;
        return updated;
      });
      if (touched) saveHistory(next);
      return touched ? next : prev;
    });
  }, [generation, installed.length, last.health]);

  function rerun(p: string) {
    // Reset engine, then activate the prompt via URL — triggers prompt effect
    reset();
    setActivePrompt(undefined);
    navigate({ search: { prompt: p } });
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  function removeRun(id: string) {
    setHistory((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveHistory(next);
      return next;
    });
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
                Evolution Engine · {running ? "running" : "paused"} · gen {generation}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Watch your agent evolve, in real time.
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Observe → assess → recommend → hot-swap → verify. Every loop locks in measurable
              improvements. No retraining. No downtime.
            </p>
            {activePrompt && (
              <div className="mt-4 flex max-w-2xl items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] text-primary">
                  ›_
                </span>
                <p className="text-sm text-foreground">{activePrompt}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              title="When on, the loop starts automatically. When off, you press Run to start."
            >
              <span className="relative inline-flex h-4 w-7 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={autorun}
                  onChange={(e) => setAutorun(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-primary" />
                <span className="absolute left-0.5 size-3 rounded-full bg-background shadow transition-transform peer-checked:translate-x-3" />
              </span>
              <span className="font-mono uppercase tracking-wider">Auto-run</span>
            </label>
            <div className="flex h-9 items-center rounded-md border border-border bg-surface p-0.5 text-xs font-mono">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s as 1 | 2 | 4)}
                  className={
                    "h-8 rounded-[4px] px-2 transition-colors " +
                    (speed === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {s}×
                </button>
              ))}
            </div>
            <button
              onClick={reset}
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent"
            >
              Reset
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
            >
              {running ? "Pause" : "Run"}
            </button>
          </div>
        </div>

        {/* Phase pipeline */}
        <section className="mt-8">
          <PhasePipeline phase={phase} />
        </section>

        {/* Metrics */}
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Health Score"
            value={last.health.toFixed(1)}
            unit="/100"
            delta={delta.health}
            higherIsBetter
            series={series.map((d) => d.health)}
            domain={[70, 100]}
          />
          <MetricCard
            label="Precision"
            value={last.precision.toFixed(1)}
            unit="%"
            delta={delta.precision}
            higherIsBetter
            series={series.map((d) => d.precision)}
            domain={[70, 100]}
          />
          <MetricCard
            label="Latency"
            value={Math.round(last.latency).toString()}
            unit="ms"
            delta={delta.latency}
            higherIsBetter={false}
            series={series.map((d) => d.latency)}
            domain={[300, 1500]}
            invert
          />
          <MetricCard
            label="Hallucination"
            value={last.hallucination.toFixed(2)}
            unit="%"
            delta={delta.hallucination}
            higherIsBetter={false}
            series={series.map((d) => d.hallucination)}
            domain={[0, 3]}
            invert
          />
        </section>

        {/* Bottom: chart + console + installs */}
        <section className="mt-8 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <CompositeChart series={series} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <ConsoleStream log={log} />
            <RecentInstalls items={installed} />
          </div>
        </section>

        <HistoryPanel
          history={history}
          activeId={runIdRef.current}
          onRerun={rerun}
          onRemove={removeRun}
          onClear={clearHistory}
        />

        <div className="mt-10 flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4">
          <div>
            <div className="text-sm font-medium">Want this in your stack?</div>
            <div className="text-sm text-muted-foreground">
              Connect an MCP-compatible agent and SkillForge will start the loop automatically.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/skillforge"
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              Open SkillForge
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

/* ---------------- pipeline ---------------- */

function HistoryPanel({
  history,
  activeId,
  onRerun,
  onRemove,
  onClear,
}: {
  history: RunRecord[];
  activeId: string | null;
  onRerun: (prompt: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="mt-10 rounded-2xl border border-border bg-surface/40">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <div className="text-sm font-medium">Run history</div>
          <div className="text-xs text-muted-foreground">
            Last {history.length} {history.length === 1 ? "run" : "runs"} on this browser. One click re-runs the prompt.
          </div>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </header>

      {history.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          No runs yet. Send a prompt from{" "}
          <Link to="/" className="text-primary hover:underline">
            the homepage examples
          </Link>{" "}
          or{" "}
          <Link to="/generate" className="text-primary hover:underline">
            the live generator
          </Link>
          .
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {history.map((run) => {
            const isActive = run.id === activeId;
            return (
              <li
                key={run.id}
                className={
                  "group flex items-start gap-4 px-5 py-3 transition-colors " +
                  (isActive ? "bg-primary/[0.04]" : "hover:bg-surface/60")
                }
              >
                <div className="mt-1 flex shrink-0 items-center gap-2">
                  <span
                    className={
                      "size-1.5 rounded-full " +
                      (isActive ? "bg-signal pulse-dot" : "bg-muted-foreground/40")
                    }
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground" title={run.prompt}>
                    {run.prompt}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                    <span>{formatRelative(run.startedAt)}</span>
                    <span>·</span>
                    <span>gen {run.generations}</span>
                    <span>·</span>
                    <span>health {run.health.toFixed(1)}</span>
                    <span>·</span>
                    <span>{run.installs} install{run.installs === 1 ? "" : "s"}</span>
                    {isActive && (
                      <>
                        <span>·</span>
                        <span className="text-signal">live</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onRerun(run.prompt)}
                    disabled={isActive}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    title={isActive ? "This run is currently active" : "Re-run this prompt"}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    Re-run
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(run.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    title="Remove from history"
                    aria-label="Remove run"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 30) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function PhasePipeline({ phase }: { phase: Phase }) {
  const activeIdx = PHASES.findIndex((p) => p.id === phase);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {PHASES.map((p, i) => {
          const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
          return (
            <div
              key={p.id}
              className={
                "relative rounded-lg border p-3 transition-colors " +
                (state === "active"
                  ? "border-primary/50 bg-primary/5"
                  : state === "done"
                  ? "border-signal/40 bg-signal/10"
                  : "border-border bg-background/40")
              }
            >
              <div className="flex items-center gap-2">
                <span
                  className={
                    "inline-flex size-5 items-center justify-center rounded-full font-mono text-[10px] " +
                    (state === "active"
                      ? "bg-primary text-primary-foreground"
                      : state === "done"
                      ? "bg-signal text-signal-foreground"
                      : "bg-border text-muted-foreground")
                  }
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <div className="font-mono text-[12px] uppercase tracking-wider">
                  {p.label}
                </div>
                {state === "active" && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary pulse-dot" />
                )}
              </div>
              <div className="mt-1.5 text-[12px] text-muted-foreground">{p.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- metric card ---------------- */

function MetricCard({
  label,
  value,
  unit,
  delta,
  higherIsBetter,
  series,
  domain,
  invert,
}: {
  label: string;
  value: string;
  unit: string;
  delta: number;
  higherIsBetter: boolean;
  series: number[];
  domain: [number, number];
  invert?: boolean;
}) {
  const good = higherIsBetter ? delta >= 0 : delta >= 0;
  const sign = (higherIsBetter ? delta : delta) >= 0 ? "+" : "−";
  const absDelta = Math.abs(delta);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <span
          className={
            "rounded-full px-1.5 py-0.5 font-mono text-[10px] " +
            (good
              ? "bg-signal/15 text-signal-foreground"
              : "bg-primary/10 text-primary")
          }
        >
          {sign}
          {absDelta < 1 ? absDelta.toFixed(2) : absDelta.toFixed(1)}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tracking-tight">{value}</span>
        <span className="font-mono text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-3">
        <Sparkline values={series} domain={domain} invert={invert} />
      </div>
    </div>
  );
}

function Sparkline({
  values,
  domain,
  invert,
}: {
  values: number[];
  domain: [number, number];
  invert?: boolean;
}) {
  const w = 240;
  const h = 44;
  const [lo, hi] = domain;
  const path = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const norm = (v - lo) / (hi - lo);
      const y = h - (invert ? 1 - norm : norm) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- composite chart ---------------- */

function CompositeChart({ series }: { series: Tick[] }) {
  const w = 720;
  const h = 260;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  function line(values: number[], lo: number, hi: number) {
    return values
      .map((v, i) => {
        const x = padL + (i / Math.max(values.length - 1, 1)) * innerW;
        const norm = (v - lo) / (hi - lo);
        const y = padT + (1 - norm) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const health = series.map((d) => d.health);
  const precision = series.map((d) => d.precision);
  const halluc = series.map((d) => d.hallucination);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-medium">Metrics over time</div>
          <div className="text-xs text-muted-foreground">
            Last {series.length} ticks · live stream from the evolution loop
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <Legend color="var(--primary)" label="Health" />
          <Legend color="var(--signal)" label="Precision" />
          <Legend color="oklch(0.6 0.18 28 / 0.55)" label="Hallucination (lower=better)" dashed />
        </div>
      </div>
      <div className="p-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[260px] w-full">
          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={g}
              x1={padL}
              x2={w - padR}
              y1={padT + g * innerH}
              y2={padT + g * innerH}
              stroke="var(--border)"
              strokeDasharray="2 4"
            />
          ))}
          {/* y labels */}
          {[100, 90, 80, 70].map((v, i) => (
            <text
              key={v}
              x={padL - 6}
              y={padT + (i / 3) * innerH + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ font: "10px var(--font-mono)" }}
            >
              {v}
            </text>
          ))}
          <path d={line(health, 70, 100)} fill="none" stroke="var(--primary)" strokeWidth="2" />
          <path d={line(precision, 70, 100)} fill="none" stroke="var(--signal)" strokeWidth="2" />
          <path
            d={line(halluc, 0, 3)}
            fill="none"
            stroke="oklch(0.6 0.18 28 / 0.55)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <svg width="18" height="6">
        <line
          x1="0"
          x2="18"
          y1="3"
          y2="3"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "3 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}

/* ---------------- console + installs ---------------- */

function ConsoleStream({
  log,
}: {
  log: { t: number; kind: "info" | "ok" | "warn" | "evolve"; text: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[oklch(0.14_0.01_270)] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-white/60">
            evolution.stream
          </span>
        </div>
        <span className="font-mono text-[11px] text-white/40">tail -f</span>
      </div>
      <div ref={ref} className="h-56 overflow-auto px-4 py-3 font-mono text-[12px] leading-6">
        {log.map((l, i) => (
          <div
            key={i}
            className={
              "animate-fade-in " +
              (l.kind === "ok"
                ? "text-signal"
                : l.kind === "evolve"
                ? "text-signal font-semibold"
                : l.kind === "warn"
                ? "text-primary"
                : "text-white/80")
            }
          >
            <span className="text-white/40">[t{l.t.toString().padStart(3, "0")}]</span> {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentInstalls({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Recent hot-swaps</div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          zero downtime
        </span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">No installs yet this session.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((name, i) => (
            <li
              key={`${name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px] animate-fade-in"
            >
              <span className="size-1.5 rounded-full bg-signal" />
              <span className="truncate">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function seedSeries(): Tick[] {
  const arr: Tick[] = [];
  let health = 84;
  let precision = 86;
  let latency = 1100;
  let halluc = 1.6;
  for (let t = 0; t < 12; t++) {
    health += jitter(0.1);
    precision += jitter(0.15);
    latency += jitter(10);
    halluc += jitter(0.05);
    arr.push({ t, health, precision, latency, hallucination: halluc });
  }
  return arr;
}

function jitter(scale: number) {
  return (Math.random() - 0.5) * scale * 2;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
