import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { startAgentBuild } from "@/lib/agents/factory.functions";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { FactoryProof } from "@/components/agents/FactoryProof";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/agents/new")({
  component: NewAgent,
  head: () => ({
    meta: [
      { title: "Agent Factory — build your own corporate agent | SuperAgentSkill" },
      {
        name: "description",
        content:
          "Describe the role in one paragraph. Get a complete corporate agent — soul, skills, playbooks and guardrails — scored and repaired to grade A before you download it.",
      },
      { property: "og:title", content: "Agent Factory — build your own corporate agent" },
      {
        property: "og:description",
        content: "One brief in, a full agent out: soul, skills, playbooks and guardrails at the state of the art.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const EXAMPLES = [
  "Head of Customer Success for a B2B SaaS selling to hospitals",
  "Corporate Controller for a 200-person manufacturing group",
  "Demand Generation Lead for a fintech in LATAM",
];

function NewAgent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const startFn = useServerFn(startAgentBuild);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    role: "",
    company: "",
    industry: "",
    outcomes: "",
    tone: "",
    constraints: "",
    context: "",
  });

  const canBuild = !!user && isActive;
  const set = (k: keyof typeof form) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (form.role.trim().length < 3 || form.company.trim().length < 10) {
      toast.error("Tell us the role and a little about the company (at least a sentence).");
      return;
    }
    setBusy(true);
    try {
      const res = await startFn({
        data: {
          role: form.role.trim(),
          company: form.company.trim(),
          industry: form.industry.trim() || undefined,
          outcomes: form.outcomes.trim() || undefined,
          tone: form.tone.trim() || undefined,
          constraints: form.constraints.trim() || undefined,
          context: form.context.trim() || undefined,
        },
      });
      navigate({ to: "/agents/build/$id", params: { id: res.build_id } });
    } catch (e: any) {
      toast.error(typeof e?.message === "string" ? e.message : "Could not start the build.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Agent Factory</p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Describe a role. Get a working agent.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Two fields, about five minutes. We write the operating soul, the skills, the playbooks and the guardrails —
            then score and repair it until it clears grade A.
          </p>
        </header>

        {/* The form — the only thing that matters on this page */}
        <div className="mt-9 rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-7">
          <div className="space-y-2">
            <Label htmlFor="role">What role do you need?</Label>
            <Input
              id="role"
              placeholder="e.g. Head of Customer Success"
              value={form.role}
              onChange={set("role")}
              disabled={!canBuild}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={!canBuild}
                  onClick={() => setForm((f) => ({ ...f, role: ex }))}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <Label htmlFor="company">What does your company do?</Label>
            <Textarea
              id="company"
              rows={4}
              placeholder="What you sell, to whom, company size, and how this role creates value."
              value={form.company}
              onChange={set("company")}
              disabled={!canBuild}
            />
          </div>

          {/* Everything optional, folded away */}
          <details className="group mt-5 rounded-xl border border-border bg-surface/40 px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              Add details to sharpen the result (optional)
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-4 space-y-4 pb-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" placeholder="healthcare, fintech…" value={form.industry} onChange={set("industry")} disabled={!canBuild} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone / voice</Label>
                  <Input id="tone" placeholder="direct, no hedging" value={form.tone} onChange={set("tone")} disabled={!canBuild} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="outcomes">What is it accountable for?</Label>
                <Textarea id="outcomes" rows={3} placeholder="The results you'd fire a human over." value={form.outcomes} onChange={set("outcomes")} disabled={!canBuild} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="constraints">What must it never do?</Label>
                <Textarea
                  id="constraints"
                  rows={3}
                  placeholder="Never quote prices without approval. Never share patient data."
                  value={form.constraints}
                  onChange={set("constraints")}
                  disabled={!canBuild}
                />
                <p className="text-xs text-muted-foreground">These become enforceable guardrails in the agent's hard rules.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="context">Existing docs to inherit</Label>
                <Textarea id="context" rows={4} placeholder="Paste your playbook, ICP, pricing rules or style guide." value={form.context} onChange={set("context")} disabled={!canBuild} />
              </div>
            </div>
          </details>

          {canBuild ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={submit} disabled={busy} size="lg">
                {busy ? "Starting…" : "Build my agent"}
              </Button>
              <span className="text-xs text-muted-foreground">Takes about 5 minutes. You can leave and come back.</span>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p className="text-sm font-medium">Building agents is part of Agent Pass</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Unlimited builds, the full Agent Store, and install straight into Claude, Hermes or ChatGPT over MCP.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/pricing">Upgrade to build agents</Link>
                </Button>
                {!user ? (
                  <Button variant="outline" asChild>
                    <Link to="/login">Sign in</Link>
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link to="/agents">Browse ready-made agents</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-12">
          <FactoryProof />
        </div>
      </main>
      <Footer />
    </div>
  );
}
