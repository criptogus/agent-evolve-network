import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postBounty } from "@/lib/growth/bounties.functions";

export const Route = createFileRoute("/bounties/new")({
  head: () => ({
    meta: [
      { title: "Post a skill bounty — Super Agent Skill" },
      {
        name: "description",
        content:
          "Post a bounty for the agent skill you need: pick a vertical, describe the task and reward, and let contributors build and submit it for grading.",
      },
      { property: "og:title", content: "Post a skill bounty — Super Agent Skill" },
      {
        property: "og:description",
        content:
          "Describe the agent skill you need, set the reward, and get graded submissions from Super Agent Skill contributors.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),

  component: NewBounty,
});

const VERTICALS: { value: string; label: string; hint: string }[] = [
  { value: "general", label: "General", hint: "Cross-vertical work" },
  { value: "security", label: "Security", hint: "AppSec, OWASP, infra" },
  { value: "fintech", label: "Fintech", hint: "FINRA, PCI, CFPB" },
  { value: "healthcare", label: "Healthcare", hint: "HIPAA, PHI" },
  { value: "devops", label: "DevOps / SRE", hint: "K8s, incidents" },
];

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

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <SitePage>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">Post a skill bounty</h1>
        <p className="mt-3 text-muted-foreground">
          Tell the community what you need. The first submission that meets your trust + adversarial
          thresholds claims the reward automatically.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <Field
            label="Title"
            hint="One line. What should the skill do?"
            for_="bounty-title"
          >
            <Input
              id="bounty-title"
              required minLength={8} maxLength={160}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="GitHub Actions misconfig auditor"
            />
          </Field>

          <Field
            label="Brief"
            hint="What inputs, what outputs, what counts as done."
            for_="bounty-brief"
          >
            <Textarea
              id="bounty-brief"
              required minLength={40} maxLength={4000}
              className="min-h-[160px]"
              value={form.brief}
              onChange={(e) => set("brief", e.target.value)}
              placeholder="Given a .github/workflows/ tree, list misconfigurations (write permissions, untrusted action versions, secret usage) ranked by exploitability, with a one-line fix for each."
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Vertical" for_="bounty-vertical" hint="Drives required tags + harness vertical">
              <select
                id="bounty-vertical"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={form.vertical}
                onChange={(e) => set("vertical", e.target.value as typeof form.vertical)}
              >
                {VERTICALS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label} — {v.hint}</option>
                ))}
              </select>
            </Field>
            <Field label="Reward (USD)" for_="bounty-reward" hint="Payable on auto-claim">
              <Input
                id="bounty-reward" type="number" min={1} max={100_000} step={1}
                value={form.reward_cents / 100}
                onChange={(e) => set("reward_cents", Math.round(Number(e.target.value) * 100))}
              />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Min Trust Score" for_="bounty-trust" hint="0 – 1. 0.85 is the default ceiling for production">
              <Input
                id="bounty-trust" type="number" min={0} max={1} step={0.01}
                value={form.required_trust_score}
                onChange={(e) => set("required_trust_score", Number(e.target.value))}
              />
            </Field>
            <Field label="Min adversarial pass rate" for_="bounty-adv" hint="0 – 1. Severity-weighted">
              <Input
                id="bounty-adv" type="number" min={0} max={1} step={0.01}
                value={form.required_adversarial_pass}
                onChange={(e) => set("required_adversarial_pass", Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Deadline" for_="bounty-deadline" hint="Optional. Bounties auto-expire on this date.">
            <Input
              id="bounty-deadline" type="datetime-local"
              value={form.deadline}
              onChange={(e) => set("deadline", e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-between border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              You'll be charged only when a submission claims the bounty.
            </p>
            <button
              disabled={busy}
              className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post bounty"}
            </button>
          </div>
        </form>
      </main>
    </SitePage>
  );
}

function Field({
  label,
  hint,
  for_,
  children,
}: {
  label: string;
  hint?: string;
  for_: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={for_} className="text-sm font-medium">{label}</Label>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
