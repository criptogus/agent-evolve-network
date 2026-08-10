import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCrmEffectiveness,
  reviewCrmVariant,
  runCrmLearningNow,
  setCrmLearning,
} from "@/lib/crm/crm.functions";

/**
 * Effectiveness view: what each message and each copy variant produced, when
 * customers actually engage, and every change the learning loop made.
 */
export function EffectivenessPanel() {
  const fetchEffectiveness = useServerFn(getCrmEffectiveness);
  const toggle = useServerFn(setCrmLearning);
  const review = useServerFn(reviewCrmVariant);
  const runJob = useServerFn(runCrmLearningNow);

  const q = useQuery({
    queryKey: ["admin", "crm", "effectiveness"],
    queryFn: () => fetchEffectiveness(),
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => toggle({ data: { enabled } }),
    onSuccess: (r: any) => {
      toast.success(r.enabled ? "Learning loop enabled" : "Learning loop paused");
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not change the setting"),
  });

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: string; decision: "approve" | "reject" }) => review({ data: vars }),
    onSuccess: () => {
      toast.success("Variant updated");
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update the variant"),
  });

  const jobMutation = useMutation({
    mutationFn: (vars: { job: "score" | "tune"; dryRun: boolean }) => runJob({ data: vars }),
    onSuccess: (r: any) => {
      toast.success(
        r.job === "score"
          ? `Scored ${r.checked} messages · ${r.converted} converted`
          : `Tuner: ${r.paused} paused, ${r.activated} published, ${r.blocked} blocked by guardrails`,
      );
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Job failed"),
  });


  const data = q.data;
  const maxHour = Math.max(1, ...(data?.hours ?? []).map((h) => h.sent));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base">Learning loop</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Picks the copy variant and the trigger with the best measured outcome, and only changes
              anything after {data?.min_samples ?? 20} sends per variant. Cadence caps never change.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={data?.learning_enabled ? "default" : "secondary"}>
              {data?.learning_enabled ? "Learning on" : "Learning paused"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={toggleMutation.isPending || !data}
              onClick={() => toggleMutation.mutate(!data?.learning_enabled)}
            >
              {data?.learning_enabled ? "Pause learning" : "Enable learning"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={jobMutation.isPending}
              onClick={() => jobMutation.mutate({ job: "score", dryRun: false })}
            >
              Score outcomes
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={jobMutation.isPending}
              onClick={() => jobMutation.mutate({ job: "tune", dryRun: false })}
            >
              Run tuner
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {q.isLoading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading effectiveness…</p>
          ) : q.error ? (
            <p className="py-6 text-sm text-destructive">{(q.error as Error).message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Intended outcome</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                  <TableHead className="text-right">Clicked</TableHead>
                  <TableHead className="text-right">Converted</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.triggers ?? []).map((t) => (
                  <TableRow key={t.trigger}>
                    <TableCell className="font-medium">{t.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.outcome} · {Math.round(t.window_hours / 24)}d window
                    </TableCell>
                    <TableCell className="text-right">{t.sent}</TableCell>
                    <TableCell className="text-right">{t.opened}</TableCell>
                    <TableCell className="text-right">{t.clicked}</TableCell>
                    <TableCell className="text-right">{t.converted}</TableCell>
                    <TableCell className="text-right">{t.conversion_rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Copy variants</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Each trigger runs 2-3 framings. The leader gets most of the traffic; losing framings are
            paused automatically once the difference is statistically significant.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trigger</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Framing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Clicked</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.variants ?? []).map((v) => (
                <TableRow key={`${v.trigger}-${v.variant}`}>
                  <TableCell className="text-xs">{v.trigger}</TableCell>
                  <TableCell>
                    <div className="font-medium">{v.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.variant}
                      {v.origin === "ai" ? " · AI draft" : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{v.framing}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === "active" ? "default" : "secondary"}>
                      {v.is_leader ? "leader" : v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{v.sent}</TableCell>
                  <TableCell className="text-right">{v.clicked}</TableCell>
                  <TableCell className="text-right">{v.converted}</TableCell>
                  <TableCell className="text-right">{v.estimated_rate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Best send hours (UTC)</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.hours ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No timing data yet — sends use each customer's own activity profile until then.
              </p>
            ) : (
              <div className="space-y-1">
                {(data?.hours ?? []).map((h) => {
                  const rate = h.sent > 0 ? Math.round((h.engaged / h.sent) * 100) : 0;
                  return (
                    <div key={h.hour} className="flex items-center gap-2 text-xs">
                      <span className="w-10 text-muted-foreground">{String(h.hour).padStart(2, "0")}h</span>
                      <div className="h-2 flex-1 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-primary"
                          style={{ width: `${Math.round((h.sent / maxHour) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-muted-foreground">
                        {h.sent} sent · {rate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Auto-tuning changelog</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.changelog ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No automatic changes yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(data?.changelog ?? []).map((c, i) => (
                  <li key={i} className="rounded border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.action.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[c.trigger, c.variant].filter(Boolean).join(" / ")} — {c.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Drafted variants waiting for approval</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Written by AI when a framing loses. Nothing is sent before you approve it.
          </p>
        </CardHeader>
        <CardContent>
          {(data?.pending ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts pending.</p>
          ) : (
            <ul className="space-y-3">
              {(data?.pending ?? []).map((p) => (
                <li key={p.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {p.trigger} · {p.label}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ id: p.id, decision: "approve" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ id: p.id, decision: "reject" })}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="font-semibold">{p.subject}</div>
                    <div>{p.heading}</div>
                    <p className="text-muted-foreground">{p.intro}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
