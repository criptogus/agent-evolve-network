import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { listPublicCollections } from "@/lib/collections/collections.functions";
export const Route = createFileRoute("/collections/")({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Math.max(0, Math.min(1000, Math.floor(Number(s.page) || 0))),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => listPublicCollections({ data: { page: deps.page } }),
  head: () => ({ meta: [{ title: "Community collections — Super Agent Skill" }] }),
  component: Collections,
});
function Collections() {
  const rows = Route.useLoaderData();
  const { page } = Route.useSearch();
  return (
    <SitePage>
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-3xl font-semibold">Community collections</h1>
        <p>Curated packages for a shared use case.</p>
        <Link to="/account/collections">Manage my collections</Link>
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((c) => (
            <Link
              key={c.id}
              to="/collections/$slug"
              params={{ slug: c.slug }}
              className="rounded-xl border p-5"
            >
              <h2 className="text-xl font-semibold">{c.title}</h2>
              <p>{c.description}</p>
            </Link>
          ))}
        </div>
        {!rows.length && <p>No collections on this page.</p>}
        <div className="flex gap-4">
          {page > 0 && (
            <Link to="/collections" search={{ page: page - 1 }}>
              Previous
            </Link>
          )}
          {rows.length === 24 && (
            <Link to="/collections" search={{ page: page + 1 }}>
              Next
            </Link>
          )}
        </div>
      </main>
    </SitePage>
  );
}
