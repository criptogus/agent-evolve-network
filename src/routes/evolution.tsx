import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [phase, setPhase] = useState<Phase>("observe");
  const [generation, setGeneration] = useState(1);
  const [series, setSeries] = useState<Tick[]>(() => seedSeries());
  const [log, setLog] = useState<{ t: number; kind: "info" | "ok" | "warn" | "evolve"; text: string }[]>([
    { t: 0, kind: "info", text: "Evolution engine standing by. Press Run to start." },
  ]);
  const [installed, setInstalled] = useState<string[]>([]);
  const tickRef = useRef(0);
  const phaseIdxRef = useRef(0);

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
          </div>
          <div className="flex items-center gap-2">
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
