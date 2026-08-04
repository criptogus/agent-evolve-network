import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { TermsStatusBanner } from "@/components/site/TermsStatusBanner";
import { listMarketplace, type MarketplaceItem } from "@/lib/marketplace/list.functions";
import { isTrustDemoted, TRUST_TIER_RANK, trustTier } from "@/lib/marketplace/trust-tiers";
import { PackageCard } from "@/components/marketplace/PackageCard";
import { AuthorLink } from "@/components/marketplace/AuthorLink";
import {
  BarChart3,
  Bot,
  FolderOpen,
  Palette,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trophy,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

export { AuthorLink };

export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Marketplace — Super Agent Skill" },
      {
        name: "description",
        content:
          "Browse the live registry of skills, playbooks, souls (incl. famous founders & operators) and guardrails. Search by name, person and category.",
      },
      { property: "og:title", content: "Marketplace — Super Agent Skill" },
      { property: "og:description", content: "Live registry of skills, playbooks, souls and guardrails for AI agents." },
      { property: "og:url", content: "https://superagentskill.com/marketplace" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/marketplace" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Super Agent Skill Marketplace",
          description: "Live registry of skills, playbooks, souls and guardrails for AI agents.",
          url: "https://superagentskill.com/marketplace",
        }),
      },
    ],
  }),
  component: Marketplace,
});

const TYPES = ["all", "skill", "playbook", "soul", "guardrail"] as const;
type TypeFilter = (typeof TYPES)[number];

const SORTS = [
  { value: "trust_desc", label: "Highest Trust Score", group: "Trust" },
  { value: "trust_asc", label: "Lowest Trust Score", group: "Trust" },
  { value: "rating_desc", label: "Highest rated", group: "Rating" },
  { value: "rating_count_desc", label: "Most reviewed", group: "Rating" },
  { value: "installs_desc", label: "Most installed", group: "Installs" },
  { value: "installs_asc", label: "Least installed", group: "Installs" },
  { value: "version_desc", label: "Highest version", group: "Version" },
  { value: "version_asc", label: "Lowest version", group: "Version" },
  { value: "recent", label: "Newest added", group: "Other" },
  { value: "name_asc", label: "Name A→Z", group: "Other" },
] as const;
type SortKey = (typeof SORTS)[number]["value"];
const SORT_GROUPS = Array.from(new Set(SORTS.map((s) => s.group)));

