import { useState } from "react";
import type { Artifact, Governance } from "@/lib/generate/types";
import { GOVERNANCE, cap } from "@/lib/generate/types";
import { KindBadge } from "@/components/generate/KindBadge";

export function HealthBreakdownPanel({
  artifacts,
  governance,
  baseline,
  score,
  delta,
}: {
  artifacts: Artifact[];
  governance: Governance;
  baseline: { health: number; precision: number; safety: number; latency: number };
  score: { health: number; precision: number; safety: number; latency: number };
  delta: { health: number; precision: number; safety: number; latency: number };
}) {
  type Metric = "health" | "precision" | "safety" | "latency";
  const [metric, setMetric] = useState<Metric>("health");
  const [open, setOpen] = useState(true);

  const totals = artifacts.reduce(
    (acc, a) => ({
      health: acc.health + a.delta.health,
      precision: acc.precision + a.delta.precision,
      safety: acc.safety + a.delta.safety,
      latency: acc.latency + a.delta.latency,
    }),
    { health: 0, precision: 0, safety: 0, latency: 0 },
  );
  const govBoost = GOVERNANCE[governance].safetyBoost;

  // Score per artifact for the chosen metric. For latency, reduction (negative delta) is good.
  const scored = artifacts
    .map((a, idx) => {
      const raw = a.delta[metric];
      const contribution = metric === "latency" ? -raw : raw;
      return { a, idx, raw, contribution };
    })
    .sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution));

  const maxAbs = Math.max(0.001, ...scored.map((s) => Math.abs(s.contribution)));

  const totalForMetric = (() => {
    if (metric === "latency") return Math.round(baseline.latency - score.latency); // ms saved
    if (metric === "safety") return Number((delta.safety + govBoost).toFixed(1));
    return Number(delta[metric].toFixed(1));
  })();

  const fmt = (n: number) =>
    metric === "latency"
      ? `${n >= 0 ? "+" : ""}${Math.round(n)}ms`
      : `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
  const goodText = (n: number) =>
    n > 0 ? "text-signal-foreground" : n < 0 ? "text-destructive" : "text-muted-foreground";

  const metricMeta: Record<Metric, { label: string; unit: string; help: string }> = {
    health: {
      label: "Health",
      unit: "pts",
      help: "Composite of precision, safety and latency. Each package's contribution is signed and additive.",
    },
    precision: {
      label: "Precision",
      unit: "pp",
      help: "Pass rate on the benchmark suite. Skills and playbooks usually move this.",
    },
    safety: {
      label: "Safety",
      unit: "pp",
      help: "Block rate on adversarial probes. Guardrails and governance level dominate.",
    },
    latency: {
      label: "Latency",
      unit: "ms",
      help: "Average response time. Lighter packages reduce it; heavy reasoning increases it.",
    },
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-background p-5">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex size-6 items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
            title={open ? "Collapse" : "Expand"}
          >
            {open ? "−" : "+"}
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Health Score breakdown
          </span>
          <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            why this score
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(metricMeta) as Metric[]).map((m) => {
            const active = m === metric;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={active}
                className={
                  "rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors " +
                  (active
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground")
                }
              >
                {metricMeta[m].label}
              </button>
            );
          })}
        </div>
      </header>

      {open && (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
            <div className="rounded-xl border border-border bg-surface/40 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {metricMeta[metric].label} delta
              </div>
              <div
                className={"mt-1 text-3xl font-semibold tabular-nums " + goodText(totalForMetric)}
              >
                {fmt(totalForMetric)}
              </div>
              <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                {metricMeta[metric].help}
              </p>
              {metric === "safety" && govBoost > 0 && (
                <div className="mt-3 rounded-md border border-dashed border-border bg-background p-2 text-[11.5px] text-muted-foreground">
                  Includes <span className="text-foreground">+{govBoost}</span> from governance:{" "}
                  <span className="text-foreground">{GOVERNANCE[governance].label}</span>.
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md border border-border bg-background p-2">
                  <div className="text-muted-foreground">Baseline</div>
                  <div className="mt-0.5 font-mono text-foreground">
                    {metric === "latency"
                      ? `${Math.round(baseline.latency)}ms`
                      : baseline[metric].toFixed(1)}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-background p-2">
                  <div className="text-muted-foreground">Final</div>
                  <div className="mt-0.5 font-mono text-foreground">
                    {metric === "latency"
                      ? `${Math.round(score.latency)}ms`
                      : metric === "safety"
                        ? (score.safety + govBoost).toFixed(1)
                        : score[metric].toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Per-package contribution
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  sum {fmt(metric === "latency" ? -totals.latency : totals[metric])}
                </span>
              </div>
              <ul className="space-y-2">
                {scored.map(({ a, idx, raw, contribution }) => {
                  const pct = (Math.abs(contribution) / maxAbs) * 100;
                  const positive = contribution > 0;
                  const neutral = contribution === 0;
                  return (
                    <li key={idx} className="rounded-lg border border-border bg-surface/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <KindBadge kind={a.kind} />
                            <span className="truncate font-mono text-[12.5px] text-foreground">
                              {a.name}
                              <span className="text-muted-foreground">@{a.version}</span>
                            </span>
                            <span
                              className={
                                "rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                                (a.source === "enriched"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-signal/20 text-signal-foreground")
                              }
                            >
                              {a.source}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                            {justifyContribution(a, metric, raw)}
                          </p>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                            <div
                              className={
                                "h-full transition-all " +
                                (neutral
                                  ? "bg-muted-foreground/30"
                                  : positive
                                    ? "bg-signal/70"
                                    : "bg-destructive/70")
                              }
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={
                            "shrink-0 font-mono text-[12px] tabular-nums " + goodText(contribution)
                          }
                        >
                          {fmt(contribution)}
                        </span>
                      </div>
                    </li>
                  );
                })}

                {metric === "safety" && govBoost > 0 && (
                  <li className="rounded-lg border border-dashed border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            governance
                          </span>
                          <span className="font-mono text-[12.5px] text-foreground">
                            {GOVERNANCE[governance].label} mode
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                          {GOVERNANCE[governance].blurb}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-signal-foreground">
                        +{govBoost.toFixed(1)}
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function justifyContribution(
  a: Artifact,
  metric: "health" | "precision" | "safety" | "latency",
  raw: number,
): string {
  const kindWord =
    a.kind === "skill"
      ? "skill"
      : a.kind === "playbook"
        ? "playbook"
        : a.kind === "soul"
          ? "soul"
          : "guardrail";
  const sourceWord =
    a.source === "enriched" ? "enriched from registry" : "generated from your context";

  if (metric === "latency") {
    if (raw < 0)
      return `${cap(kindWord)} ${sourceWord} — trims ${Math.abs(Math.round(raw))}ms by short-circuiting reasoning paths.`;
    if (raw > 0)
      return `${cap(kindWord)} ${sourceWord} — adds ${Math.round(raw)}ms of deeper checks; pays for itself in precision.`;
    return `${cap(kindWord)} ${sourceWord} — neutral on latency.`;
  }
  if (metric === "safety") {
    if (a.kind === "guardrail")
      return `Guardrail ${sourceWord} — blocks the unsafe pattern outright. ${a.summary}`;
    if (raw > 0)
      return `${cap(kindWord)} ${sourceWord} — narrows scope, indirectly reduces unsafe outputs.`;
    return `${cap(kindWord)} ${sourceWord} — no direct safety contribution.`;
  }
  if (metric === "precision") {
    if (raw > 0)
      return `${cap(kindWord)} ${sourceWord} — adds domain rules and verified examples that lift pass rate.`;
    if (raw < 0)
      return `${cap(kindWord)} ${sourceWord} — slight precision tradeoff for tone or safety.`;
    return `${cap(kindWord)} ${sourceWord} — neutral on precision.`;
  }
  // health (composite)
  if (raw > 0)
    return `${cap(kindWord)} ${sourceWord} — net positive across precision, safety and latency. ${a.summary}`;
  if (raw < 0)
    return `${cap(kindWord)} ${sourceWord} — drags the composite; consider pairing with a complementary package.`;
  return `${cap(kindWord)} ${sourceWord} — composite-neutral.`;
}

export function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-signal transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Metric({
  label,
  value,
  unit,
  delta,
  rawIsLatency = false,
}: {
  label: string;
  value: number;
  unit: string;
  delta: number;
  good?: "up" | "down";
  rawIsLatency?: boolean;
}) {
  const positive = delta > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums">
          <span className="text-foreground">
            {rawIsLatency ? Math.round(value) : value.toFixed(1)}
          </span>
          <span className="text-muted-foreground">{unit}</span>
          {delta !== 0 && (
            <span className={"ml-2 " + (positive ? "text-signal-foreground" : "text-destructive")}>
              {positive ? "+" : ""}
              {rawIsLatency ? `${Math.round(delta)}ms faster` : delta.toFixed(1)}
            </span>
          )}
        </span>
      </div>
      <Bar value={rawIsLatency ? Math.max(0, 100 - (value / 1500) * 100) : value} max={100} />
    </div>
  );
}
