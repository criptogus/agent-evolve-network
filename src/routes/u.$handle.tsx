import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { listMarketplace, type MarketplaceItem } from "@/lib/marketplace/list.functions";
import { TypeBadge } from "@/routes/marketplace.index";
import { PriceBadge } from "@/components/marketplace/BuyButton";

export const Route = createFileRoute("/u/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.handle.replace(/^@/, "")} — Creator on Super Agent Skill` },
      {
        name: "description",
        content: `All agent skills, playbooks and souls published by @${params.handle.replace(
          /^@/,
          ""
        )} on the Super Agent Skill marketplace.`,
      },
      {
        property: "og:title",
        content: `@${params.handle.replace(/^@/, "")} on Super Agent Skill`,
      },
    ],
  }),
  component: CreatorPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Creator not found</h1>
        <p className="mt-3 text-muted-foreground">
          We couldn't find any published packages by that handle.
        </p>
        <Link to="/marketplace" className="mt-6 inline-block text-primary hover:underline">
          ← Back to marketplace
        </Link>
      </div>
      <Footer />
    </div>
  ),
});

function CreatorPage() {
  const { handle } = Route.useParams();
  const fetchFn = useServerFn(listMarketplace);
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const normalized = handle.replace(/^@/, "").toLowerCase();
  const items = useMemo(() => {
    return (data?.items ?? []).filter(
      (p) => p.author_handle.replace(/^@/, "").toLowerCase() === normalized
    );
  }, [data, normalized]);

  if (!isLoading && data && items.length === 0) {
    throw notFound();
  }

  const totalInstalls = items.reduce((s, p) => s + p.install_count, 0);
  const verified = items.some((p) => p.author_verified);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
          <div className="text-xs text-muted-foreground">
            <Link to="/marketplace" className="hover:text-foreground">
              ← Marketplace
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div
              aria-hidden
              className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background font-mono text-xl"
            >
              {normalized.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight md:text-4xl">
                @{normalized}
                {verified && (
                  <span className="text-primary" title="Verified publisher">
                    ✓
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {items.length} package{items.length === 1 ? "" : "s"} ·{" "}
                {totalInstalls.toLocaleString()} total installs
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {isLoading && <p className="text-sm text-muted-foreground">Loading creator…</p>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items
            .sort((a, b) => b.install_count - a.install_count)
            .map((p) => (
              <CreatorCard key={p.id} p={p} />
            ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function CreatorCard({ p }: { p: MarketplaceItem }) {
  const linkProps =
    p.type === "soul"
      ? ({ to: "/souls/$slug", params: { slug: p.slug } } as const)
      : ({ to: "/marketplace/$packageId", params: { packageId: p.slug } } as const);
  return (
    <Link
      {...linkProps}
      className="group flex flex-col rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type={p.type} />
        <PriceBadge priceCredits={p.price_credits} />
      </div>
      <div className="mt-3 font-mono text-[15px] font-semibold leading-tight">{p.name}</div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-5 text-[11px] text-muted-foreground">
        {p.vertical ? (
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 uppercase tracking-wider">
            {p.vertical}
          </span>
        ) : (
          <span />
        )}
        <span className="font-mono">★ {p.install_count.toLocaleString()}</span>
      </div>
    </Link>
  );
}
