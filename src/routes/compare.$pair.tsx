import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { findComparison, type Comparison } from "@/lib/seo/comparisons";
import { canonicalLink, SITE_URL } from "@/lib/seo/canonical";
const supabaseAdmin = _supabaseAdmin as any;

// SEO landing: /compare/<slug-a>-vs-<slug-b>
// Auto-generated head-to-head scorecard. Programmatic SEO — one URL per pair,
// indexed by Google, links back to each package + signup CTA.

type Side = {
  slug: string;
  name: string | null;
  description: string | null;
  trust_score: number | null;
  adversarial_pass_rate: number | null;
  installs_7d: number | null;
};

async function loadSide(slug: string): Promise<Side> {
  const { data: pkg } = await supabaseAdmin
    .from("packages").select("id,slug,name,description").eq("slug", slug).maybeSingle();
  if (!pkg) return { slug, name: null, description: null, trust_score: null, adversarial_pass_rate: null, installs_7d: null };
  const [{ data: trust }, { data: perf }] = await Promise.all([
    supabaseAdmin.from("package_trust_scores").select("score,adversarial_pass_rate").eq("package_id", pkg.id).maybeSingle(),
    supabaseAdmin.from("skill_performance_daily").select("runs").eq("package_id", pkg.id).gte("day", new Date(Date.now() - 7 * 86400_000).toISOString()),
  ]);
  return {
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.description,
    trust_score: trust?.score ?? null,
    adversarial_pass_rate: trust?.adversarial_pass_rate ?? null,
    installs_7d: (perf ?? []).reduce((s, r: { runs: number | null }) => s + (r.runs ?? 0), 0) || null,
  };
}

type LoaderData =
  | { kind: "editorial"; comparison: Comparison }
  | { kind: "pair"; left: Side; right: Side };

export const Route = createFileRoute("/compare/$pair")({
  loader: async ({ params }): Promise<LoaderData> => {
    // Curated editorial comparisons take precedence over package pairs.
    const comparison = findComparison(params.pair);
    if (comparison) return { kind: "editorial", comparison };
    const m = params.pair.match(/^([a-z0-9-]+)-vs-([a-z0-9-]+)$/);
    if (!m) throw new Response("invalid pair", { status: 400 });
    const [, a, b] = m;
    const [left, right] = await Promise.all([loadSide(a), loadSide(b)]);
    return { kind: "pair", left, right };
  },
  head: ({ loaderData, params }) => {
    if (loaderData?.kind === "editorial") {
      const c = loaderData.comparison;
      const url = `${SITE_URL}/compare/${c.slug}`;
      return {
        meta: [
          { title: `${c.title} — Super Agent Skill` },
          { name: "description", content: c.metaDescription },
          { property: "og:title", content: c.title },
          { property: "og:description", content: c.metaDescription },
          { property: "og:type", content: "article" },
          { property: "og:url", content: url },
        ],
        links: [canonicalLink(`/compare/${c.slug}`)],
        scripts: [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: c.faqs.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            }),
          },
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: c.title,
              description: c.metaDescription,
              url,
              author: { "@type": "Organization", name: "Super Agent Skill" },
              publisher: { "@type": "Organization", name: "Super Agent Skill", url: SITE_URL },
            }),
          },
        ],
      };
    }
    const left = loaderData?.kind === "pair" ? loaderData.left : null;
    const right = loaderData?.kind === "pair" ? loaderData.right : null;
    return {
      meta: [
        { title: `${left?.slug ?? ""} vs ${right?.slug ?? ""} — Super Agent Skill` },
        { name: "description", content: `Head-to-head comparison of ${left?.name ?? left?.slug} and ${right?.name ?? right?.slug} on trust score, adversarial robustness, and recent usage.` },
      ],
      links: params?.pair ? [canonicalLink(`/compare/${params.pair}`)] : [],
    };
  },
  component: ComparePage,
});

