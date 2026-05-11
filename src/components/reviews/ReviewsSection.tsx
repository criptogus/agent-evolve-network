import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  getPackageRatings,
  getReviewEligibility,
  listPackageReviews,
  submitReview,
  REVIEW_SORTS,
  type RaterKind,
  type ReviewItem,
  type ReviewSort,
} from "@/lib/reviews/reviews.functions";
import {
  reportReview,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/reviews/reports.functions";
import { Stars, StarPicker } from "./Stars";

const PAGE_SIZE = 10;

export function ReviewsSection({ slug }: { slug: string }) {
  const fetchRatings = useServerFn(getPackageRatings);
  const fetchElig = useServerFn(getReviewEligibility);
  const submit = useServerFn(submitReview);
  const qc = useQueryClient();

  const ratingsQ = useQuery({
    queryKey: ["ratings", slug],
    queryFn: () => fetchRatings({ data: { slug } }),
    staleTime: 30_000,
  });

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const eligQ = useQuery({
    queryKey: ["review-elig", slug],
    queryFn: () => fetchElig({ data: { slug } }),
    enabled: authed === true,
    staleTime: 30_000,
  });

  const submitMut = useMutation({
    mutationFn: (vars: { rating: number; body: string; raterKind: RaterKind; packageId: string }) =>
      submit({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ratings", slug] });
      qc.invalidateQueries({ queryKey: ["review-elig", slug] });
    },
  });

  const data = ratingsQ.data;
  const ratings = data?.ratings;
  const reviews = data?.reviews ?? [];
  const packageId = data?.packageId ?? null;
  const elig = eligQ.data;

  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-mono text-lg font-semibold tracking-tight">Reviews & ratings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Only verified buyers (paid) or users with at least one successful run (free) can rate.
          </p>
        </div>
        {ratings && ratings.total_count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={ratings.total_avg} size={18} />
            <span className="font-mono text-sm">
              {ratings.total_avg.toFixed(1)}{" "}
              <span className="text-muted-foreground">({ratings.total_count})</span>
            </span>
          </div>
        )}
      </header>

      {/* Split breakdown */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <BreakdownCard
          label="Humans"
          icon="🧑"
          avg={ratings?.human_avg ?? 0}
          count={ratings?.human_count ?? 0}
        />
        <BreakdownCard
          label="Agents"
          icon="🤖"
          avg={ratings?.agent_avg ?? 0}
          count={ratings?.agent_count ?? 0}
        />
      </div>

      {/* Submit form */}
      <div className="mt-6 rounded-lg border border-border bg-surface/40 p-4">
        {authed === false && (
          <p className="text-xs text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Sign in</Link> to leave a rating.
          </p>
        )}
        {authed && elig && !elig.can_review && (
          <p className="text-xs text-muted-foreground">
            {elig.reason === "OWN_PACKAGE"
              ? "You can't rate your own package."
              : elig.reason === "PURCHASE_REQUIRED"
                ? "Buy this package to leave a rating."
                : elig.reason === "USAGE_REQUIRED"
                  ? "Run this package successfully at least once to leave a rating."
                  : "You can't rate this package yet."}
          </p>
        )}
        {authed && elig?.can_review && packageId && (
          <SubmitForm
            packageId={packageId}
            initialAgent={elig.reviewed_agent ? "agent" : "human"}
            reviewedHuman={!!elig.reviewed_human}
            reviewedAgent={!!elig.reviewed_agent}
            pending={submitMut.isPending}
            error={submitMut.error?.message}
            onSubmit={(v) => submitMut.mutate({ ...v, packageId })}
          />
        )}
      </div>

      {/* Reviews list */}
      <div className="mt-6 space-y-3">
        {ratingsQ.isLoading && <div className="text-xs text-muted-foreground">Loading reviews…</div>}
        {!ratingsQ.isLoading && reviews.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No reviews yet. Be the first.
          </div>
        )}
        {reviews.map((r) => (
          <ReviewRow
            key={r.id}
            review={r}
            canReport={!!authed && currentUserId !== r.user_id}
          />
        ))}
      </div>
    </section>
  );
}

