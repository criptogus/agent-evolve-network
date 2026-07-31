import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import {
  getSkillForgeData,
  installPackageBySlug,
  uninstallPackageBySlug,
  updatePackageBySlug,
  type ForgeData,
} from "@/lib/marketplace/telemetry.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/skillforge")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { next: "/skillforge" } as never });
    }
  },
  loader: () => getSkillForgeData(),
  component: SkillForgePage,
  head: () => ({
    meta: [
      { title: "SkillForge · Super Agent Skill" },
      {
        name: "description",
        content:
          "Your installed skills, real trust scores, and AI-recommended upgrades to lift your agent's Trust Score.",
      },
    ],
  }),
});

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function SkillForgePage() {
  const data = Route.useLoaderData() as ForgeData;
  const [installing, setInstalling] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const installFn = useServerFn(installPackageBySlug);
  const uninstallFn = useServerFn(uninstallPackageBySlug);
  const updateFn = useServerFn(updatePackageBySlug);

  const installMutation = useMutation({
    mutationFn: async (slug: string) => installFn({ data: { slug } }),
    onSettled: () => {
      setInstalling(null);
      window.location.reload();
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (slug: string) => uninstallFn({ data: { slug } }),
    onSettled: () => {
      setBusy(null);
      window.location.reload();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (slug: string) => updateFn({ data: { slug } }),
    onSettled: () => {
      setBusy(null);
      window.location.reload();
    },
  });

  const ringPct = data.healthScore ?? 0;
  const ringDeg = (ringPct / 100) * 360;

  const summary = useMemo(() => {
    const tracked = data.installed.filter((p) => p.runs30d > 0).length;
    const totalRuns = data.installed.reduce((s, p) => s + p.runs30d, 0);
    return { tracked, totalRuns };
  }, [data.installed]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        <header className="flex flex-col items-start justify-between gap-6 border-b border-border/70 pb-8 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
              <span className="size-1.5 rounded-full bg-signal pulse-dot" />
              <span className="font-mono uppercase tracking-wider text-muted-foreground">
                SkillForge · live
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Your stack</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Your real Trust Score is the average trust score across the packages you have installed.
              Install more battle-tested packages — or remove drifting ones — to raise it.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div
              className="grid size-32 place-items-center rounded-full"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${ringDeg}deg, hsl(var(--surface)) ${ringDeg}deg)`,
              }}
            >
              <div className="grid size-24 place-items-center rounded-full bg-background">
                <div className="text-center">
                  <div className="text-xs uppercase text-muted-foreground">Health</div>
                  <div className="font-mono text-2xl font-semibold">
                    {data.healthScore != null ? data.healthScore.toFixed(1) : "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-mono">{data.installed.length}</span> installed
              </div>
              <div>
                <span className="font-mono">{summary.tracked}</span> with telemetry
              </div>
              <div>
                <span className="font-mono">{summary.totalRuns.toLocaleString()}</span> runs (30d)
              </div>
            </div>
          </div>
        </header>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Installed</h2>
          {data.installed.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-surface p-10 text-center text-muted-foreground">
              You haven't installed any packages yet.
              <div className="mt-3">
                <Link
                  to="/marketplace"
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Browse marketplace
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.installed.map((p) => (
                <div
                  key={p.slug}
                  className="flex flex-col rounded-lg border border-border bg-surface p-4 transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase text-muted-foreground">{p.type}</div>
                      <Link
                        to="/marketplace/$packageId"
                        params={{ packageId: p.slug }}
                        className="mt-0.5 block truncate font-semibold hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <span>v{p.version}</span>
                        {p.outdated && (
                          <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                            update → v{p.latestVersion}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-muted-foreground">Trust</div>
                      <div className="font-mono text-sm font-semibold">
                        {p.trustScore != null ? p.trustScore.toFixed(1) : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Runs 30d </span>
                      <span className="font-mono">{p.runs30d.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Success </span>
                      <span className="font-mono">{fmtPct(p.successRate30d)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {p.outdated && (
                      <button
                        onClick={() => {
                          setBusy(p.slug);
                          updateMutation.mutate(p.slug);
                        }}
                        disabled={busy === p.slug}
                        className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {busy === p.slug ? "Updating…" : `Update → v${p.latestVersion}`}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!confirm(`Uninstall ${p.name}?`)) return;
                        setBusy(p.slug);
                        uninstallMutation.mutate(p.slug);
                      }}
                      disabled={busy === p.slug}
                      className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      {busy === p.slug && !p.outdated ? "Removing…" : "Uninstall"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">Recommended for you</h2>
          <p className="text-sm text-muted-foreground">
            Top free packages by install count, ranked by community ratings.
          </p>
          {data.recommended.length === 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
              No more public packages to recommend.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.recommended.map((p) => (
                <div
                  key={p.slug}
                  className="flex flex-col rounded-lg border border-border bg-surface p-4"
                >
                  <div className="text-xs uppercase text-muted-foreground">{p.type}</div>
                  <Link
                    to="/marketplace/$packageId"
                    params={{ packageId: p.slug }}
                    className="mt-0.5 font-semibold hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="text-muted-foreground">
                      <span className="font-mono">{p.installCount.toLocaleString()}</span> installs ·{" "}
                      <span className="font-mono">
                        {p.avgRating > 0 ? `★ ${p.avgRating.toFixed(1)}` : "no reviews"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setInstalling(p.slug);
                      installMutation.mutate(p.slug);
                    }}
                    disabled={installing === p.slug}
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {installing === p.slug ? "Installing…" : "Install"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