function ComparePage() {
  const data = Route.useLoaderData();
  if (data.kind === "editorial") return <EditorialCompare comparison={data.comparison} />;
  const { left, right } = data;
  return (
    <SitePage>
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-2">
        {left.name ?? left.slug} <span className="text-muted-foreground">vs</span> {right.name ?? right.slug}
      </h1>
      <p className="text-muted-foreground mb-8">
        Trust Score, adversarial robustness, and recent usage. Updated automatically from the Super Agent Skill registry.
      </p>

      <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-3 pr-4 text-left text-sm font-medium text-muted-foreground">Metric</th>
              <th className="py-3 px-4 text-left text-sm font-medium">{left.slug}</th>
              <th className="py-3 pl-4 text-left text-sm font-medium">{right.slug}</th>
            </tr>
          </thead>
          <tbody>
            <ScoreRow label="Trust score" l={left.trust_score} r={right.trust_score} />
            <ScoreRow label="Adversarial pass rate" l={left.adversarial_pass_rate} r={right.adversarial_pass_rate} />
            <NumberRow label="Installs (7d)" l={left.installs_7d} r={right.installs_7d} />
            <TextRow label="Description" l={left.description} r={right.description} />
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <a href={`/packs/${left.slug}`} className="border rounded p-4 hover:bg-accent">
          Open {left.slug} →
        </a>
        <a href={`/packs/${right.slug}`} className="border rounded p-4 hover:bg-accent">
          Open {right.slug} →
        </a>
      </div>

      <p className="text-sm text-muted-foreground mt-8">
        Embed either trust score badge in your README:
        <code className="block mt-2 p-2 bg-muted rounded">{`![trust](/api/badges/trust/${left.slug}.svg)`}</code>
      </p>
    </main>
    </SitePage>
  );
}

function ScoreRow({ label, l, r }: { label: string; l: number | null; r: number | null }) {
  return (
    <tr className="border-b">
      <td className="py-3 pr-4 align-middle text-sm font-medium">{label}</td>
      <td className="py-3 px-4 align-middle"><ScoreBar value={l} /></td>
      <td className="py-3 pl-4 align-middle"><ScoreBar value={r} /></td>
    </tr>
  );
}

function NumberRow({ label, l, r }: { label: string; l: number | null; r: number | null }) {
  return (
    <tr className="border-b">
      <td className="py-3 pr-4 align-middle text-sm font-medium">{label}</td>
      <td className="py-3 px-4 align-middle font-mono text-sm">{l ?? "—"}</td>
      <td className="py-3 pl-4 align-middle font-mono text-sm">{r ?? "—"}</td>
    </tr>
  );
}

function TextRow({ label, l, r }: { label: string; l: string | null; r: string | null }) {
  return (
    <tr className="border-b">
      <td className="py-3 pr-4 align-top text-sm font-medium">{label}</td>
      <td className="py-3 px-4 align-top text-sm text-muted-foreground">{l ?? "—"}</td>
      <td className="py-3 pl-4 align-top text-sm text-muted-foreground">{r ?? "—"}</td>
    </tr>
  );
}

function ScoreBar({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const pct = Math.max(0, Math.min(1, Number(value)));
  const color =
    pct >= 0.85 ? "bg-emerald-500"
    : pct >= 0.70 ? "bg-yellow-500"
    : pct >= 0.50 ? "bg-orange-500"
    : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="font-mono text-sm tabular-nums">{(pct * 100).toFixed(0)}%</span>
    </div>
  );
}

function pct(n: number | null): string {
  return n === null ? "—" : `${(Number(n) * 100).toFixed(0)}%`;
}

function EditorialCompare({ comparison: c }: { comparison: Comparison }) {
  return (
    <SitePage>
      <main className="mx-auto max-w-3xl p-6">
        <nav className="mb-4 text-sm text-muted-foreground">
          <a href="/compare" className="hover:underline">Comparisons</a>
          <span className="mx-2">/</span>
          <span>{c.title}</span>
        </nav>
        <h1 className="text-3xl font-bold mb-4">{c.title}</h1>
        <p className="text-lg text-muted-foreground mb-8">{c.lede}</p>

        {c.sections.map((s) => (
          <section key={s.heading} className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mb-3 leading-relaxed text-foreground/90">{p}</p>
            ))}
          </section>
        ))}

        <section className="mb-10 border rounded-lg p-5 bg-muted/40">
          <h2 className="text-xl font-semibold mb-2">The verdict</h2>
          <p className="leading-relaxed">{c.verdict}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Frequently asked questions</h2>
          <div className="space-y-5">
            {c.faqs.map((f) => (
              <div key={f.question}>
                <h3 className="font-medium mb-1">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 mb-8">
          <a href="/marketplace" className="border rounded-lg p-5 hover:bg-accent">
            <div className="font-semibold mb-1">Browse verified skills →</div>
            <p className="text-sm text-muted-foreground">
              Every listing shows its Trust Score, adversarial pass rate, and Ed25519 signing status.
            </p>
          </a>
          <a href="/connect" className="border rounded-lg p-5 hover:bg-accent">
            <div className="font-semibold mb-1">Connect via MCP →</div>
            <p className="text-sm text-muted-foreground">
              One URL installs the marketplace into any MCP-capable agent. No SDK, no migration.
            </p>
          </a>
        </section>

        <p className="text-sm text-muted-foreground">
          Want to audit us? Run <code className="px-1 py-0.5 bg-muted rounded">npm run trust:verify</code> to
          recompute any Trust Score and verify signatures offline.
        </p>
      </main>
    </SitePage>
  );
}
