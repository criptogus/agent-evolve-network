import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Footer } from "@/components/site/Footer";
import { Stars } from "@/components/reviews/Stars";
import {
  listReviewReports,
  moderateReview,
  resolveReport,
  REPORT_REASONS,
  type ReportRow,
  type ReportStatus,
} from "@/lib/reviews/reports.functions";

export const Route = createFileRoute("/admin/review-reports")({
  head: () => ({
    meta: [
      { title: "Review reports — Admin · Super Agent Skill" },
      { name: "description", content: "Moderate user-submitted reports of abusive or fake reviews." },
    ],
  }),
  component: ReviewReportsAdmin,
});

const TABS: { value: ReportStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "actioned", label: "Hidden" },
  { value: "dismissed", label: "Dismissed" },
];

function reasonLabel(value: string) {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value;
}

function ReviewReportsAdmin() {
  const list = useServerFn(listReviewReports);
  const moderate = useServerFn(moderateReview);
  const resolve = useServerFn(resolveReport);
  const qc = useQueryClient();

  const [status, setStatus] = useState<ReportStatus>("open");
  const q = useQuery({
    queryKey: ["admin", "review-reports", status],
    queryFn: () => list({ data: { status } }),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin", "review-reports"] });

  const hideMut = useMutation({
    mutationFn: (vars: { reviewId: string; hide: boolean; reason: string }) =>
      moderate({ data: vars }),
    onSuccess: invalidate,
  });
  const resolveMut = useMutation({
    mutationFn: (vars: { reportId: string; status: "actioned" | "dismissed"; resolution: string }) =>
      resolve({ data: vars }),
    onSuccess: invalidate,
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Moderation
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Review reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Reports submitted by users about abusive, spammy or fake reviews. Hide a review to
            remove it from public listings; dismiss a report if it doesn't violate the guidelines.
          </p>
          <div className="mt-6 inline-flex gap-1 rounded-md border border-border bg-background p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setStatus(t.value)}
                className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${
                  status === t.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading reports…</p>}
        {q.isError && (
          <p className="text-sm text-destructive">
            {(q.error as Error)?.message ?? "Failed to load reports."}
          </p>
        )}
        {q.data && q.data.reports.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No reports in this queue.
          </div>
        )}
        <ul className="space-y-4">
          {q.data?.reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              busy={hideMut.isPending || resolveMut.isPending}
              onHide={(reason) =>
                hideMut.mutate({ reviewId: r.review_id, hide: true, reason })
              }
              onUnhide={() =>
                hideMut.mutate({ reviewId: r.review_id, hide: false, reason: "" })
              }
              onDismiss={(resolution) =>
                resolveMut.mutate({
                  reportId: r.id,
                  status: "dismissed",
                  resolution,
                })
              }
            />
          ))}
        </ul>
      </section>
      <Footer />
    </div>
  );
}

function ReportCard({
  report,
  busy,
  onHide,
  onUnhide,
  onDismiss,
}: {
  report: ReportRow;
  busy: boolean;
  onHide: (reason: string) => void;
  onUnhide: () => void;
  onDismiss: (resolution: string) => void;
}) {
  const [note, setNote] = useState("");
  const when = new Date(report.created_at).toLocaleString();
  return (
    <li className="rounded-xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-destructive">
          {reasonLabel(report.reason)}
        </span>
        <span className="text-xs text-muted-foreground">
          Reported by <strong className="text-foreground">{report.reporter_name ?? "user"}</strong>
        </span>
        {report.package_slug && (
          <Link
            to="/marketplace/$packageId"
            params={{ packageId: report.package_slug }}
            className="text-xs text-primary hover:underline"
          >
            → {report.package_name}
          </Link>
        )}
        {report.review_is_hidden && (
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Hidden
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{when}</span>
      </header>

      {report.details && (
        <p className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs italic text-muted-foreground">
          “{report.details}”
        </p>
      )}

      <div className="mt-4 rounded-md border border-border bg-background/60 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Review by {report.review_user_name ?? "user"}</span>
          {report.review_rating != null && (
            <>
              <Stars value={report.review_rating} size={12} />
              <span className="font-mono text-[11px]">{report.review_rating}/5</span>
            </>
          )}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {report.review_body || <em className="opacity-60">— no body —</em>}
        </p>
      </div>

      {report.status === "open" ? (
        <div className="mt-4 space-y-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note (shared as resolution / hide reason)…"
            maxLength={500}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              disabled={busy}
              onClick={() => onDismiss(note)}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-foreground disabled:opacity-50"
            >
              Dismiss report
            </button>
            <button
              disabled={busy}
              onClick={() => onHide(note)}
              className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground disabled:opacity-50"
            >
              Hide review
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {report.resolution
              ? `Resolution: ${report.resolution}`
              : `Resolved ${report.resolved_at ? new Date(report.resolved_at).toLocaleString() : ""}`}
          </span>
          {report.review_is_hidden && (
            <button
              disabled={busy}
              onClick={onUnhide}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-foreground disabled:opacity-50"
            >
              Unhide review
            </button>
          )}
        </div>
      )}
    </li>
  );
}
