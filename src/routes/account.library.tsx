import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { SitePage } from "@/components/site/SitePage";
import { getMyStars, toggleStar, type StarredPackage } from "@/lib/favorites/favorites.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account/library")({
  head: () => ({
    meta: [
      { title: "My library — Super Agent Skill" },
      {
        name: "description",
        content: "Packages you saved for later. Star any skill from its marketplace page.",
      },
    ],
  }),
  component: AccountLibraryPage,
});

function AccountLibraryPage() {
  const list = useServerFn(getMyStars);
  const toggle = useServerFn(toggleStar);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["account", "my-library"],
    queryFn: () => list(),
  });

  const unstarMut = useMutation({
    mutationFn: (slug: string) => toggle({ data: { slug } }),
    onSuccess: () => {
      toast.success("Removed from your library.");
      qc.invalidateQueries({ queryKey: ["account", "my-library"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Account</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">My library</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Packages you starred. Save any skill, playbook, soul, or guardrail from its
          marketplace page and it shows up here.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-surface">
          <div className="border-b border-border/60 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Saved packages
          </div>
          {q.isLoading && <div className="p-5 text-sm text-muted-foreground">Loading…</div>}
          {q.isError && (
            <div className="p-5 text-sm">
              <span className="text-destructive">Sign in to see your library.</span>{" "}
              <Link to="/login" className="text-primary">Sign in →</Link>
            </div>
          )}
          {q.data && q.data.packages.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">
              Nothing saved yet. Browse the{" "}
              <Link to="/marketplace" className="text-primary hover:underline">marketplace</Link>{" "}
              and hit <Star className="inline h-3.5 w-3.5 align-[-2px]" /> Save on any package.
            </div>
          )}
          {q.data && q.data.packages.length > 0 && (
            <ul className="divide-y divide-border/60">
              {(q.data.packages as StarredPackage[]).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/marketplace/$packageId"
                        params={{ packageId: p.slug }}
                        className="text-sm font-medium hover:text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      <Badge variant="secondary">{p.type}</Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        ★ {p.star_count}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {p.slug} · v{p.latest_version}
                    </div>
                    {p.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to="/marketplace/trust/$slug"
                      params={{ slug: p.slug }}
                      className="text-xs text-primary hover:underline"
                    >
                      Trust report →
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unstarMut.isPending}
                      onClick={() => unstarMut.mutate(p.slug)}
                      aria-label={`Remove ${p.name} from my library`}
                    >
                      Unstar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </SitePage>
  );
}
