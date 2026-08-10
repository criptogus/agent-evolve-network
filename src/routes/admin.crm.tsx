import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getCrmOverview,
  getCrmCustomer,
  sendCrmNow,
  runCrmCadenceNow,
} from "@/lib/crm/crm.functions";
import { TRIGGERS } from "@/lib/crm/segments";

export const Route = createFileRoute("/admin/crm")({
  head: () => ({
    meta: [
      { title: "CRM — value & lifecycle | Admin" },
      {
        name: "description",
        content:
          "Internal CRM: lifecycle segments, realized ROI per customer and the automated value communication cadence.",
      },
      { property: "og:title", content: "Internal CRM — value & lifecycle" },
      {
        property: "og:description",
        content: "Segments, realized ROI per customer and the automated email cadence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrmAdminPage,
});

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

function CrmAdminPage() {
  const fetchOverview = useServerFn(getCrmOverview);
  const fetchCustomer = useServerFn(getCrmCustomer);
  const send = useServerFn(sendCrmNow);
  const runCadence = useServerFn(runCrmCadenceNow);

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [previewTrigger, setPreviewTrigger] = useState<string>("value_digest");

  const overview = useQuery({
    queryKey: ["admin", "crm", "overview"],
    queryFn: () => fetchOverview(),
    staleTime: 60_000,
  });

  const detail = useQuery({
    queryKey: ["admin", "crm", "customer", openUser, previewTrigger],
    queryFn: () => fetchCustomer({ data: { userId: openUser!, trigger: previewTrigger } }),
    enabled: !!openUser,
  });

  const sendMutation = useMutation({
    mutationFn: (vars: { userId: string; trigger: string }) => send({ data: vars }),
    onSuccess: (res: any) => {
      if (res?.sent) toast.success(`Queued: ${res.subject}`);
      else toast.error(`Not sent: ${res?.reason ?? "unknown"}`);
      overview.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Send failed"),
  });

  const cadenceMutation = useMutation({
    mutationFn: (dryRun: boolean) => runCadence({ data: { dryRun } }),
    onSuccess: (res: any) => {
      toast.success(
        `${res.dryRun ? "Dry run" : "Cadence run"}: ${res.scanned} scanned, ${res.sent} sent, ${res.skipped} skipped`,
      );
      overview.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Cadence run failed"),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (overview.data?.rows ?? []).filter((r) => {
      if (stage !== "all" && r.stage !== stage) return false;
      if (!q) return true;
      return (
        (r.email ?? "").toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [overview.data?.rows, search, stage]);

  const t = overview.data?.totals;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM — value & lifecycle</h1>
          <p className="text-sm text-muted-foreground">
            Who is using the product, what it is worth to them, and the automated communication
            that proves it. Max 2 emails per customer per 7 days.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={cadenceMutation.isPending}
            onClick={() => cadenceMutation.mutate(true)}
          >
            Dry run cadence
          </Button>
          <Button
            size="sm"
            disabled={cadenceMutation.isPending}
            onClick={() => cadenceMutation.mutate(false)}
          >
            Run cadence now
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Customers", value: t ? t.customers.toLocaleString() : "—" },
          { label: "Paying", value: t ? `${t.paying} · ${usd(t.mrr_usd)} MRR` : "—" },
          { label: "Connected / activated", value: t ? `${t.connected} / ${t.activated}` : "—" },
          { label: "Avg. value actions", value: t ? String(t.avg_actions_per_customer) : "—" },
          { label: "Realized ROI (all customers)", value: t ? `${usd(t.realized_monthly_usd)}/mo` : "—" },
          { label: "Headroom left on table", value: t ? `${usd(t.headroom_monthly_usd)}/mo` : "—" },
          { label: "CRM emails last 7 days", value: t ? String(t.emails_last_7d) : "—" },
          {
            label: "Triggers active",
            value: String(Object.keys(TRIGGERS).length),
          },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="mt-1 text-xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lifecycle segments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={stage === "all" ? "default" : "outline"}
            onClick={() => setStage("all")}
          >
            All ({overview.data?.rows.length ?? 0})
          </Button>
          {(overview.data?.segments ?? []).map((s) => (
            <Button
              key={s.stage}
              size="sm"
              variant={stage === s.stage ? "default" : "outline"}
              onClick={() => setStage(s.stage)}
            >
              {s.label} ({s.count})
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Customers</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search email or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-56"
            />
            <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
              {overview.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {overview.isLoading ? (
            <p className="py-8 text-sm text-muted-foreground">Loading customers…</p>
          ) : overview.error ? (
            <p className="py-8 text-sm text-destructive">
              {(overview.error as Error).message}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">No customers match this filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                  <TableHead className="text-right">Diag.</TableHead>
                  <TableHead className="text-right">Installs</TableHead>
                  <TableHead className="text-right">Runs 30d</TableHead>
                  <TableHead className="text-right">ROI / mo</TableHead>
                  <TableHead className="text-right">Headroom</TableHead>
                  <TableHead className="text-right">Idle</TableHead>
                  <TableHead>Next message</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="max-w-[220px]">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.paying ? "default" : "secondary"}>{r.stage_label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.plan}</TableCell>
                    <TableCell className="text-right">{r.reviews}</TableCell>
                    <TableCell className="text-right">{r.diagnoses}</TableCell>
                    <TableCell className="text-right">{r.installs}</TableCell>
                    <TableCell className="text-right">{r.executions_30d}</TableCell>
                    <TableCell className="text-right">{usd(r.monthly_usd_saved)}</TableCell>
                    <TableCell className="text-right">{usd(r.headroom_monthly_usd)}</TableCell>
                    <TableCell className="text-right">
                      {Number.isFinite(r.days_idle) ? `${r.days_idle}d` : "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">
                      {r.unsubscribed ? "unsubscribed" : r.next_trigger}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOpenUser(r.user_id);
                          setPreviewTrigger(
                            Object.keys(TRIGGERS).includes(r.next_trigger)
                              ? r.next_trigger
                              : "value_digest",
                          );
                        }}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Communication cadence</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(overview.data?.triggers ?? []).map((tr) => (
            <div key={tr.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{tr.label}</span>
                <Badge variant="secondary">{tr.sent_30d} sent / 30d</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{tr.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <EffectivenessPanel />


      <Sheet open={!!openUser} onOpenChange={(o) => !o && setOpenUser(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{detail.data?.name ?? "Customer"}</SheetTitle>
            <SheetDescription>{detail.data?.email}</SheetDescription>
          </SheetHeader>

          {detail.isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : detail.data ? (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge>{detail.data.stage_label}</Badge>
                <Badge variant="secondary">{detail.data.paying ? "paying" : "free"}</Badge>
                <Badge variant="outline">next: {detail.data.next_trigger}</Badge>
              </div>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Usage</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(detail.data.usage).map(([k, v]) => (
                    <div key={k} className="flex justify-between rounded border px-2 py-1">
                      <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium">
                        {typeof v === "boolean" ? (v ? "yes" : "no") : Number.isFinite(Number(v)) ? Number(v).toLocaleString() : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Realized ROI</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(detail.data.roi).map(([k, v]) => (
                    <div key={k} className="flex justify-between rounded border px-2 py-1">
                      <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium">{v === null ? "—" : String(v)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Opportunities</h3>
                <ul className="space-y-2 text-sm">
                  {detail.data.opportunities.map((o) => (
                    <li key={o.id} className="rounded border p-2">
                      <div className="font-medium">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{o.why}</div>
                    </li>
                  ))}
                  {detail.data.opportunities.length === 0 && (
                    <li className="text-muted-foreground">Using everything — upsell or advocacy.</li>
                  )}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Send a message</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={previewTrigger} onValueChange={setPreviewTrigger}>
                    <SelectTrigger className="h-9 w-60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TRIGGERS).map((tr) => (
                        <SelectItem key={tr.id} value={tr.id}>
                          {tr.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={sendMutation.isPending}
                    onClick={() =>
                      openUser && sendMutation.mutate({ userId: openUser, trigger: previewTrigger })
                    }
                  >
                    Send now
                  </Button>
                </div>
                {detail.data.preview && (
                  <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="font-semibold">{detail.data.preview.subject}</div>
                    <div className="mt-1 font-medium">{detail.data.preview.heading}</div>
                    {detail.data.preview.intro.map((p, i) => (
                      <p key={i} className="mt-2 text-muted-foreground">
                        {p}
                      </p>
                    ))}
                    <ul className="mt-2 space-y-1">
                      {detail.data.preview.metrics.map((m, i) => (
                        <li key={i} className="flex justify-between">
                          <span className="text-muted-foreground">{m.label}</span>
                          <span className="font-medium">{m.value}</span>
                        </li>
                      ))}
                    </ul>
                    {detail.data.preview.bullets.length > 0 && (
                      <ul className="mt-2 list-disc pl-4 text-muted-foreground">
                        {detail.data.preview.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Message history</h3>
                <ul className="space-y-1 text-sm">
                  {detail.data.messages.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                      <span className="truncate">{m.subject ?? m.trigger}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {m.status} · {fmtDate(m.created_at)}
                      </span>
                    </li>
                  ))}
                  {detail.data.messages.length === 0 && (
                    <li className="text-muted-foreground">No CRM messages sent yet.</li>
                  )}
                </ul>
              </section>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
