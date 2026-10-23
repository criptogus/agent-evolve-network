import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { COMPARISONS } from "@/lib/seo/comparisons";
import { canonicalLink, SITE_URL } from "@/lib/seo/canonical";

export const Route = createFileRoute("/compare/")({
  head: () => ({
    meta: [
      { title: "Comparisons — Super Agent Skill vs the alternatives" },
      {
        name: "description",
        content:
          "How Super Agent Skill compares to prompt repos, in-house builds, untested marketplaces, fine-tuning, RAG, LangChain Hub, and custom GPTs — with signing and adversarial testing explained.",
      },
      { property: "og:title", content: "Comparisons — Super Agent Skill vs the alternatives" },
    ],
    links: [canonicalLink("/compare")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Super Agent Skill comparisons",
          url: `${SITE_URL}/compare`,
          hasPart: COMPARISONS.map((c) => ({
            "@type": "Article",
            headline: c.title,
            url: `${SITE_URL}/compare/${c.slug}`,
          })),
        }),
      },
    ],
  }),
  component: CompareIndexPage,
});

function CompareIndexPage() {
  return (
    <SitePage>
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-bold mb-2">Comparisons</h1>
        <p className="text-muted-foreground mb-8">
          Honest, factual breakdowns of how signed, adversarially tested skills compare to the
          alternatives — prompt repos, in-house builds, fine-tuning, RAG, and more.
        </p>
        <ul className="space-y-4">
          {COMPARISONS.map((c) => (
            <li key={c.slug}>
              <a href={`/compare/${c.slug}`} className="block border rounded-lg p-5 hover:bg-accent">
                <div className="font-semibold mb-1">{c.title}</div>
                <p className="text-sm text-muted-foreground">{c.metaDescription}</p>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a href="/marketplace" className="border rounded-lg p-5 hover:bg-accent">
            <div className="font-semibold mb-1">Browse verified skills →</div>
            <p className="text-sm text-muted-foreground">Trust Scores and adversarial pass rates on every listing.</p>
          </a>
          <a href="/connect" className="border rounded-lg p-5 hover:bg-accent">
            <div className="font-semibold mb-1">Connect via MCP →</div>
            <p className="text-sm text-muted-foreground">One URL installs the marketplace into any MCP-capable agent.</p>
          </a>
        </div>
      </main>
    </SitePage>
  );
}
