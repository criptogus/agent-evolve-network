import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SitePage } from "@/components/site/SitePage";

type Bounty = {
  id: string; title: string; brief: string; vertical: string;
  reward_cents: number; currency: string; deadline: string | null;
  required_trust_score: number; required_adversarial_pass: number; status: string;
};

export const Route = createFileRoute("/bounties")({
  loader: async () => {
    const { data } = await supabaseAdmin
      .from("skill_bounties")
      .select("id,title,brief,vertical,reward_cents,currency,deadline,required_trust_score,required_adversarial_pass,status")
      .in("status", ["open", "claimed"])
      .order("reward_cents", { ascending: false })
      .limit(50);
    return { bounties: (data ?? []) as Bounty[] };
  },
  head: () => ({
    meta: [
      { title: "Skill Bounties — earn for publishing high-trust skills" },
      { name: "description", content: "Get paid to publish AI agent skills that pass the proprietary adversarial harness. Bounties are awarded automatically when your skill meets the trust threshold." },
    ],
  }),
  component: BountiesPage,
});

function BountiesPage() {
  const { bounties } = Route.useLoaderData();
  return (
    <SitePage>
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-2">Skill Bounties</h1>
      <p className="text-muted-foreground mb-8">
        Publish a skill that passes the adversarial harness for a posted vertical and the bounty is yours.
        Awards are paid out via the same revenue-share ledger that powers referrals and lineage.
      </p>

      <div className="space-y-3">
        {bounties.length === 0 && <p>No open bounties right now. Check back soon.</p>}
        {bounties.map((b) => (
          <article key={b.id} className="border rounded p-4">
            <header className="flex justify-between items-baseline">
              <h2 className="text-xl font-semibold">{b.title}</h2>
              <div className="text-2xl font-bold">${(b.reward_cents / 100).toLocaleString()}</div>
            </header>
            <p className="text-sm text-muted-foreground mt-1">
              Vertical: <span className="font-mono">{b.vertical}</span>
              {" · "}Requires trust ≥ {(b.required_trust_score * 100).toFixed(0)}%, adversarial ≥ {(b.required_adversarial_pass * 100).toFixed(0)}%
              {b.deadline && (<> {" · "}deadline {new Date(b.deadline).toLocaleDateString()}</>)}
            </p>
            <p className="mt-3 text-sm whitespace-pre-line">{b.brief}</p>
            <a href={`/bounties/${b.id}`} className="text-primary underline text-sm mt-2 inline-block">
              View details & submit →
            </a>
          </article>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-2">Post a bounty</h2>
        <p className="text-sm text-muted-foreground">
          Need a specific skill built? Post a bounty and any author can claim it by submitting a
          package that meets the trust and adversarial thresholds.
        </p>
        <a href="/bounties/new" className="inline-block mt-3 px-4 py-2 bg-primary text-primary-foreground rounded">
          Post a bounty
        </a>
      </section>
    </main>
    </SitePage>
  );
}
