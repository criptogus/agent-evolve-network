import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Winner = {
  week_starting: string;
  rank: number;
  score: number;
  trust_score: number | null;
  adversarial_pass_rate: number | null;
  installs_7d: number | null;
  novelty_bonus: number;
  package: { slug: string; name: string; description: string | null } | null;
};

export const Route = createFileRoute("/skill-of-the-week")({
  loader: async () => {
    const { data } = await supabaseAdmin
      .from("skill_of_the_week")
      .select("week_starting,rank,score,trust_score,adversarial_pass_rate,installs_7d,novelty_bonus,packages(slug,name,description)")
      .order("week_starting", { ascending: false })
      .limit(52);
    const winners = (data ?? []).map((r: { packages: Winner["package"]; week_starting: string } & Record<string, unknown>) => ({
      ...r,
      package: r.packages,
    })) as Winner[];
    return { current: winners[0] ?? null, history: winners.slice(1) };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Skill of the Week — ${loaderData?.current?.package?.name ?? "Super Agent Skill"}` },
      { name: "description", content: `This week's top skill on Super Agent Skill, ranked by trust score, adversarial robustness, and real-world installs.` },
      { property: "og:title", content: `Skill of the Week: ${loaderData?.current?.package?.name ?? "—"}` },
      { property: "og:description", content: loaderData?.current?.package?.description ?? "" },
    ],
  }),
  component: SkillOfTheWeekPage,
});

function SkillOfTheWeekPage() {
  const { current, history } = Route.useLoaderData();
  return (
    <SitePage>
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-2">Skill of the Week</h1>
      <p className="text-muted-foreground mb-8">
        Picked every Monday from packages that combine high Trust Score, strong adversarial
        robustness, and real installs. First-time winners get a novelty bonus.
      </p>

      {!current && <p>Picking has not started yet — check back Monday.</p>}

      {current?.package && (
        <article className="border rounded-lg p-6 mb-10 bg-accent/30">
          <div className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
            Week of {new Date(current.week_starting).toLocaleDateString()}
          </div>
          <h2 className="text-2xl font-bold">
            <a href={`/packs/${current.package.slug}`} className="underline">{current.package.name}</a>
          </h2>
          <p className="mt-2">{current.package.description}</p>
          <dl className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <Stat label="Trust" value={pct(current.trust_score)} />
            <Stat label="Adversarial" value={pct(current.adversarial_pass_rate)} />
            <Stat label="Installs (7d)" value={(current.installs_7d ?? 0).toLocaleString()} />
          </dl>
          <div className="mt-4 text-xs text-muted-foreground">
            Score {Number(current.score).toFixed(2)} · novelty ×{current.novelty_bonus}
          </div>
          <div className="mt-4 flex gap-2">
            <a className="px-4 py-2 bg-primary text-primary-foreground rounded" href={`/packs/${current.package.slug}`}>Open package →</a>
            <a className="px-4 py-2 border rounded" href={`/api/badges/trust/${current.package.slug}.svg`}>Trust badge</a>
            <a className="px-4 py-2 border rounded"
               href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Skill of the Week: ${current.package.name} — ${current.package.description ?? ""}\nhttps://superagentskill.com/packs/${current.package.slug}`)}`}
               target="_blank" rel="noreferrer">Share</a>
          </div>
        </article>
      )}

      {history.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-3">Past winners</h2>
          <ul className="space-y-2">
            {history.map((w) => w.package && (
              <li key={w.week_starting} className="border-b py-2 flex justify-between">
                <a href={`/packs/${w.package.slug}`} className="underline">{w.package.name}</a>
                <span className="text-sm text-muted-foreground">{new Date(w.week_starting).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
    </SitePage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}

function pct(n: number | null): string {
  return n === null ? "—" : `${(Number(n) * 100).toFixed(0)}%`;
}
