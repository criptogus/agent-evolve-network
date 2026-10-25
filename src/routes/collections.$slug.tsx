import { createFileRoute, notFound } from "@tanstack/react-router";
import { FollowCollection } from "@/components/collections/FollowCollection";
import { SitePage } from "@/components/site/SitePage";
import { getPublicCollection } from "@/lib/collections/collections.functions";

export const Route = createFileRoute("/collections/$slug")({
  loader: async ({ params }) => {
    const result = await getPublicCollection({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
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
          {collection.description && (
            <p className="text-muted-foreground mt-2">{collection.description}</p>
          )}
        </header>

        <FollowCollection id={collection.id} />
        <ol className="space-y-3">
          {items.map(
            (it, i) =>
              it.package && (
                <li key={it.package_id} className="border rounded p-4">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold">
                      <span className="text-muted-foreground mr-2">{i + 1}.</span>
                      <a
                        className="underline"
                        href={`/marketplace/${encodeURIComponent(it.package.slug)}?from_collection=${encodeURIComponent(collection.slug)}`}
                      >
                        {it.package.name}
                      </a>
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{it.package.description}</p>
                  {it.note && <p className="text-sm mt-2 italic">Curator note: {it.note}</p>}
                </li>
              ),
          )}
        </ol>

        <section className="mt-10 border-t pt-6 text-sm">
          <p>Install all of these with one shell loop:</p>
          <pre className="mt-2 p-3 bg-muted rounded overflow-x-auto">
            <code>
              {items
                .filter((i) => i.package && /^[a-z0-9][a-z0-9-]{1,63}$/.test(i.package.slug))
                .map((i) => `npx super-agent install '${i.package!.slug}'`)
                .join("\n")}
            </code>
          </pre>
        </section>
      </main>
    </SitePage>
  );
}
