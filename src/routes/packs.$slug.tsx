import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPack, purchasePack } from "@/lib/packs/packs.functions";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ShareOnXButton } from "@/components/share/ShareOnXButton";

export const Route = createFileRoute("/packs/$slug")({
  component: PackDetail,
  head: ({ params }) => ({
    meta: [
      { title: `Pack — ${params.slug}` },
      { name: "description", content: "A themed bundle of skills, playbooks and souls. Customizable to your niche." },
    ],
  }),
});

function PackDetail() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getPack);
  const buyFn = useServerFn(purchasePack);
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["pack", slug], queryFn: () => fn({ data: { slug } }) });

  const buy = useMutation({
    mutationFn: () => buyFn({ data: { pack_id: data!.pack.id } }),
    onSuccess: () => {
      toast.success("Pack purchased — you can customize it now.");
      qc.invalidateQueries({ queryKey: ["pack", slug] });
      qc.invalidateQueries({ queryKey: ["credits-summary"] });
      navigate({ to: "/packs/$slug/customize", params: { slug } });
    },
    onError: (e: any) => toast.error(String(e?.message || e)),
  });

  if (isLoading) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  if (!data) return <Shell><p>Pack not found.</p></Shell>;

  const { pack, items, owned } = data;

  return (
    <Shell>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <Link to="/packs" className="text-sm text-muted-foreground hover:underline">← All packs</Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-5xl">{pack.cover_emoji}</span>
            <h1 className="text-3xl font-bold tracking-tight">{pack.name}</h1>
            <Badge variant="outline" className="ml-2">{pack.theme}</Badge>
          </div>
          <p className="mt-3 text-muted-foreground">{pack.description}</p>
          {pack.long_description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pack.long_description}</p>
          )}
          <div className="mt-4">
            <ShareOnXButton
              slug={pack.slug}
              type="pack"
              name={pack.name}
              description={pack.description}
              url={`/packs/${pack.slug}`}
            />
          </div>
        </div>
        <Card className="w-72 shrink-0">
          <CardHeader>
            <div className="text-2xl font-bold">
              {pack.price_credits === 0 ? "Free" : `${pack.price_credits} credits`}
            </div>
            <p className="text-xs text-muted-foreground">{items.length} items • v{pack.latest_version}</p>
          </CardHeader>
          <CardContent>
            {!user && (
              <Button asChild className="w-full"><Link to="/login">Sign in to buy</Link></Button>
            )}
            {user && owned && (
              <Button asChild className="w-full">
                <Link to="/packs/$slug/customize" params={{ slug }}>Customize this pack</Link>
              </Button>
            )}
            {user && !owned && (
              <Button className="w-full" disabled={buy.isPending} onClick={() => buy.mutate()}>
                {buy.isPending ? "Processing…" : `Buy with ${pack.price_credits} credits`}
              </Button>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              After purchase you can customize the entire pack to your niche before download. The customizer always
              anchors on the state of the art.
            </p>
          </CardContent>
        </Card>
      </header>

      <h2 className="mb-3 text-lg font-semibold">What’s inside</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <Card key={it.package_id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{it.name}</CardTitle>
                <Badge variant={it.role === "core" ? "default" : "secondary"}>{it.role}</Badge>
              </div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{it.type}</p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{it.description}</CardContent>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto px-4 py-10">{children}</main>
      <Footer />
    </div>
  );
}
