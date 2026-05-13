import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { submitToBounty } from "@/lib/growth/bounties.functions";

type Bounty = {
  id: string;
  title: string;
  brief: string;
  vertical: string;
  reward_cents: number;
  currency: string;
  deadline: string | null;
  required_trust_score: number;
  required_adversarial_pass: number;
  status: string;
  winning_package_id: string | null;
};

export const Route = createFileRoute("/bounties/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabaseAdmin
      .from("skill_bounties")
      .select("id,title,brief,vertical,reward_cents,currency,deadline,required_trust_score,required_adversarial_pass,status,winning_package_id")
      .eq("id", params.id)
      .maybeSingle();
    if (error || !data) throw new Response("not found", { status: 404 });
    return { bounty: data as Bounty };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.bounty.title ?? "Bounty"} — Super Agent Skill` },
      { name: "description", content: `${loaderData?.bounty.vertical} skill bounty — $${((loaderData?.bounty.reward_cents ?? 0) / 100).toLocaleString()}.` },
    ],
  }),
  component: BountyDetail,
});

function BountyDetail() {
  const { bounty } = Route.useLoaderData();
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; reason?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const r = await submitToBounty({ data: { bounty_id: bounty.id, package_slug: slug.trim() } });
      setResult(r);
      if (r.ok) toast.success("Submission accepted — bounty claimed.");
      else toast.error(`Submission rejected: ${r.reason}`);
    } catch (err) {
      toast.error((err as Error).message ?? "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  const closed = bounty.status !== "open";
  return (
    <main className="mx-auto max-w-3xl p-6">
      <a href="/bounties" className="text-sm text-muted-foreground underline">← All bounties</a>
      <header className="flex justify-between items-baseline mt-4 mb-2">
        <h1 className="text-3xl font-bold">{bounty.title}</h1>
        <div className="text-3xl font-bold">${(bounty.reward_cents / 100).toLocaleString()}</div>
      </header>
      <p className="text-sm text-muted-foreground mb-6">
        Vertical: <span className="font-mono">{bounty.vertical}</span>
        {" · "}Min trust {(bounty.required_trust_score * 100).toFixed(0)}%
        {" · "}Min adversarial {(bounty.required_adversarial_pass * 100).toFixed(0)}%
        {bounty.deadline && (<> {" · "}deadline {new Date(bounty.deadline).toLocaleString()}</>)}
        {" · "}status <span className="font-mono">{bounty.status}</span>
      </p>

      <article className="prose mb-8 whitespace-pre-line">{bounty.brief}</article>

      <section className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-2">Submit your package</h2>
        {closed ? (
          <p className="text-muted-foreground">This bounty is {bounty.status}. Submissions are closed.</p>
        ) : (
          <form onSubmit={submit} className="flex gap-2 max-w-xl">
            <input
              className="flex-1 border rounded p-2"
              placeholder="package-slug"
              required pattern="[a-z0-9-]{2,64}"
              value={slug} onChange={(e) => setSlug(e.target.value)}
            />
            <button disabled={busy} className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50">
              {busy ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
        {result && !result.ok && (
          <p className="text-sm text-destructive mt-3">Rejected: {result.reason}</p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Submissions are auto-evaluated against the latest Trust Score and adversarial
          pass rate for your package. The first eligible submission claims the bounty.
        </p>
      </section>
    </main>
  );
}