/** Semver-ish comparison; missing/odd segments sort low. */
function compareVersions(a: string, b: string): number {
  const pa = (a ?? "").split(/[.\-+]/);
  const pb = (b ?? "").split(/[.\-+]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = Number.parseInt(pa[i] ?? "", 10);
    const nb = Number.parseInt(pb[i] ?? "", 10);
    const va = Number.isNaN(na) ? -1 : na;
    const vb = Number.isNaN(nb) ? -1 : nb;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/** Debounce so typing doesn't re-filter/re-render the grid on every keystroke. */
function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}


const INSTALL_BUCKETS = [
  { value: "any", label: "Any installs", min: 0, max: Infinity },
  { value: "1plus", label: "1+", min: 1, max: Infinity },
  { value: "100plus", label: "100+", min: 100, max: Infinity },
  { value: "1k", label: "1k+", min: 1000, max: Infinity },
  { value: "10k", label: "10k+", min: 10000, max: Infinity },
] as const;
type InstallBucket = (typeof INSTALL_BUCKETS)[number]["value"];

const VERTICAL_GROUPS: {
  value: string;
  label: string;
  icon: LucideIcon;
  verticals: readonly string[];
}[] = [
  { value: "all", label: "All", icon: Sparkles, verticals: [] },
  {
    value: "shop_restaurant",
    label: "Shop & Restaurant",
    icon: ShoppingBag,
    verticals: ["retail", "restaurant", "operations", "customer-experience"],
  },
  { value: "data", label: "Data", icon: BarChart3, verticals: ["data"] },
  { value: "mobile", label: "Mobile", icon: Smartphone, verticals: ["mobile"] },
  {
    value: "creative",
    label: "Creative",
    icon: Palette,
    verticals: ["creative", "productivity", "strategy", "career", "marketing"],
  },
];

function Marketplace() {
  const fetchFn = useServerFn(listMarketplace);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const [type, setType] = useState<TypeFilter>("all");
  /** Multi-select category tags — empty means "all categories". */
  const [tags, setTags] = useState<string[]>([]);
  const [verticalGroup, setVerticalGroup] = useState<string>("all");
  const [qInput, setQInput] = useState("");
  const q = useDebounced(qInput, 250);
  const searching = qInput.trim() !== q.trim();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [installBucket, setInstallBucket] = useState<InstallBucket>("any");
  const [sort, setSort] = useState<SortKey>("installs_desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const items = data?.items ?? [];
  const verticals = data?.verticals ?? [];

  function toggleTag(v: string) {
    setVerticalGroup("all");
    setTags((prev) => (prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v]));
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const bucket = INSTALL_BUCKETS.find((b) => b.value === installBucket)!;
    const result = items.filter((p) => {
      if (type !== "all" && p.type !== type) return false;
      if (tags.length && (!p.vertical || !tags.includes(p.vertical))) return false;
      if (verticalGroup !== "all") {
        const grp = VERTICAL_GROUPS.find((g) => g.value === verticalGroup);
        if (grp && (!p.vertical || !(grp.verticals as readonly string[]).includes(p.vertical))) return false;
      }
      if (verifiedOnly && !p.author_verified) return false;
      if (p.install_count < bucket.min || p.install_count > bucket.max) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.author_handle.toLowerCase().includes(needle) ||
        (p.vertical?.toLowerCase().includes(needle) ?? false)
      );
    });
    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sort) {
        case "installs_desc": {
          // Default sort only: curation demotion. Unscored / below-Baseline
          // packages sort after trust-scored ones (nothing is hidden); order
          // within each group stays install-count based.
          const demoteA = isTrustDemoted(trustTier(a.trust_score, a.trust_verified)) ? 1 : 0;
          const demoteB = isTrustDemoted(trustTier(b.trust_score, b.trust_verified)) ? 1 : 0;
          if (demoteA !== demoteB) return demoteA - demoteB;
          return b.install_count - a.install_count;
        }
        case "trust_desc": {
          const tierA = trustTier(a.trust_score, a.trust_verified);
          const tierB = trustTier(b.trust_score, b.trust_verified);
          if (TRUST_TIER_RANK[tierA] !== TRUST_TIER_RANK[tierB])
            return TRUST_TIER_RANK[tierA] - TRUST_TIER_RANK[tierB];
          return (b.trust_score ?? -1) - (a.trust_score ?? -1) || b.install_count - a.install_count;
        }
        case "trust_asc":
          return (a.trust_score ?? -1) - (b.trust_score ?? -1) || a.install_count - b.install_count;
        case "installs_asc":
          return a.install_count - b.install_count;
        case "rating_desc":
          return (b.rating_avg || 0) - (a.rating_avg || 0) || b.rating_count - a.rating_count;
        case "rating_count_desc":
          return b.rating_count - a.rating_count || (b.rating_avg || 0) - (a.rating_avg || 0);
        case "version_desc":
          return (
            compareVersions(b.latest_version, a.latest_version) ||
            b.install_count - a.install_count
          );
        case "version_asc":
          return (
            compareVersions(a.latest_version, b.latest_version) ||
            a.install_count - b.install_count
          );
        case "recent":
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "name_asc":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    return sorted;
  }, [items, type, tags, verticalGroup, q, verifiedOnly, installBucket, sort]);

  const typeCounts = useMemo(() => {
    const base: Record<TypeFilter, number> = {
      all: items.length,
      skill: 0,
      playbook: 0,
      soul: 0,
      guardrail: 0,
    };
    for (const it of items) base[it.type]++;
    return base;
  }, [items]);

  const groupChips = useMemo(
    () =>
      VERTICAL_GROUPS.map((g) => ({
        ...g,
        count:
          g.value === "all"
            ? items.length
            : items.filter((it) => it.vertical && g.verticals.includes(it.vertical)).length,
      })).filter((g) => g.count > 0),
    [items],
  );

  const verticalCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) if (it.vertical) map.set(it.vertical, (map.get(it.vertical) ?? 0) + 1);
    return map;
  }, [items]);

  const totalInstalls = useMemo(() => items.reduce((s, it) => s + it.install_count, 0), [items]);
  const dirty =
    !!qInput ||
    type !== "all" ||
    tags.length > 0 ||
    verticalGroup !== "all" ||
    verifiedOnly ||
    installBucket !== "any" ||
    sort !== "installs_desc";

  const activeChips: { key: string; label: string; clear: () => void }[] = [
    ...(q.trim() ? [{ key: "q", label: `“${q.trim()}”`, clear: () => setQInput("") }] : []),
    ...(type !== "all" ? [{ key: "type", label: type, clear: () => setType("all") }] : []),
    ...tags.map((t) => ({ key: `tag:${t}`, label: t, clear: () => toggleTag(t) })),
    ...(verticalGroup !== "all"
      ? [
          {
            key: "group",
            label: VERTICAL_GROUPS.find((g) => g.value === verticalGroup)?.label ?? verticalGroup,
            clear: () => setVerticalGroup("all"),
          },
        ]
      : []),
    ...(verifiedOnly
      ? [{ key: "verified", label: "Verified authors", clear: () => setVerifiedOnly(false) }]
      : []),
    ...(installBucket !== "any"
      ? [
          {
            key: "installs",
            label: `${INSTALL_BUCKETS.find((b) => b.value === installBucket)?.label} installs`,
            clear: () => setInstallBucket("any"),
          },
        ]
      : []),
  ];

  function reset() {
    setQInput("");
    setType("all");
    setTags([]);
    setVerticalGroup("all");
    setVerifiedOnly(false);
    setInstallBucket("any");
    setSort("installs_desc");
  }


  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero — centered directory intro */}
      <section className="relative overflow-hidden border-b border-border bg-surface/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-14 pt-12 text-center md:pt-16">
          <TermsStatusBanner className="mb-6 text-left" />
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            Live registry
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Tested capabilities for your agents
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
            Skills, playbooks, souls and guardrails — each with a Trust Score from adversarial
            testing. Search by name, person (e.g. <em>Musk</em>, <em>Buffett</em>) or category.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{data ? items.length.toLocaleString("en-US") : "—"}</strong>{" "}
              packages
            </span>
            <span>
              <strong className="text-foreground">{data ? totalInstalls.toLocaleString("en-US") : "—"}</strong>{" "}
              installs
            </span>
            {verticals.length > 0 && (
              <span>
                <strong className="text-foreground">{verticals.length}</strong> categories
              </span>
            )}
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <QuickLink to="/discover" icon={Trophy} label="Most installed" />
            <QuickLink to="/marketplace/categories" icon={FolderOpen} label="Browse by category" />
            <QuickLink to="/marketplace/rankings" icon={Bot} label="Humans vs Agents" />
          </div>
        </div>
      </section>

      {/* Sticky toolbar — search + filters + order by */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search packages…"
              aria-label="Search packages"
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-10 text-sm outline-none focus:border-primary"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:border-primary/40 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filters
            </button>
            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
              <span className="text-muted-foreground">Order by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Order by"
                className="bg-transparent text-sm font-medium outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Sidebar + grid */}
      <section className="mx-auto max-w-7xl gap-10 px-6 py-10 lg:grid lg:grid-cols-[224px_1fr]">
        <aside className={`${filtersOpen ? "block" : "hidden"} mb-8 lg:mb-0 lg:block`}>
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
            <FilterGroup title="Type">
              {TYPES.map((t) => (
                <FilterRow
                  key={t}
                  active={type === t}
                  count={typeCounts[t]}
                  label={t === "all" ? "All types" : t}
                  onClick={() => setType(t)}
                />
              ))}
            </FilterGroup>

            {groupChips.filter((g) => g.value !== "all").length >= 2 && (
              <FilterGroup title="Collection">
                {groupChips.map((g) => (
                  <FilterRow
                    key={g.value}
                    active={verticalGroup === g.value}
                    count={g.count}
                    label={g.label}
                    icon={g.icon}
                    onClick={() => {
                      setVerticalGroup(g.value);
                      setVertical("all");
                    }}
                  />
                ))}
              </FilterGroup>
            )}

            {verticals.length > 0 && (
              <FilterGroup title="Category">
                <FilterRow
                  active={vertical === "all"}
                  count={items.length}
                  label="All categories"
                  onClick={() => {
                    setVertical("all");
                    setVerticalGroup("all");
                  }}
                />
                {verticals.map((v) => (
                  <FilterRow
                    key={v}
                    active={vertical === v}
                    count={verticalCounts.get(v) ?? 0}
                    label={v}
                    onClick={() => {
                      setVertical(v);
                      setVerticalGroup("all");
                    }}
                  />
                ))}
              </FilterGroup>
            )}

            <FilterGroup title="Refine">
              <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  Verified authors
                </span>
              </label>
              <label className="mt-2 block text-xs text-muted-foreground">
                Installs
                <select
                  value={installBucket}
                  onChange={(e) => setInstallBucket(e.target.value as InstallBucket)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  {INSTALL_BUCKETS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
            </FilterGroup>

            {dirty && (
              <button
                onClick={reset}
                className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40 hover:text-primary"
              >
                Reset all filters
              </button>
            )}
          </div>
        </aside>

        <div>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                "Loading registry…"
              ) : (
                <>
                  <strong className="text-foreground">{filtered.length.toLocaleString("en-US")}</strong>{" "}
                  {filtered.length === 1 ? "package" : "packages"}
                  {dirty && <> of {items.length.toLocaleString("en-US")}</>}
                </>
              )}
            </p>
          </div>

          {isLoading && <SkeletonGrid />}
          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              Couldn't load the registry. Please refresh.
            </div>
          )}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm font-medium">No packages match your filters.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search term, or{" "}
                <button onClick={reset} className="text-primary hover:underline">
                  reset all filters
                </button>
                .
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p: MarketplaceItem) => (
              <PackageCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Link>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterRow({
  active,
  count,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
        active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      <span className="truncate capitalize">{label}</span>
      <span className="ml-auto font-mono text-[11px] opacity-70">{count}</span>
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-muted/20" />
      ))}
    </div>
  );
}

export function TypeBadge({ type }: { type: MarketplaceItem["type"] }) {
  const cls =
    type === "skill"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : type === "playbook"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : type === "soul"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return (
    <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {type}
    </span>
  );
}
