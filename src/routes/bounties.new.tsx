import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { useState } from "react";
import { toast } from "sonner";
import { postBounty } from "@/lib/growth/bounties.functions";

export const Route = createFileRoute("/bounties/new")({
  head: () => ({
    meta: [
      { title: "Post a skill bounty — Super Agent Skill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewBounty,
});

function NewBounty() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    brief: "",
    vertical: "general" as const,
    reward_cents: 50_000,
    required_trust_score: 0.85,
    required_adversarial_pass: 0.80,
    deadline: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await postBounty({
        data: {
          title: form.title,
          brief: form.brief,
          vertical: form.vertical,
          reward_cents: Number(form.reward_cents),
          currency: "usd",
          required_trust_score: Number(form.required_trust_score),
          required_adversarial_pass: Number(form.required_adversarial_pass),
          deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        },
      });
      if (r.ok) {
        toast.success("Bounty posted");
        navigate({ to: `/bounties/${r.id}` });
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to post bounty");
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SitePage>
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold mb-2">Post a Skill Bounty</h1>
      <p className="text-muted-foreground mb-6">
        Get the community to build the skill you need. The first submission that passes the
        adversarial harness and meets the trust threshold wins automatically.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input className="w-full mt-1 border rounded p-2"
            required minLength={8} maxLength={160}
            value={form.title} onChange={(e) => set("title", e.target.value)} />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Brief (what should the skill do?)</span>
          <textarea className="w-full mt-1 border rounded p-2 min-h-[140px]"
            required minLength={40} maxLength={4000}
            value={form.brief} onChange={(e) => set("brief", e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Vertical</span>
            <select className="w-full mt-1 border rounded p-2"
              value={form.vertical} onChange={(e) => set("vertical", e.target.value as typeof form.vertical)}>
              {["security", "fintech", "healthcare", "devops", "general"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Reward (USD)</span>
            <input type="number" min={1} max={100_000} step={1}
              className="w-full mt-1 border rounded p-2"
              value={form.reward_cents / 100}
              onChange={(e) => set("reward_cents", Math.round(Number(e.target.value) * 100))} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Min trust score (0-1)</span>
            <input type="number" min={0} max={1} step={0.01}
              className="w-full mt-1 border rounded p-2"
              value={form.required_trust_score}
              onChange={(e) => set("required_trust_score", Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Min adversarial pass rate (0-1)</span>
            <input type="number" min={0} max={1} step={0.01}
              className="w-full mt-1 border rounded p-2"
              value={form.required_adversarial_pass}
              onChange={(e) => set("required_adversarial_pass", Number(e.target.value))} />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Deadline (optional)</span>
          <input type="datetime-local" className="w-full mt-1 border rounded p-2"
            value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
        </label>

        <button disabled={busy} className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50">
          {busy ? "Posting…" : "Post bounty"}
        </button>
      </form>
    </main>
    </SitePage>
  );
}
