import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export const Route = createFileRoute("/compare/$pair")({
  loader: async ({ params }) => {
    const m = params.pair.match(/^([a-z0-9-]+)-vs-([a-z0-9-]+)$/);
    if (!m) throw new Response("invalid pair", { status: 400 });
    const [, a, b] = m;
    const [left, right] = await Promise.all([loadSide(a), loadSide(b)]);
    return { left, right };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.left.slug} vs ${loaderData?.right.slug} — Super Agent Skill` },
      { name: "description", content: `Head-to-head comparison of ${loaderData?.left.name ?? loaderData?.left.slug} and ${loaderData?.right.name ?? loaderData?.right.slug} on trust score, adversarial robustness, and recent usage.` },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { left, right } = Route.useLoaderData();
  return (
    <SitePage>
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-2">
        {left.name ?? left.slug} <span className="text-muted-foreground">vs</span> {right.name ?? right.slug}
      </h1>
      <p className="text-muted-foreground mb-8">
        Trust Score, adversarial robustness, and recent usage. Updated automatically from the Super Agent Skill registry.
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4">Metric</th>
            <th className="text-right py-2 px-4">{left.slug}</th>
            <th className="text-right py-2 pl-4">{right.slug}</th>
          </tr>
        </thead>
        <tbody>
          {row("Trust score", pct(left.trust_score), pct(right.trust_score))}
          {row("Adversarial pass rate", pct(left.adversarial_pass_rate), pct(right.adversarial_pass_rate))}
          {row("Installs (7d)", left.installs_7d ?? "—", right.installs_7d ?? "—")}
          {row("Description", left.description ?? "—", right.description ?? "—")}
        </tbody>
      </table>

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

function row(label: string, l: unknown, r: unknown) {
  return (
    <tr className="border-b">
      <td className="py-2 pr-4 font-medium">{label}</td>
      <td className="py-2 px-4 text-right">{String(l)}</td>
      <td className="py-2 pl-4 text-right">{String(r)}</td>
    </tr>
  );
}

function pct(n: number | null): string {
  return n === null ? "—" : `${(Number(n) * 100).toFixed(0)}%`;
}
