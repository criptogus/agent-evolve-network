import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { startAgentBuild } from "@/lib/agents/factory.functions";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/agents/new")({
  component: NewAgent,
  head: () => ({
    meta: [
      { title: "Agent Factory — build your own corporate agent | SuperAgentSkill" },
      {
        name: "description",
        content:
          "Describe the role. Get a complete corporate agent: operating soul, skills, playbooks and guardrails, scored and repaired to grade A before you download it.",
      },
      { property: "og:title", content: "Agent Factory — build your own corporate agent" },
      {
        property: "og:description",
        content: "One prompt in, a full agent out: soul, skills, playbooks and guardrails at the state of the art.",
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
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          <Badge variant="outline">Agent Pass</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Agent Factory</h1>
          <p className="mt-3 text-muted-foreground">
            Describe the role you need. We research the state of the art for it, then write the operating{" "}
            <strong>soul</strong>, the <strong>skills</strong>, the <strong>playbooks</strong> and the{" "}
            <strong>guardrails</strong> — and score the result, repairing it until it clears the A bar.
          </p>
        </header>

        {!canBuild && (
          <Card className="mb-8 border-primary/40">
            <CardHeader>
              <CardTitle className="text-lg">The Agent Factory is part of Agent Pass</CardTitle>
              <CardDescription>
                Unlimited agent builds, the full Agent Store, and MCP install from inside Claude, Hermes or ChatGPT.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/pricing">Upgrade to build agents</Link>
              </Button>
              {!user && (
                <Button variant="outline" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
              <Button variant="ghost" asChild>
                <Link to="/agents">Browse ready-made agents</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>The brief</CardTitle>
            <CardDescription>Two fields are required. The rest sharpens the result.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="role">Role or title *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="company">Company context *</Label>
              <Textarea
                id="company"
                rows={4}
                placeholder="What the company sells, to whom, size, stage, how this role creates value."
                value={form.company}
                onChange={set("company")}
                disabled={!canBuild}
              />
            </div>

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
              <Label htmlFor="outcomes">Primary outcomes</Label>
              <Textarea
                id="outcomes"
                rows={3}
                placeholder="What this agent is accountable for — the results you'd fire a human over."
                value={form.outcomes}
                onChange={set("outcomes")}
                disabled={!canBuild}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="constraints">Hard constraints — what it must never do</Label>
              <Textarea
                id="constraints"
                rows={3}
                placeholder="Never quote prices without approval. Never share patient data. Never commit to delivery dates."
                value={form.constraints}
                onChange={set("constraints")}
                disabled={!canBuild}
              />
              <p className="text-xs text-muted-foreground">
                These become enforceable guardrails, carried verbatim in meaning into the agent's hard rules.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Existing docs (optional)</Label>
              <Textarea
                id="context"
                rows={5}
                placeholder="Paste your playbook, ICP, pricing rules, style guide — anything the agent should inherit."
                value={form.context}
                onChange={set("context")}
                disabled={!canBuild}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={submit} disabled={!canBuild || busy} size="lg">
                {busy ? "Starting…" : "Build my agent"}
              </Button>
              <span className="text-xs text-muted-foreground">Takes about 2 minutes. You can leave and come back.</span>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