function BreakdownCard({
  label,
  icon,
  avg,
  count,
}: {
  label: string;
  icon: string;
  avg: number;
  count: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          <span className="mr-1.5">{icon}</span>
          {label}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{count} rating{count === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Stars value={avg} size={14} />
        <span className="font-mono text-sm">{count ? avg.toFixed(1) : "—"}</span>
      </div>
    </div>
  );
}

function SubmitForm({
  packageId: _packageId,
  initialAgent,
  reviewedHuman,
  reviewedAgent,
  pending,
  error,
  onSubmit,
}: {
  packageId: string;
  initialAgent: RaterKind;
  reviewedHuman: boolean;
  reviewedAgent: boolean;
  pending: boolean;
  error?: string;
  onSubmit: (v: { rating: number; body: string; raterKind: RaterKind }) => void;
}) {
  const [raterKind, setRaterKind] = useState<RaterKind>(initialAgent === "agent" && !reviewedHuman ? "agent" : "human");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  const alreadyDone = (raterKind === "human" && reviewedHuman) || (raterKind === "agent" && reviewedAgent);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return;
        onSubmit({ rating, body, raterKind });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Rate as</span>
        <button
          type="button"
          onClick={() => setRaterKind("human")}
          className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
            raterKind === "human"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          🧑 Human {reviewedHuman && <span className="ml-1 opacity-60">(edit)</span>}
        </button>
        <button
          type="button"
          onClick={() => setRaterKind("agent")}
          className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
            raterKind === "agent"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          🤖 Agent {reviewedAgent && <span className="ml-1 opacity-60">(edit)</span>}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <StarPicker value={rating} onChange={setRating} />
        <span className="font-mono text-xs text-muted-foreground">
          {rating ? `${rating}/5` : "Pick a rating"}
        </span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          raterKind === "agent"
            ? "What worked well or failed for your agent? (optional)"
            : "Share what you liked or what could improve. (optional)"
        }
        rows={3}
        maxLength={2000}
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {alreadyDone ? "You can update your existing rating." : "Public review attached to your profile."}
        </p>
        <button
          type="submit"
          disabled={!rating || pending}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {pending ? "Saving…" : alreadyDone ? "Update review" : "Submit review"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </form>
  );
}

function ReviewRow({ review, canReport }: { review: ReviewItem; canReport: boolean }) {
  const when = new Date(review.created_at).toLocaleDateString();
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <header className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-mono">
          {review.display_name?.[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="text-sm font-medium">{review.display_name ?? "Anonymous"}</span>
        <span
          className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
            review.rater_kind === "agent"
              ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
              : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
          }`}
        >
          {review.rater_kind === "agent" ? "🤖 Agent" : "🧑 Human"}
        </span>
        {review.verified_purchase && (
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            ✓ Verified buyer
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{when}</span>
      </header>
      <div className="mt-2 flex items-center gap-2">
        <Stars value={review.rating} size={13} />
        <span className="font-mono text-xs">{review.rating}/5</span>
      </div>
      {review.body && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{review.body}</p>}
      <footer className="mt-3 flex justify-end">
        {canReport ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[11px] text-muted-foreground hover:text-destructive"
            aria-label="Report this review"
          >
            ⚑ Report
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground/60" title="Sign in to report">
            ⚑
          </span>
        )}
      </footer>
      {open && (
        <ReportDialog reviewId={review.id} onClose={() => setOpen(false)} />
      )}
    </article>
  );
}

function ReportDialog({ reviewId, onClose }: { reviewId: string; onClose: () => void }) {
  const send = useServerFn(reportReview);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const mut = useMutation({
    mutationFn: () => send({ data: { reviewId, reason, details } }),
    onSuccess: () => setDone(true),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-mono text-sm font-semibold">Report this review</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Our moderation team will review your report. False reports may affect your account.
        </p>

        {done ? (
          <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
            ✓ Report submitted. Thanks for keeping the community safe.
            <div className="mt-3 flex justify-end">
              <button onClick={onClose} className="text-xs text-primary hover:underline">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
          >
            <label className="mt-4 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <label className="mt-3 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Add context to help us moderate."
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {mut.error && (
              <p className="mt-2 text-xs text-destructive">{(mut.error as Error).message}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mut.isPending}
                className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground disabled:opacity-50"
              >
                {mut.isPending ? "Sending…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
