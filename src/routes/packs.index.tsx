import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPacks } from "@/lib/packs/packs.functions";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/packs/")({
  component: PacksIndex,
  head: () => ({
    meta: [
      { title: "Packs — Themed bundles of skills, playbooks & souls" },
      {
        name: "description",
        content:
          "Buy a complete, themed pack (Content Writer, GTM, CRM/Sales) and customize it for your niche before download. Always anchored on the state of the art.",
      },
    ],
  }),
});

function PacksIndex() {
  const fn = useServerFn(listPacks);
  const { data, isLoading } = useQuery({ queryKey: ["packs"], queryFn: () => fn() });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto px-4 py-12">
        <header className="mb-10 max-w-3xl">
          <Badge variant="outline">New</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Packs</h1>
          <p className="mt-3 text-muted-foreground">
            Curated, themed bundles of skills, playbooks, guardrails and souls. Buy with credits, then customize the
            entire pack to your niche — anchored on the state of the art.
          </p>
        </header>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(data?.packs ?? []).map((p) => (
            <Link key={p.id} to="/packs/$slug" params={{ slug: p.slug }} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-lg">
                <CardHeader>
                  <div className="text-4xl">{p.cover_emoji}</div>
                  <CardTitle className="mt-2 group-hover:text-primary">{p.name}</CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{p.item_count} items</span>
                  <span className="font-semibold text-foreground">
                    {p.price_credits === 0 ? "Free" : `${p.price_credits} credits`}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
