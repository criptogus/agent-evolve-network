import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { TermsStatusBanner } from "@/components/site/TermsStatusBanner";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { CodeBlock } from "@/components/site/CodeBlock";
import { CopyButton, CodeBlockCopy } from "@/components/site/CopyButton";
import { TypingLines } from "@/components/site/Typewriter";
import { TypeBadge } from "./marketplace.index";
import type { Package, CompatibilityCheck } from "@/data/packages";
import { getPackageDetail } from "@/lib/marketplace/detail.functions";
import {
  installPackageBySlug,
  uninstallPackageBySlug,
  updatePackageBySlug,
  getInstallStatus,
  type InstallStatus,
} from "@/lib/marketplace/telemetry.functions";
import { useAuth } from "@/hooks/use-auth";
import { useRequireAuth } from "@/lib/require-auth";
import { toggleStar, isStarred, type StarState } from "@/lib/favorites/favorites.functions";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { ShareOnXButton } from "@/components/share/ShareOnXButton";

export const Route = createFileRoute("/marketplace/$packageId")({
  loader: async ({ params }) => {
    const result = await getPackageDetail({ data: { slug: params.packageId } });
    if (!result) throw notFound();
    return { pkg: result.pkg };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [] };
    const url = `https://superagentskill.com/marketplace/${params.packageId}`;
    return {
      meta: [
        { title: `${loaderData.pkg.name} — Super Agent Skill` },
        { name: "description", content: loaderData.pkg.description },
        { property: "og:title", content: `${loaderData.pkg.name} — Super Agent Skill` },
        { property: "og:description", content: loaderData.pkg.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: loaderData.pkg.name,
            description: loaderData.pkg.description,
            url,
            brand: { "@type": "Brand", name: loaderData.pkg.author ?? "Super Agent Skill" },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Package not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been unpublished or renamed.</p>
        <Link
          to="/marketplace"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Back to marketplace
        </Link>
      </div>
    </div>
  ),
  component: PackageDetail,
});

type Tab = "overview" | "versions" | "compatibility" | "changelog";

const MCP_GATEWAY_URL = "https://superagentskill.com/api/public/mcp";

function PackageDetail() {
  const { pkg } = Route.useLoaderData();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedVersion, setSelectedVersion] = useState(pkg.latest);
  const [installOpen, setInstallOpen] = useState(false);
  const [status, setStatus] = useState<InstallStatus | null>(null);
  const [uninstalling, setUninstalling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const statusFn = useServerFn(getInstallStatus);
  const isStarredFn = useServerFn(isStarred);
  const toggleStarFn = useServerFn(toggleStar);
  const [star, setStar] = useState<StarState | null>(null);
  const [starPending, setStarPending] = useState(false);

  useEffect(() => {
    if (!user) {
      setStar(null);
      return;
    }
    isStarredFn({ data: { slug: pkg.id } })
      .then((s) => setStar(s))
      .catch(() => setStar(null));
  }, [user, pkg.id, isStarredFn]);

  const handleToggleStar = async () => {
    if (!requireAuth("save this package to your library")) return;
    setStarPending(true);
    try {
      const next = await toggleStarFn({ data: { slug: pkg.id } });
      setStar(next);
    } finally {
      setStarPending(false);
    }
  };
  const uninstallFn = useServerFn(uninstallPackageBySlug);
  const updateFn = useServerFn(updatePackageBySlug);

  useEffect(() => {
    if (!user) {
      setStatus(null);
      return;
    }
    statusFn({ data: { slug: pkg.id } })
      .then((s) => setStatus(s))
      .catch(() => setStatus(null));
  }, [user, pkg.id, statusFn]);

  const installed = status?.installed ? (status.version ?? undefined) : undefined;
  const isUpgrade = !!installed && selectedVersion !== installed;
  const isOutdated = !!installed && installed !== pkg.latest;

  const refreshStatus = async () => {
    const fresh = await statusFn({ data: { slug: pkg.id } });
    setStatus(fresh);
  };

  const handleUninstall = async () => {
    if (!confirm(`Uninstall ${pkg.name}?`)) return;
    setUninstalling(true);
    try {
      await uninstallFn({ data: { slug: pkg.id } });
      await refreshStatus();
    } finally {
      setUninstalling(false);
    }
  };

  const handleUpdateToLatest = async () => {
    setUpdating(true);
    try {
      await updateFn({ data: { slug: pkg.id } });
      await refreshStatus();
      setSelectedVersion(pkg.latest);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Header */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <TermsStatusBanner className="mb-5" />
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link to="/marketplace" className="transition-colors hover:text-foreground">
              Marketplace
            </Link>
            <span aria-hidden className="px-1.5">
              /
            </span>
            <span className="capitalize">{pkg.type}</span>
            <span aria-hidden className="px-1.5">
              /
            </span>
            <span className="text-foreground">{pkg.name}</span>
          </nav>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <TypeBadge type={pkg.type} />
                <span className="font-mono text-[11px] text-muted-foreground">
                  v{pkg.latest} · {pkg.size} · {pkg.license}
                </span>
              </div>
              <h1 className="mt-3 truncate font-mono text-3xl font-semibold tracking-tight md:text-4xl">
                {pkg.name}
              </h1>
              <p className="mt-2 text-base text-muted-foreground">{pkg.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {pkg.vertical && (
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {pkg.vertical}
                  </span>
                )}
                {pkg.reviewStatus && <ReviewStatusPill status={pkg.reviewStatus} />}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {pkg.author}
                  {pkg.authorVerified && <VerifiedBadge />}
                </span>

                <span>
                  ★ {pkg.rating}{" "}
                  <span className="text-muted-foreground/60">({pkg.reviews.toLocaleString()})</span>
                </span>
                <span>{pkg.downloads} installs</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleToggleStar}
                  disabled={starPending}
                  aria-label={star?.starred ? "Remove from my library" : "Save to my library"}
                  aria-pressed={!!star?.starred}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
                    star?.starred
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Star
                    className="h-3.5 w-3.5"
                    fill={star?.starred ? "currentColor" : "none"}
                  />
                  {star?.starred ? "Saved" : "Save"}
                  {star != null && (
                    <span className="font-mono text-[11px] opacity-70">{star.star_count}</span>
                  )}
                </button>
                <ShareOnXButton
                  slug={pkg.id}
                  type={pkg.type as "skill" | "playbook" | "soul" | "guardrail"}
                  name={pkg.name}
                  description={pkg.description}
                  url={`/marketplace/${pkg.id}`}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1 overflow-x-auto">
            {(["overview", "versions", "compatibility", "changelog"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative px-4 py-3 text-sm font-medium capitalize transition-colors ${
                  tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
                {tab === t && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {tab === "overview" && <OverviewTab pkg={pkg} />}
        {tab === "versions" && (
          <VersionsTab pkg={pkg} selected={selectedVersion} onSelect={setSelectedVersion} />
        )}
        {tab === "compatibility" && <CompatibilityTab pkg={pkg} />}
        {tab === "changelog" && <ChangelogTab pkg={pkg} />}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <ReviewsSection slug={pkg.id} />
      </section>

      <Footer />

      {installOpen && (
        <InstallModal
          pkg={pkg}
          version={selectedVersion}
          isUpgrade={isUpgrade}
          onClose={() => setInstallOpen(false)}
          onInstalled={async () => {
            const fresh = await statusFn({ data: { slug: pkg.id } });
            setStatus(fresh);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Trust panel ---------------- */

function TrustPanel({ pkg }: { pkg: Package }) {
  const lastUpdated = pkg.versions[0]?.date ?? "—";
  const badgeMarkdown = `[![Trust Score](https://superagentskill.com/api/badges/trust/${pkg.id}.svg)](https://superagentskill.com/marketplace/${pkg.id})`;
  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-primary">Trust</div>
      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Review status</dt>
          <dd>
            {pkg.reviewStatus ? (
              <ReviewStatusPill status={pkg.reviewStatus} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Latest version</dt>
          <dd className="font-mono text-foreground">v{pkg.latest}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Last updated</dt>
          <dd className="text-foreground">{lastUpdated}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">License</dt>
          <dd className="font-mono text-foreground">{pkg.license}</dd>
        </div>
      </dl>
      <Link
        to="/marketplace/trust/$slug"
        params={{ slug: pkg.id }}
        className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-primary/40 bg-primary/5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        View full trust report →
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Embed trust badge in your README</span>
        <CopyButton value={badgeMarkdown} label="badge markdown" shortLabel="badge" />
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */

function OverviewTab({ pkg }: { pkg: Package }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">About this package</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{pkg.longDescription}</p>

        {pkg.systemPrompt && (
          <>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight">System prompt</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  The exact instructions this skill installs into your agent.
                </p>
              </div>
              <CopyButton value={pkg.systemPrompt} label="Copy system prompt" />
            </div>
            <div className="mt-3">
              <CodeBlock
                filename={`${pkg.id}.system-prompt.md`}
                lang="md"
                code={pkg.systemPrompt}
              />
            </div>
          </>
        )}

        <h3 className="mt-10 text-base font-semibold tracking-tight">Real-world examples</h3>
        <div className="mt-4 space-y-3">
          {pkg.examples.map((ex) => (
            <div key={ex.title} className="rounded-xl border border-border bg-surface p-5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-primary">
                {ex.title}
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                {ex.body}
              </pre>
            </div>
          ))}
        </div>

        <h3 className="mt-10 text-base font-semibold tracking-tight">Install via MCP</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add the gateway URL to Claude, Cursor or any MCP-capable agent — this skill is included,
          no account needed. Or use the CLI:
        </p>
        <div className="mt-4 space-y-2">
          <CodeBlockCopy code={MCP_GATEWAY_URL} label="MCP gateway URL" />
          <CodeBlockCopy code={`npx super-agent install ${pkg.id}`} label="CLI install" />
        </div>
      </div>

      {/* Side metrics */}
      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-background p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-primary">
            Performance
          </div>
          <div className="mt-3 space-y-3">
            {pkg.metrics.map((m) => (
              <div key={m.label} className="flex items-end justify-between">
                <div className="text-sm text-muted-foreground">{m.label}</div>
                <div className="text-right">
                  <div className="text-base font-semibold">{m.value}</div>
                  {m.delta && <div className="text-[11px] text-signal">{m.delta}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-primary">
            Dependencies
          </div>
          {pkg.dependencies.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No dependencies. Standalone package.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pkg.dependencies.map((d) => (
                <li key={d.name} className="flex items-center justify-between font-mono text-xs">
                  <span className="text-foreground">{d.name}</span>
                  <span className="text-muted-foreground">{d.version}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-background p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-primary">
            Required scopes
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pkg.scopes.map((s) => (
              <span
                key={s}
                className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function VersionsTab({
  pkg,
  selected,
  onSelect,
}: {
  pkg: Package;
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3">Version</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Released</th>
            <th className="px-5 py-3">Notes</th>
            <th className="px-5 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {pkg.versions.map((v) => (
            <tr key={v.version} className="border-t border-border bg-background">
              <td className="px-5 py-4 font-mono font-semibold">{v.version}</td>
              <td className="px-5 py-4">
                <StatusPill status={v.status} />
              </td>
              <td className="px-5 py-4 text-muted-foreground">{v.date}</td>
              <td className="px-5 py-4 text-muted-foreground">{v.notes}</td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={() => onSelect(v.version)}
                  className={`rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase transition-colors ${
                    selected === v.version
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {selected === v.version ? "selected" : "select"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompatibilityTab({ pkg }: { pkg: Package }) {
  return (
    <div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Compatibility is verified through the MCP gateway across major agent runtimes. Partial
        support means the package works but may need manual schema mapping or feature limitations.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {pkg.compatibility.map((c) => (
          <CompatRow key={c.runtime} c={c} />
        ))}
      </div>
    </div>
  );
}

function CompatRow({ c }: { c: CompatibilityCheck }) {
  const conf =
    c.status === "supported"
      ? { dot: "bg-signal", label: "Supported", text: "text-foreground" }
      : c.status === "partial"
        ? { dot: "bg-amber-500", label: "Partial", text: "text-foreground" }
        : { dot: "bg-primary", label: "Unsupported", text: "text-muted-foreground" };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
      <span className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${conf.dot}`} />
      <div className="min-w-0">
        <div className={`font-medium ${conf.text}`}>{c.runtime}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{c.detail}</div>
      </div>
      <span className="ml-auto rounded border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
        {conf.label}
      </span>
    </div>
  );
}

function ChangelogTab({ pkg }: { pkg: Package }) {
  return (
    <div className="space-y-5">
      {pkg.versions.map((v) => (
        <div key={v.version} className="rounded-xl border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <div className="font-mono text-base font-semibold">v{v.version}</div>
            <StatusPill status={v.status} />
            <span className="ml-auto font-mono text-xs text-muted-foreground">{v.date}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{v.notes}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Bits ---------------- */

function StatusPill({ status }: { status: "stable" | "beta" | "deprecated" }) {
  const cls =
    status === "stable"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : status === "beta"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
        : "border-border bg-surface text-muted-foreground";
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}

function VerifiedBadge() {
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
      title="Verified author"
    >
      ✓
    </span>
  );
}

function ReviewStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: {
      label: "✓ Approved",
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    pending: {
      label: "⏳ Pending review",
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    rejected: {
      label: "✕ Rejected",
      cls: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    },
  };
  const conf = map[status] ?? {
    label: status,
    cls: "border-border bg-muted/40 text-muted-foreground",
  };
  return (
    <span
      className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${conf.cls}`}
    >
      {conf.label}
    </span>
  );
}

function CompatibilitySummary({ checks }: { checks: CompatibilityCheck[] }) {
  const supported = checks.filter((c) => c.status === "supported").length;
  const partial = checks.filter((c) => c.status === "partial").length;
  const unsupported = checks.filter((c) => c.status === "unsupported").length;
  return (
    <div className="mt-4 rounded-md border border-border bg-surface p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Compatibility
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          {supported}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {partial}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {unsupported}
        </span>
        <span className="ml-auto text-muted-foreground">{checks.length} runtimes</span>
      </div>
    </div>
  );
}

/* ---------------- Install Modal ---------------- */

type InstallPhase = "preflight" | "installing" | "done" | "failed";

function InstallModal({
  pkg,
  version,
  isUpgrade,
  onClose,
  onInstalled,
}: {
  pkg: Package;
  version: string;
  isUpgrade: boolean;
  onClose: () => void;
  onInstalled?: () => void | Promise<void>;
}) {
  const [runtime, setRuntime] = useState(pkg.compatibility[0].runtime);
  const [phase, setPhase] = useState<InstallPhase>("preflight");
  const [error, setError] = useState<string | null>(null);
  const installFn = useServerFn(installPackageBySlug);

  const compat = pkg.compatibility.find((c) => c.runtime === runtime)!;
  const blocked = compat.status === "unsupported";

  const installLines = [
    `> Super Agent Skill: ${isUpgrade ? "upgrade" : "install"} ${pkg.name}@${version}`,
    "",
    `→ Target runtime................. ${runtime}`,
    `→ Scopes requested............... ${pkg.scopes.join(", ")}`,
    "",
    `Registering install with your library…`,
  ];

  useEffect(() => {
    if (phase !== "installing") return;
    let cancelled = false;
    (async () => {
      try {
        await installFn({ data: { slug: pkg.id, version } });
        if (cancelled) return;
        await onInstalled?.();
        if (cancelled) return;
        setPhase("done");
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Install failed";
        setError(msg);
        setPhase("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, installFn, pkg.id, version, onInstalled]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-primary">
              {isUpgrade ? "Upgrade" : "Install"} via MCP
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold">
              {pkg.name}@{version}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {phase === "preflight" && (
          <div className="space-y-5 p-6">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Target runtime
              </label>
              <select
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {pkg.compatibility.map((c) => (
                  <option key={c.runtime} value={c.runtime}>
                    {c.runtime} · {c.status}
                  </option>
                ))}
              </select>
            </div>

            <PreflightItem
              label="Compatibility check"
              ok={!blocked}
              warn={compat.status === "partial"}
              detail={compat.detail}
            />
            <PreflightItem
              label="Dependency resolution"
              ok
              detail={
                pkg.dependencies.length === 0
                  ? "No dependencies"
                  : pkg.dependencies.map((d) => `${d.name}@${d.version}`).join(", ")
              }
            />
            <PreflightItem
              label="Scope authorization"
              ok
              detail={`Will request: ${pkg.scopes.join(", ")}`}
            />

            {blocked && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
                <span className="font-mono text-primary">Blocked:</span> {compat.detail} Switch
                runtime or wait for support.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                disabled={blocked}
                onClick={() => setPhase("installing")}
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpgrade ? "Run upgrade" : "Run install"}
              </button>
            </div>
          </div>
        )}

        {phase === "installing" && (
          <div className="overflow-hidden bg-[oklch(0.14_0.01_270)]">
            <div className="px-5 pt-3 font-mono text-[10px] uppercase tracking-wider text-white/40">
              Illustration — install is running via the MCP gateway
            </div>
            <TypingLines
              lines={installLines}
              speed={14}
              startDelay={150}
              className="min-h-[260px] px-5 py-5 font-mono text-[13px] leading-relaxed text-white/90"
              lineClassName={(l) =>
                l.startsWith("●")
                  ? "text-signal font-semibold"
                  : l.startsWith("→")
                    ? "text-white/80"
                    : l.startsWith(">")
                      ? "text-primary"
                      : ""
              }
            />
          </div>
        )}

        {phase === "failed" && (
          <div className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              !
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Install failed</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {error ?? "Something went wrong."}
              </div>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setPhase("installing");
                }}
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-95"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal text-xl font-bold text-signal-foreground">
              ✓
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">
                {pkg.name}@{version} {isUpgrade ? "upgraded" : "installed"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Your agent's Trust Score has been updated.
              </div>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Close
              </button>
              <Link
                to="/marketplace"
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95"
              >
                Find more packages →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreflightItem({
  label,
  ok,
  warn,
  detail,
}: {
  label: string;
  ok: boolean;
  warn?: boolean;
  detail: string;
}) {
  const conf = !ok
    ? { dot: "bg-primary", txt: "text-primary" }
    : warn
      ? { dot: "bg-amber-500", txt: "text-amber-700" }
      : { dot: "bg-signal", txt: "text-foreground" };
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-3">
      <span className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${conf.dot}`} />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${conf.txt}`}>{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
