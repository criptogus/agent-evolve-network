import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_emoji: string | null;
  curator_user_id: string;
  curator_share_bps: number;
};
type Item = {
  package_id: string;
  position: number;
  note: string | null;
  package: { slug: string; name: string; description: string | null } | null;
};

export const Route = createFileRoute("/collections/$slug")({
  loader: async ({ params }) => {
    const { data: c } = await supabaseAdmin
      .from("skill_collections")
      .select("id,slug,title,description,cover_emoji,curator_user_id,curator_share_bps,is_public")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!c || !(c as { is_public: boolean }).is_public) throw new Response("not found", { status: 404 });

    const { data: rows } = await supabaseAdmin
      .from("skill_collection_items")
      .select("package_id,position,note,packages(slug,name,description)")
      .eq("collection_id", (c as CollectionRow).id)
      .order("position", { ascending: true });
    const items = (rows ?? []).map((r: { packages: Item["package"] } & Record<string, unknown>) => ({
      ...r,
      package: r.packages,
    })) as Item[];

    return { collection: c as CollectionRow, items };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.collection.title} — collection on Super Agent Skill` },
      { name: "description", content: loaderData?.collection.description ?? "" },
      { property: "og:title", content: loaderData?.collection.title ?? "" },
    ],
  }),
  component: CollectionPage,
});

function CollectionPage() {
  const { collection, items } = Route.useLoaderData();
  return (
    <SitePage>
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8">
        <div className="text-5xl mb-2">{collection.cover_emoji ?? "📦"}</div>
        <h1 className="text-3xl font-bold">{collection.title}</h1>
        {collection.description && <p className="text-muted-foreground mt-2">{collection.description}</p>}
        <p className="text-xs text-muted-foreground mt-3">
          Curator earns {(collection.curator_share_bps / 100).toFixed(2)}% of every install attributed to this collection.
        </p>
      </header>

      <ol className="space-y-3">
        {items.map((it, i) => it.package && (
          <li key={it.package_id} className="border rounded p-4">
            <div className="flex justify-between items-baseline">
              <h3 className="font-semibold">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                <a className="underline" href={`/packs/${it.package.slug}?from_collection=${collection.slug}`}>
                  {it.package.name}
                </a>
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{it.package.description}</p>
            {it.note && <p className="text-sm mt-2 italic">Curator note: {it.note}</p>}
          </li>
        ))}
      </ol>

      <section className="mt-10 border-t pt-6 text-sm">
        <p>
          Install all of these with one shell loop:
        </p>
        <pre className="mt-2 p-3 bg-muted rounded overflow-x-auto"><code>
{`for s in ${items.map((i) => i.package?.slug).filter(Boolean).join(" ")}; do\n  npx super-agent install "$s"\ndone`}
        </code></pre>
      </section>
    </main>
    </SitePage>
  );
}
