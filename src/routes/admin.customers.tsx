import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { getCustomerMetrics } from "@/lib/admin/customers.functions";

type SortKey =
  | "created_at"
  | "run_count"
  | "credits_spent"
  | "credit_balance"
  | "price_cents"
  | "last_run_at"
  | "display_name";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Admin" },
      { name: "description", content: "Customer base, paying customers, usage averages and Stripe finance." },
    ],
  }),
  component: CustomersAdminPage,
});

function CustomersAdminPage() {
  const fetchMetrics = useServerFn(getCustomerMetrics);
  const [environment, setEnvironment] = useState<"live" | "sandbox">("live");
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "365d">("30d");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("run_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [onlyPaying, setOnlyPaying] = useState(false);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin", "customers", environment, range, search],
    queryFn: () =>
      fetchMetrics({ data: { environment, range, search: search || undefined, limit: 200 } }),
    staleTime: 30_000,
  });

  const filteredSorted = useMemo(() => {
    const items = (data?.customers ?? []).filter((c) => (onlyPaying ? c.is_paying : true));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const av: any = (a as any)[sortKey];
      const bv: any = (b as any)[sortKey];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av > bv ? dir : -dir;
    });
  }, [data?.customers, sortKey, sortDir, onlyPaying]);

  const fmtMoney = (v: number, ccy: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: (ccy || "usd").toUpperCase() }).format(v);
  const fmtNum = (n: number) => n.toLocaleString();
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers & Revenue</h1>
          <p className="text-sm text-muted-foreground">
            Who is registered, who is paying, how much they use the product, and Stripe finance for the selected window.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={environment} onValueChange={(v) => setEnvironment(v as "live" | "sandbox")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="sandbox">Sandbox</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      ) : null}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Customers" value={fmtNum(data?.summary.total_customers ?? 0)} />
        <Stat label="Paying" value={fmtNum(data?.summary.paying_subscriptions ?? 0)} accent />
        <Stat label="Free" value={fmtNum(data?.summary.free_customers ?? 0)} />
        <Stat
          label="MRR"
          value={
            data?.summary
              ? fmtMoney(data.summary.mrr, data.summary.mrr_currency)
              : "—"
          }
        />
        <Stat label="Runs (lifetime)" value={fmtNum(data?.summary.total_runs ?? 0)} />
        <Stat label="Runs (30d)" value={fmtNum(data?.summary.runs_last_30d ?? 0)} />
        <Stat
          label="Avg runs / customer"
          value={(data?.summary.avg_runs_per_customer ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        />
        <Stat label="Subscriptions" value={fmtNum(data?.summary.total_subscriptions ?? 0)} />
      </div>

      {/* Stripe finance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Stripe finance · {range}</CardTitle>
            {data?.stripe ? (
              <Badge variant="outline" className="uppercase">{data.stripe.environment}</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {data?.stripe_error ? (
            <p className="text-sm text-destructive">Stripe error: {data.stripe_error}</p>
          ) : data?.stripe ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <FinanceCell label="Gross" value={fmtMoney(data.stripe.gross, data.stripe.currency)} />
              <FinanceCell label="Fees" value={fmtMoney(data.stripe.fees, data.stripe.currency)} />
              <FinanceCell label="Net" value={fmtMoney(data.stripe.net, data.stripe.currency)} accent />
              <FinanceCell label="Charges" value={fmtNum(data.stripe.successful_charges)} />
              <FinanceCell
                label="Refunds"
                value={`${fmtNum(data.stripe.refunded_count)} · ${fmtMoney(data.stripe.refunded_amount, data.stripe.currency)}`}
              />
              <FinanceCell
                label="Balance (available)"
                value={fmtMoney(data.stripe.balance.available, data.stripe.balance.currency)}
              />
              <FinanceCell
                label="Balance (pending)"
                value={fmtMoney(data.stripe.balance.pending, data.stripe.balance.currency)}
              />
              <FinanceCell
                label="Window"
                value={data.stripe.truncated ? `${range} (truncated)` : range}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading finance…</p>
          )}
        </CardContent>
      </Card>

      {/* Customer table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Customer base</CardTitle>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={onlyPaying}
                  onChange={(e) => setOnlyPaying(e.target.checked)}
                />
                Only paying
              </label>
              <Input
                placeholder="Search handle or display name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <Th sortable onClick={() => onSort("display_name")} active={sortKey === "display_name"} dir={sortDir}>Customer</Th>
                <Th>Email</Th>
                <Th>Plan / Status</Th>
                <Th sortable onClick={() => onSort("price_cents")} active={sortKey === "price_cents"} dir={sortDir} align="right">Price</Th>
                <Th sortable onClick={() => onSort("run_count")} active={sortKey === "run_count"} dir={sortDir} align="right">Runs</Th>
                <Th sortable onClick={() => onSort("last_run_at")} active={sortKey === "last_run_at"} dir={sortDir}>Last run</Th>
                <Th sortable onClick={() => onSort("credits_spent")} active={sortKey === "credits_spent"} dir={sortDir} align="right">Credits spent</Th>
                <Th sortable onClick={() => onSort("credit_balance")} active={sortKey === "credit_balance"} dir={sortDir} align="right">Balance</Th>
                <Th sortable onClick={() => onSort("created_at")} active={sortKey === "created_at"} dir={sortDir}>Joined</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filteredSorted.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">No customers match.</TableCell></TableRow>
              ) : filteredSorted.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-secondary" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.display_name || c.handle || "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">@{c.handle ?? "—"}</div>
                      </div>
                      {c.roles.includes("admin") && <Badge variant="outline" className="ml-1">admin</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.email ?? "—"}</TableCell>
                  <TableCell>
                    {c.plan ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{c.plan}</span>
                        <span className="text-xs text-muted-foreground">{c.subscription_status}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Free</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.price_cents != null && c.currency
                      ? fmtMoney(c.price_cents / 100, c.currency)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(c.run_count)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(c.last_run_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(c.credits_spent)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(c.credit_balance)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Showing {filteredSorted.length} of {data.customers_returned} loaded (table page cap 200). Adjust search to narrow.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/40" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function FinanceCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function Th({
  children, sortable, active, dir, onClick, align,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
  align?: "right";
}) {
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      {sortable ? (
        <button
          type="button"
          onClick={onClick}
          className={`inline-flex items-center gap-1 ${active ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
        >
          {children}
          {active ? <span className="text-xs">{dir === "asc" ? "↑" : "↓"}</span> : null}
        </button>
      ) : (
        children
      )}
    </TableHead>
  );
}
