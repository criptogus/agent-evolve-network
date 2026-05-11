import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { getEvaluationData, type EvalRow } from "@/lib/marketplace/telemetry.functions";

export const Route = createFileRoute("/evaluation")({
  loader: () => getEvaluationData(),
  component: EvaluationPage,
  head: () => ({
    meta: [
      { title: "Evaluation · Super Agent Skill" },
      {
        name: "description",
        content:
          "Real telemetry: success rate, p95 latency, drift and critical findings for every published skill, playbook, soul and guardrail.",
      },
    ],
  }),
});

const TYPE_META: Record<EvalRow["type"], { label: string; cls: string; glyph: string }> = {
  skill: { label: "skill", cls: "border-primary/40 bg-primary/10 text-primary", glyph: "◆" },
  playbook: { label: "playbook", cls: "border-signal/40 bg-signal/15 text-signal-foreground", glyph: "▶" },
  soul: { label: "soul", cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400", glyph: "✦" },
  guardrail: { label: "guardrail", cls: "border-destructive/40 bg-destructive/10 text-destructive", glyph: "■" },
};

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtMs(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(2)}s`;
  return `${Math.round(v)}ms`;
}

function fmtAge(iso: string | null): string {
  if (!iso) return "no runs yet";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function statusOf(row: EvalRow): "healthy" | "watch" | "drift" | "idle" {
  if (row.runs30d === 0) return "idle";
  if (row.criticalFindings > 0) return "drift";
  if ((row.successRate30d ?? 0) >= 0.95) return "healthy";
  if ((row.successRate30d ?? 0) >= 0.85) return "watch";
  return "drift";
}

function EvaluationPage() {
  const { rows } = Route.useLoaderData();
  const [filter, setFilter] = useState<"all" | EvalRow["type"]>("all");

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.type === filter)),
    [rows, filter],
  );

  const totals = useMemo(() => {
    const totalRuns = rows.reduce((s, r) => s + r.runs30d, 0);
    const totalOk = rows.reduce((s, r) => s + r.ok30d, 0);
    const tracked = rows.filter((r) => r.runs30d > 0).length;
    const battle = rows.filter((r) => r.battleTested).length;
    const drift = rows.filter((r) => statusOf(r) === "drift").length;
    return { totalRuns, totalOk, tracked, battle, drift };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        <header className="border-b border-border/70 pb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-signal pulse-dot" />
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              Live telemetry · last 30 days
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Evaluation</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Real success rate, latency, drift and security findings for every published package.
            Telemetry is reported via the MCP <code className="font-mono text-xs">report_execution</code> tool.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            <Stat label="Packages tracked" value={`${totals.tracked} / ${rows.length}`} />
            <Stat label="Runs (30d)" value={totals.totalRuns.toLocaleString()} />
            <Stat
              label="Success rate"
              value={totals.totalRuns ? fmtPct(totals.totalOk / totals.totalRuns) : "—"}
            />
            <Stat label="Battle-tested" value={String(totals.battle)} />
            <Stat label="At risk" value={String(totals.drift)} />
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["all", "skill", "playbook", "soul", "guardrail"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filter === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-12 rounded-lg border border-border bg-surface p-10 text-center text-muted-foreground">
            No published packages match this filter yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => {
              const meta = TYPE_META[row.type];
              const status = statusOf(row);
              const statusCls =
                status === "healthy"
                  ? "text-signal"
                  : status === "watch"
                    ? "text-amber-600 dark:text-amber-400"
                    : status === "drift"
                      ? "text-destructive"
                      : "text-muted-foreground";
              return (
                <Link
                  key={row.slug}
                  to="/marketplace/trust/$slug"
                  params={{ slug: row.slug }}
                  className="group rounded-lg border border-border bg-surface p-5 transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`mb-2 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${meta.cls}`}
                      >
                        <span>{meta.glyph}</span>
                        <span>{meta.label}</span>
                      </div>
                      <h3 className="text-base font-semibold tracking-tight group-hover:text-primary">
                        {row.name}
                      </h3>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                        v{row.version} · {fmtAge(row.lastRunAt)}
                      </div>
                    </div>
                    <div className={`text-right text-xs font-semibold uppercase ${statusCls}`}>
                      {status}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-xs">
                    <Metric label="Runs 30d" value={row.runs30d.toLocaleString()} />
                    <Metric label="Success" value={fmtPct(row.successRate30d)} />
                    <Metric label="p95" value={fmtMs(row.p95Latency)} />
                    <Metric
                      label="Trust"
                      value={row.trustScore != null ? row.trustScore.toFixed(1) : "—"}
                    />
                    <Metric
                      label="Critical"
                      value={String(row.criticalFindings)}
                      tone={row.criticalFindings > 0 ? "warn" : undefined}
                    />
                    <Metric
                      label="Battle"
                      value={row.battleTested ? "yes" : "—"}
                      tone={row.battleTested ? "good" : undefined}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}) {
  const cls =
    tone === "good"
      ? "text-signal"
      : tone === "warn"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
