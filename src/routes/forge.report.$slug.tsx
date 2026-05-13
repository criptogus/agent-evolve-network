import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { runForgeLoop } from "@/lib/skills/forge-loop.functions";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

/* ---------- server: read public report data (no auth required) ---------- */
const ReportInput = z.object({ slug: z.string() });

const getForgeReport = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const { data: pkg } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,type,description,long_description,latest_version,author_handle,created_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pkg) throw new Response("Not found", { status: 404 });

    const { data: versions } = await supabaseAdmin
      .from("package_versions")
      .select("id,version,status,system_prompt,rules,examples,notes,created_at,parent_version_id")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: true });

    const { data: evaluations } = await supabaseAdmin
      .from("package_evaluations")
      .select(
        "id,version_id,trigger_kind,overall_score,precision_score,health_score,hallucination_rate,safety_score,verdict,strengths,weaknesses,improvement_actions,pipeline_stages,created_at"
      )
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: true });

    return {
      package: pkg,
      versions: versions ?? [],
      evaluations: evaluations ?? [],
    };
  });

export const Route = createFileRoute("/forge/report/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Forge Report — ${params.slug} — Super Agent Skill` },
      {
        name: "description",
        content: `Live before/after report for ${params.slug}: how the Super Agent Skill forge pipeline evaluated and improved it.`,
      },
    ],
  }),
  component: ReportPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-10 text-center">
      <h1 className="text-2xl font-semibold">Couldn't load report</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <Link to="/marketplace" className="mt-4 inline-block text-primary">Back to marketplace →</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-10 text-center">
      <h1 className="text-2xl font-semibold">Package not found</h1>
      <Link to="/marketplace" className="mt-4 inline-block text-primary">Back to marketplace →</Link>
    </div>
  ),
});

function ReportPage() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getForgeReport);
  const loopFn = useServerFn(runForgeLoop);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["forge-report", slug],
    queryFn: () => fn({ data: { slug } }),
  });

  const mut = useMutation({
    mutationFn: () => loopFn({ data: { package_slug: slug, hotswap: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forge-report", slug] }),
    onError: (e: Error) => setError(e.message || "Forge loop failed"),
  });

  const before = q.data?.evaluations[0];
  const after = q.data?.evaluations[q.data.evaluations.length - 1];
  const improved = before && after && before.id !== after.id;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Forge Report</span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{slug}</h1>
            <p className="mt-1 text-muted-foreground">
              {q.data?.package.description}
            </p>
          </div>
          <button
            onClick={() => { setError(null); mut.mutate(); }}
            disabled={mut.isPending}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {mut.isPending ? "Running forge loop…" : "Run forge loop now"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Score summary */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Score label="Overall" before={before?.overall_score} after={after?.overall_score} />
          <Score label="Precision" before={before?.precision_score} after={after?.precision_score} />
          <Score label="Safety" before={before?.safety_score} after={after?.safety_score} />
          <Score
            label="Hallucination"
            before={before?.hallucination_rate}
            after={after?.hallucination_rate}
            invert
          />
        </div>

        {!improved && (
          <div className="mt-6 rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">
            Click <span className="font-semibold text-foreground">Run forge loop now</span> to evaluate this skill,
            propose a patch, hot-swap a new version, and re-evaluate. Each run is recorded so you can compare
            before/after and showcase the value to clients.
          </div>
        )}

        {/* Evaluations timeline */}
        <h2 className="mt-12 text-xl font-semibold tracking-tight">Evaluation timeline</h2>
        <div className="mt-4 space-y-4">
          {q.data?.evaluations.length === 0 && (
            <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">
              No evaluations yet.
            </div>
          )}
          {q.data?.evaluations.map((e, i) => (
            <div key={e.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  #{i + 1} · {e.trigger_kind} · {new Date(e.created_at).toLocaleString()}
                </div>
                <Verdict v={e.verdict} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Stat label="Overall" v={e.overall_score} />
                <Stat label="Precision" v={e.precision_score} />
                <Stat label="Health" v={e.health_score} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <List title="Strengths" items={(e.strengths as string[]) ?? []} tone="positive" />
                <List title="Weaknesses" items={(e.weaknesses as string[]) ?? []} tone="negative" />
              </div>
              {(e.improvement_actions as string[])?.length > 0 && (
                <div className="mt-3">
                  <List title="Improvement actions" items={(e.improvement_actions as string[]) ?? []} tone="info" />
                </div>
              )}
              {(e.pipeline_stages as Array<{ name: string; ms?: number; ok?: boolean; notes?: string }>)?.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Pipeline stages</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(e.pipeline_stages as Array<{ name: string; ms?: number; ok?: boolean }>).map((s, idx) => (
                      <span
                        key={idx}
                        className={`rounded-md px-2 py-1 font-mono text-[11px] ${
                          s.ok === false ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {s.name}{s.ms ? ` · ${s.ms}ms` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Versions */}
        <h2 className="mt-12 text-xl font-semibold tracking-tight">Versions</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.versions.map((v) => (
                <tr key={v.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono">{v.version}</td>
                  <td className="px-4 py-3">{v.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(v.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ---------- helpers ---------- */
function Score({ label, before, after, invert }: { label: string; before?: number | null; after?: number | null; invert?: boolean }) {
  const b = typeof before === "number" ? before : null;
  const a = typeof after === "number" ? after : null;
  const delta = b != null && a != null ? (invert ? b - a : a - b) : null;
  const positive = delta != null && delta > 0;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{a != null ? a.toFixed(1) : "—"}</span>
        {b != null && a != null && b !== a && (
          <span className="text-xs text-muted-foreground">from {b.toFixed(1)}</span>
        )}
      </div>
      {delta != null && (
        <div className={`mt-1 text-xs font-medium ${positive ? "text-emerald-500" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {positive ? "▲" : delta < 0 ? "▼" : "·"} {Math.abs(delta).toFixed(1)} {invert ? "less" : ""}
        </div>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number | null | undefined }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{v != null ? v.toFixed(1) : "—"}</div>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "negative" | "info" }) {
  if (!items?.length) return null;
  const colors = {
    positive: "border-emerald-500/30 bg-emerald-500/5",
    negative: "border-destructive/30 bg-destructive/5",
    info: "border-primary/30 bg-primary/5",
  }[tone];
  return (
    <div className={`rounded-md border ${colors} p-3`}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="mt-2 space-y-1 text-sm">
        {items.slice(0, 6).map((it, i) => (
          <li key={i} className="text-foreground/90">• {it}</li>
        ))}
      </ul>
    </div>
  );
}

function Verdict({ v }: { v: string | null | undefined }) {
  if (!v) return null;
  const map: Record<string, string> = {
    ship: "bg-emerald-500/15 text-emerald-500",
    iterate: "bg-amber-500/15 text-amber-500",
    reject: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded px-2 py-0.5 font-mono text-[11px] uppercase ${map[v] ?? "bg-muted"}`}>{v}</span>;
}
