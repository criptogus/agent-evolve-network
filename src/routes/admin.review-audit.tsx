import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Footer } from "@/components/site/Footer";
import { listReviewAudit, type AuditRow } from "@/lib/reviews/reports.functions";

export const Route = createFileRoute("/admin/review-audit")({
  head: () => ({
    meta: [
      { title: "Review audit — Admin · Super Agent Skill" },
      { name: "description", content: "Audit log of review and report attempts, including blocked rate-limit events." },
    ],
  }),
  component: ReviewAuditAdmin,
});

const TABS = [
  { value: "blocked", label: "Blocked" },
  { value: "allowed", label: "Allowed" },
  { value: "all", label: "All" },
] as const;

type Filter = (typeof TABS)[number]["value"];

function ReviewAuditAdmin() {
  const list = useServerFn(listReviewAudit);
  const [outcome, setOutcome] = useState<Filter>("blocked");
  const q = useQuery({
    queryKey: ["admin", "review-audit", outcome],
    queryFn: () => list({ data: { outcome, limit: 200 } }),
  });

  const blockedCount = (q.data?.rows ?? []).filter((r) => r.outcome === "blocked").length;

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Anti-fraud
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Review audit</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every review submission and report attempt is logged here. Blocked rows show why the
            request was rejected (rate limit, cooldown, eligibility, or DB constraint).
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex gap-1 rounded-md border border-border bg-background p-1">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setOutcome(t.value)}
                  className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${
                    outcome === t.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {q.data && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {q.data.rows.length} events · {blockedCount} blocked
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading audit log…</p>}
        {q.isError && (
          <p className="text-sm text-destructive">
            {(q.error as Error)?.message ?? "Failed to load."}
          </p>
        )}
        {q.data && q.data.rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nothing logged in this view.
          </div>
        )}
        <ul className="space-y-2">
          {q.data?.rows.map((r) => (
            <AuditCard key={r.id} row={r} />
          ))}
        </ul>
      </section>
      <Footer />
    </div>
  );
}

function AuditCard({ row }: { row: AuditRow }) {
  const when = new Date(row.created_at).toLocaleString();
  const isBlocked = row.outcome === "blocked";
  return (
    <li
      className={`rounded-lg border p-3 text-xs ${
        isBlocked
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
            isBlocked
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {row.outcome}
        </span>
        <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {row.kind}
        </span>
        {row.reason && (
          <span className="font-mono text-[11px] text-foreground/90">{row.reason}</span>
        )}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{when}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>
          User <strong className="text-foreground">{row.user_name ?? row.user_id.slice(0, 8)}</strong>
        </span>
        {row.package_id && (
          <span>· pkg <code className="font-mono">{row.package_id.slice(0, 8)}</code></span>
        )}
        {row.review_id && (
          <span>· review <code className="font-mono">{row.review_id.slice(0, 8)}</code></span>
        )}
        {Object.keys(row.metadata ?? {}).length > 0 && (
          <code className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
            {JSON.stringify(row.metadata)}
          </code>
        )}
      </div>
    </li>
  );
}
