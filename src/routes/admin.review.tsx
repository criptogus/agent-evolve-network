import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listReviewQueue,
  setReviewStatus,
  type ReviewQueueItem,
  type ReviewStatus,
} from "@/lib/admin/review.functions";

const TYPES = ["soul", "skill", "playbook", "guardrail", "all"] as const;
type TypeFilter = (typeof TYPES)[number];

const STATUS_GROUPS: { key: ReviewStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "paused", label: "Paused" },
  { key: "rejected", label: "Rejected" },
  { key: "draft", label: "Draft" },
];

export const Route = createFileRoute("/admin/review")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Review queue — Super Agent Skill" },
      { name: "description", content: "Approve, pause or reject submitted packages before they go live in the marketplace." },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const [type, setType] = useState<TypeFilter>("soul");
  const fetchFn = useServerFn(listReviewQueue);
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["review-queue", type],
    queryFn: () => fetchFn({ data: { type } }),
  });

  const isForbidden = isError && (error as any)?.message?.includes("Forbidden");

  const grouped = (data?.items ?? []).reduce<Record<ReviewStatus, ReviewQueueItem[]>>(
    (acc, it) => {
      (acc[it.review_status] ||= []).push(it);
      return acc;
    },
    { draft: [], pending: [], approved: [], paused: [], rejected: [] },
  );

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            <span>/</span>
            <span className="font-mono text-foreground">review</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Review queue</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Approve, pause or reject submitted packages before they appear in the public marketplace.
            Approving sets <code className="font-mono text-foreground">is_published = true</code>; pausing or rejecting hides them immediately.
          </p>

          <div className="mt-6">
            <Tabs value={type} onValueChange={(v) => setType(v as TypeFilter)}>
              <TabsList>
                {TYPES.map((t) => (
                  <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        {isForbidden && (
          <Card className="border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Admins only. Claim the first admin seat from the admin dashboard.
          </Card>
        )}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/20" />
            ))}
          </div>
        )}
        {!isLoading && !isForbidden &&
          STATUS_GROUPS.map((g) => (
            <StatusSection
              key={g.key}
              label={g.label}
              status={g.key}
              items={grouped[g.key] ?? []}
              onAction={() => qc.invalidateQueries({ queryKey: ["review-queue", type] })}
            />
          ))}
      </section>
      <Footer />
    </div>
  );
}

function StatusSection({
  label,
  status,
  items,
  onAction,
}: {
  label: string;
  status: ReviewStatus;
  items: ReviewQueueItem[];
  onAction: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-xl font-semibold">{label}</h2>
        <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
        <StatusBadge status={status} />
      </div>
      {items.length === 0 ? (
        <Card className="border-dashed bg-card/30 p-5 text-center text-xs text-muted-foreground">
          Nothing here.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <ReviewRow key={it.id} item={it} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ item, onAction }: { item: ReviewQueueItem; onAction: () => void }) {
  const setStatusFn = useServerFn(setReviewStatus);
  const [open, setOpen] = useState<null | ReviewStatus>(null);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (input: { status: ReviewStatus; notes: string | null }) =>
      setStatusFn({ data: { slug: item.slug, status: input.status, notes: input.notes } }),
    onSuccess: (res) => {
      toast.success(`Marked as ${res.status}${res.is_published ? " · live" : ""}`);
      setOpen(null);
      setNotes("");
      onAction();
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  const detailLink = item.type === "soul"
    ? { to: "/souls/$slug" as const, params: { slug: item.slug } }
    : { to: "/marketplace/$packageId" as const, params: { packageId: item.slug } };

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">{item.type}</Badge>
            <StatusBadge status={item.review_status} />
            <Badge variant="outline" className="font-mono text-[10px]">v{item.latest_version}</Badge>
            {item.is_published ? (
              <Badge className="bg-emerald-500/10 text-[10px] text-emerald-600">live</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">hidden</Badge>
            )}
          </div>
          <div className="mt-2 truncate font-mono text-sm font-semibold">{item.name}</div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {item.author_handle}
            {item.submitted_at && <> · submitted {new Date(item.submitted_at).toLocaleString()}</>}
            {item.reviewed_at && <> · reviewed {new Date(item.reviewed_at).toLocaleString()}</>}
          </div>
          {item.review_notes && (
            <p className="mt-2 rounded border border-border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> {item.review_notes}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 md:flex-nowrap">
          <Link {...detailLink} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs hover:border-primary/40">
            View
          </Link>
          {item.review_status !== "approved" && (
            <Button size="sm" onClick={() => setOpen("approved")} disabled={mutation.isPending}>
              Approve
            </Button>
          )}
          {item.review_status !== "paused" && item.review_status === "approved" && (
            <Button size="sm" variant="outline" onClick={() => setOpen("paused")} disabled={mutation.isPending}>
              Pause
            </Button>
          )}
          {item.review_status !== "rejected" && item.review_status !== "approved" && (
            <Button size="sm" variant="outline" onClick={() => setOpen("rejected")} disabled={mutation.isPending}>
              Reject
            </Button>
          )}
        </div>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => { if (!v) { setOpen(null); setNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "approved" && "Approve and publish"}
              {open === "paused" && "Pause from marketplace"}
              {open === "rejected" && "Reject submission"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {open === "approved" && "This will make the package public in the marketplace immediately."}
              {open === "paused" && "This hides the package from the public marketplace. The author keeps access."}
              {open === "rejected" && "This rejects the submission. The author can revise and resubmit."}
            </p>
            <Textarea
              placeholder="Optional reviewer note (visible to the author)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(null); setNotes(""); }} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => open && mutation.mutate({ status: open, notes: notes || null })}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Working…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const cls =
    status === "approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : status === "pending" ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400"
      : status === "paused" ? "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-300"
      : status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}
