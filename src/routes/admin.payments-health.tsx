import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getPaymentsHealth, type EnvHealth } from "@/lib/admin/payments-health.functions";

export const Route = createFileRoute("/admin/payments-health")({
  head: () => ({
    meta: [
      { title: "Payments health — Admin" },
      { name: "description", content: "Stripe checkout, webhook and subscription diagnostics." },
    ],
  }),
  component: PaymentsHealthPage,
});

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
        ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      }`}
    >
      {children}
    </span>
  );
}

function EnvCard({ env }: { env: EnvHealth }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide">{env.environment}</h3>
        <Pill ok={env.keyConfigured && env.webhookSecretConfigured}>
          {env.keyConfigured ? "API key OK" : "API key missing"}
        </Pill>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Webhook secret</dt>
          <dd>
            <Pill ok={env.webhookSecretConfigured}>
              {env.webhookSecretConfigured ? "present" : "missing"}
            </Pill>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Pro price</dt>
          <dd className="text-right font-mono text-xs">
            {env.price
              ? `${(env.price.amount ?? 0) / 100} ${env.price.currency} · ${env.price.active ? "active" : "inactive"}`
              : "not found"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Webhook endpoints</dt>
          <dd className="mt-1 space-y-1">
            {env.webhooks.length === 0 && <span className="text-xs text-destructive">none registered</span>}
            {env.webhooks.map((w) => (
              <div key={w.url} className="break-all font-mono text-[11px] text-muted-foreground">
                <Pill ok={w.status === "enabled"}>{w.status}</Pill> {w.url}
              </div>
            ))}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Checkout probe</dt>
          <dd className="text-right">
            <Pill ok={env.checkoutProbe.ok}>{env.checkoutProbe.ok ? "ok" : "check"}</Pill>
            <p className="mt-1 max-w-[22rem] break-words text-[11px] text-muted-foreground">
              {env.checkoutProbe.detail}
            </p>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function PaymentsHealthPage() {
  const fetchHealth = useServerFn(getPaymentsHealth);
  const [probe, setProbe] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "payments-health", probe],
    queryFn: () => fetchHealth({ data: { probe } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Checkout, webhooks and subscription state for both environments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            {q.isFetching ? "Checking…" : "Re-check"}
          </Button>
          <Button
            onClick={() => setProbe(true)}
            disabled={q.isFetching}
            title="Creates a throwaway Stripe checkout session in each environment (no charge)"
          >
            Run checkout probe
          </Button>
        </div>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && (
        <p className="text-sm text-destructive">{(q.error as Error).message}</p>
      )}

      {q.data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {q.data.environments.map((e) => (
              <EnvCard key={e.environment} env={e} />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold">Webhook events received</h3>
              <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                {[
                  ["24h", q.data.events.last24h],
                  ["7d", q.data.events.last7d],
                  ["30d", q.data.events.last30d],
                  ["all", q.data.events.total],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <div className="text-xl font-semibold">{value as number}</div>
                    <div className="font-mono text-[11px] uppercase text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Latest: {q.data.events.latest ? new Date(q.data.events.latest).toLocaleString() : "never"}
              </p>
              {q.data.events.total === 0 && (
                <p className="mt-2 text-xs text-destructive">
                  No Stripe event has ever been processed — no organic purchase has completed yet.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold">Subscriptions</h3>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-[11px] uppercase text-muted-foreground">
                    <th className="pb-2">Env</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">No customer</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.subscriptions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-muted-foreground">
                        none
                      </td>
                    </tr>
                  )}
                  {q.data.subscriptions.map((s) => (
                    <tr key={`${s.environment}-${s.status}`} className="border-t border-border/60">
                      <td className="py-2 font-mono text-xs">{s.environment}</td>
                      <td className="py-2">{s.status}</td>
                      <td className="py-2 text-right">{s.count}</td>
                      <td
                        className={`py-2 text-right ${s.missing_customer ? "text-destructive" : ""}`}
                      >
                        {s.missing_customer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Rows without a Stripe customer were granted manually and cannot open the billing portal.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
