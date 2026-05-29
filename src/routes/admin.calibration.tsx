import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SitePage } from "@/components/site/SitePage";
import { getJudgeCalibration, runAdversarialWithJudge, type JudgeCalibrationRow } from "@/lib/adversarial/calibrate.server";

export const Route = createFileRoute("/admin/calibration")({
  head: () => ({
    meta: [
      { title: "Judge calibration — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCalibrationPage,
});

// κ thresholds (Landis & Koch): ≥0.8 almost perfect, 0.6–0.8 substantial,
// 0.4–0.6 moderate, <0.4 the judge is drifting from the deterministic grader.
function kappaTone(k: number | null): { label: string; cls: string } {
  if (k === null) return { label: "—", cls: "text-muted-foreground" };
  if (k >= 0.8) return { label: "almost perfect", cls: "text-emerald-500" };
  if (k >= 0.6) return { label: "substantial", cls: "text-emerald-400" };
  if (k >= 0.4) return { label: "moderate", cls: "text-amber-500" };
  return { label: "drifting", cls: "text-red-500" };
}

function AdminCalibrationPage() {
  const fetchCal = useServerFn(getJudgeCalibration);
  const runJudge = useServerFn(runAdversarialWithJudge);
  const [days, setDays] = useState(90);

  const q = useQuery({
    queryKey: ["admin", "judge-calibration", days],
    queryFn: () => fetchCal({ data: { days } }),
  });

  const [slug, setSlug] = useState("");
  const run = useMutation({
    mutationFn: (s: string) => runJudge({ data: { slug: s } }),
    onSuccess: (r) => {
      toast.success(
        r.judge_used
          ? `Ran ${r.total} cases · κ ${r.judge_calibration?.kappa?.toFixed(2) ?? "—"} · ${r.passed} passed`
          : `Ran ${r.total} cases (no judge configured) · ${r.passed} passed`,
      );
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Run failed"),
  });

  const rows = (q.data?.rows ?? []) as JudgeCalibrationRow[];

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Judge calibration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cohen's κ between the LLM judge and the deterministic grader, per package, over the last{" "}
          {days} days. A falling κ means the two are diverging — the judge likely needs recalibration
          against golden labels. Lowest κ is listed first.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                days === d ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent"
              }`}
            >
              Last {d}d
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="package-slug"
              className="h-8 w-44 rounded-md border border-border bg-background px-2 font-mono text-xs"
            />
            <button
              onClick={() => slug && run.mutate(slug)}
              disabled={!slug || run.isPending}
              className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {run.isPending ? "Running…" : "Run judged eval"}
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Package</th>
                <th className="px-4 py-2 text-right font-medium">κ (judge↔det)</th>
                <th className="px-4 py-2 text-right font-medium">Agreement</th>
                <th className="px-4 py-2 text-right font-medium">Overrides</th>
                <th className="px-4 py-2 font-medium">Trend</th>
                <th className="px-4 py-2 text-right font-medium">Runs</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr><td className="px-4 py-3 text-muted-foreground" colSpan={6}>Loading…</td></tr>
              )}
              {q.isError && (
                <tr><td className="px-4 py-3 text-destructive" colSpan={6}>Failed to load.</td></tr>
              )}
              {!q.isLoading && rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted-foreground" colSpan={6}>
                    No judged runs yet. Enter a package slug above and run a judged eval to populate this.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const tone = kappaTone(r.latest_kappa);
                return (
                  <tr key={r.slug} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{r.slug}</div>
                      <div className="text-[11px] text-muted-foreground">{r.type}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono ${tone.cls}`}>{r.latest_kappa?.toFixed(2) ?? "—"}</span>
                      <div className={`text-[10px] ${tone.cls}`}>{tone.label}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {r.latest_agreement != null ? `${Math.round(r.latest_agreement * 100)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {r.latest_overrides ?? 0}{r.latest_cases ? `/${r.latest_cases}` : ""}
                    </td>
                    <td className="px-4 py-3"><Sparkline values={r.kappa_history} /></td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{r.runs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </SitePage>
  );
}

/** Tiny inline κ sparkline (0..1 mapped to bar height). */
function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex h-6 items-end gap-0.5">
      {values.map((v, i) => {
        const clamped = Math.max(0, Math.min(1, v));
        const tone = clamped >= 0.6 ? "bg-emerald-500/70" : clamped >= 0.4 ? "bg-amber-500/70" : "bg-red-500/70";
        return (
          <div
            key={i}
            className={`w-1 rounded-sm ${tone}`}
            style={{ height: `${Math.max(8, clamped * 100)}%` }}
            title={v.toFixed(2)}
          />
        );
      })}
    </div>
  );
}
