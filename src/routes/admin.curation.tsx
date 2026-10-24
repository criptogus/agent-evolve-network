import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Footer } from "@/components/site/Footer";
import { getCatalogCuration } from "@/lib/admin/curation.functions";
export const Route = createFileRoute("/admin/curation")({
  head: () => ({ meta: [{ title: "Catalog curation — Super Agent Skill" }] }),
  component: Curation,
});
function Curation() {
  const get = useServerFn(getCatalogCuration);
  const q = useQuery({ queryKey: ["catalog-curation"], queryFn: () => get(), retry: false });
  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-semibold">Catalog curation</h1>
        <p>
          Find potentially overlapping published packages. Inspect contracts, examples, behavior and
          licensing before deciding whether packages should be consolidated. This report makes no
          changes.
        </p>
        {q.isPending && <p>Comparing catalog…</p>}
        {q.error && (
          <p role="alert">
            Unable to load this administrator-only report. Sign in with an administrator account.
          </p>
        )}
        {q.data && (
          <>
            <p>
              {q.data.packages} packages checked · {q.data.candidates.length} candidate pairs
            </p>
            <p className="text-sm text-muted-foreground">{q.data.method}</p>
            <a
              className="inline-block underline"
              download="catalog-curation.json"
              href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(q.data, null, 2))}`}
            >
              Download review report
            </a>
            {!q.data.candidates.length && (
              <p>
                No pairs meet the conservative overlap threshold. This does not establish behavioral
                uniqueness.
              </p>
            )}
            {q.data.candidates.map((p) => (
              <article key={`${p.left}:${p.right}`} className="rounded-xl border p-5">
                <div className="flex flex-wrap gap-3">
                  {[p.left, p.right].map((slug) => (
                    <Link
                      key={slug}
                      to="/marketplace/$packageId"
                      params={{ packageId: slug }}
                      className="underline"
                    >
                      {slug}
                    </Link>
                  ))}
                </div>
                <p className="mt-2">
                  {p.exact_name ? "Same name" : `${(p.score * 100).toFixed(1)}% lexical overlap`} ·{" "}
                  {p.same_license ? "Same license" : "Different licenses"} ·{" "}
                  {p.same_author ? "Same author" : "Different authors"}
                </p>
                <p className="mt-2 text-sm">Shared terms: {p.shared_terms.join(", ")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.review}</p>
              </article>
            ))}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
