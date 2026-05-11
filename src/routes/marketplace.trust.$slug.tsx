import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { getSkillTrust, type Finding } from "@/lib/marketplace/trust.functions";

export const Route = createFileRoute("/marketplace/trust/$slug")({
  loader: async ({ params }) => {
    const res = await getSkillTrust({ data: { slug: params.slug } });
    if (!res.ok) throw notFound();
    return res;
  },
  head: ({ loaderData, params }) => ({
    meta: loaderData?.ok
      ? [
          { title: `Trust Report: ${loaderData.package.name} — Super Agent Skill` },
          {
            name: "description",
            content: `Public trust score, model heatmap and CVE-style robustness findings for ${loaderData.package.name}. Battle-tested skills only.`,
          },
          { property: "og:title", content: `Trust Report: ${loaderData.package.name}` },
          {
            property: "og:description",
            content: `Independent telemetry and adversarial findings for ${params.slug} on Super Agent Skill.`,
          },
        ]
      : [{ title: "Trust report not found" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">No trust report</h1>
        <p className="mt-2 text-muted-foreground">This package has no public trust data yet.</p>
        <Link to="/marketplace" className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Back to marketplace
        </Link>
      </div>
    </div>
  ),
  component: TrustPage,
});

const SEV_BADGE: Record<Finding["severity"], string> = {
  low: "border-border/60 text-muted-foreground",
  medium: "border-yellow-500/40 text-yellow-400",
  high: "border-orange-500/40 text-orange-400",
  critical: "border-red-500/50 text-red-400",
};

function TrustPage() {
  const initial = Route.useLoaderData();
  const { slug } = Route.useParams();
  const fetchTrust = useServerFn(getSkillTrust);
  const { data } = useQuery({
    queryKey: ["trust", slug],
    queryFn: () => fetchTrust({ data: { slug } }),
    initialData: initial,
    refetchInterval: 30_000,
  });
  if (!data?.ok) return null;
  const t = data.trust;
  const score = t?.trust_score ?? null;
  const battle = t?.battle_tested;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Link to="/marketplace" className="text-xs text-muted-foreground hover:text-foreground">← Marketplace</Link>
          <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Trust Report</p>
              <h1 className="mt-1 font-mono text-3xl font-semibold tracking-tight md:text-4xl">{data.package.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                v{data.package.latest_version} · {data.package.type} · {data.package.author_handle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {battle && (
                <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-emerald-400">
                  Battle-tested
                </span>
              )}
              <div className="rounded-md border border-border bg-surface px-4 py-3 text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Trust score</div>
                <div className="font-mono text-3xl font-semibold">{score ?? "—"}<span className="text-sm text-muted-foreground">/100</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Last 7 days" value={t?.window_7d?.runs ?? 0} sub={fmtPct(t?.window_7d?.success_rate)} />
          <Stat label="Last 30 days" value={t?.window_30d?.runs ?? 0} sub={fmtPct(t?.window_30d?.success_rate)} />
          <Stat label="Lifetime" value={t?.lifetime?.runs ?? 0} sub={fmtPct(t?.lifetime?.success_rate)} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface/40 p-5">
            <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Latency (30d)</h2>
            <div className="mt-3 flex gap-6">
              <Metric label="p50" value={t?.window_30d?.p50_latency_ms ? `${Math.round(t.window_30d.p50_latency_ms)}ms` : "—"} />
              <Metric label="p95" value={t?.window_30d?.p95_latency_ms ? `${Math.round(t.window_30d.p95_latency_ms)}ms` : "—"} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface/40 p-5">
            <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Robustness</h2>
            <div className="mt-3 flex gap-6">
              <Metric label="Public findings" value={String(t?.findings_public ?? 0)} />
              <Metric label="Critical" value={String(t?.findings_critical ?? 0)} tone={t?.findings_critical ? "danger" : undefined} />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-surface/40 p-5">
          <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Model heatmap (30d)</h2>
          {!t?.models?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No telemetry yet. Connected agents can call <code className="font-mono text-xs">report_execution</code> via MCP after using this skill.
            </p>
          ) : (
            <div className="mt-4 grid gap-2">
              {t.models.map((m) => (
                <div key={m.model} className="flex items-center gap-3">
                  <div className="w-44 truncate font-mono text-xs">{m.model}</div>
                  <div className="h-2 flex-1 rounded bg-border/40">
                    <div
                      className="h-2 rounded bg-primary"
                      style={{ width: `${Math.round((m.success_rate ?? 0) * 100)}%` }}
                    />
                  </div>
                  <div className="w-24 text-right font-mono text-xs text-muted-foreground">
                    {Math.round((m.success_rate ?? 0) * 100)}% · {m.runs}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Robustness findings</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            CVE-style report of adversarial failures discovered by the SkillForge red-team pipeline. Public by default — we
            publish what we find so you can trust what you ship.
          </p>
          {data.findings.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-surface/40 p-6 text-sm text-muted-foreground">
              No public findings. The skill either passed every adversarial probe so far or is still being audited.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface/40">
              {data.findings.map((f) => (
                <li key={f.code} className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:gap-4">
                  <span className={`inline-flex w-fit shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${SEV_BADGE[f.severity]}`}>
                    {f.severity}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground md:w-36">{f.code}</span>
                  <span className="flex-1 text-sm">{f.summary}</span>
                  <span className="text-xs text-muted-foreground">
                    {f.fixed_in_version ? `fixed in v${f.fixed_in_version}` : "open"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10 rounded-lg border border-border bg-surface/40 p-5 text-sm text-muted-foreground">
          <h3 className="font-mono text-xs uppercase tracking-widest text-foreground">How this trust score is computed</h3>
          <p className="mt-2">
            Composite of (a) 30-day success rate from real agent executions reported via the MCP{" "}
            <code className="font-mono text-xs">report_execution</code> tool, (b) volume confidence (logarithmic on run count),
            and (c) a penalty for unresolved critical robustness findings. Battle-tested badge requires ≥1,000 runs and ≥95%
            success in the last 30 days.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value.toLocaleString()}<span className="ml-1 text-xs text-muted-foreground">runs</span></div>
      {sub && <div className="mt-1 font-mono text-xs text-muted-foreground">{sub} success</div>}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-mono text-2xl font-semibold ${tone === "danger" ? "text-red-400" : ""}`}>{value}</div>
    </div>
  );
}

function fmtPct(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v * 1000) / 10}%`;
}
