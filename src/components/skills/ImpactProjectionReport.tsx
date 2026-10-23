import { TrendingDown, TrendingUp, Info } from "lucide-react";
import type { ImpactProjection } from "@/lib/skills/impact-projection";

export function ImpactProjectionReport({
  projection,
  title = "Projected impact of fixing this skill",
}: {
  projection: ImpactProjection;
  title?: string;
}) {
  const p = projection;
  return (
    <section className="rounded-xl border border-primary/30 bg-primary/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Impact report
          </span>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{p.headline}</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded bg-destructive/15 px-2 py-1 text-destructive">
            now {p.currentGrade} · {p.currentScore}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-500">
            target {p.targetGrade} · {p.targetScore}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Kpi
          label="Est. monthly savings"
          value={`$${p.savings.monthlyUsd.toLocaleString("en-US")}`}
          sub={`$${p.savings.annualUsd.toLocaleString("en-US")}/year`}
        />
        <Kpi
          label="Runs no longer needing rescue"
          value={p.savings.rescuedRunsPerMonth.toLocaleString("en-US")}
          sub="per month"
        />
        <Kpi
          label="Tokens saved"
          value={`${(p.savings.tokensSavedPerMonth / 1_000_000).toFixed(1)}M`}
          sub="per month"
        />
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3">This skill today</th>
              <th className="px-4 py-3">After the fixes</th>
              <th className="px-4 py-3">Change</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => {
              const improved = r.direction === "up" ? r.deltaPct > 0 : r.deltaPct < 0;
              return (
                <tr key={r.id} className="border-t border-border/60 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.metric}</div>
                    <div className="text-xs text-muted-foreground">{r.detail}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{r.current}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">{r.projected}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-xs font-medium ${
                        improved ? "text-emerald-500" : "text-muted-foreground"
                      }`}
                    >
                      {r.direction === "up" ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {r.delta}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Assumes {p.assumptions.runsPerMonth.toLocaleString("en-US")} runs/month · confidence:{" "}
          {p.confidence}. {p.disclaimer}
        </span>
      </p>
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
