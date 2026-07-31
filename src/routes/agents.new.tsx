import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
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
          "Three steps: the objective, the context, one final review. Get a complete corporate agent — soul, skills, playbooks and guardrails — scored and repaired to grade A.",
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

const STEPS = [
  { n: 1, title: "Objective", hint: "The role you need" },
  { n: 2, title: "Context", hint: "Your company and rules" },
  { n: 3, title: "Review", hint: "Confirm and build" },
];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mt-8 flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : s.n}
              </span>
              <span className="min-w-0">
                <span
                  className={`block truncate text-sm font-medium ${active || done ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {s.title}
                </span>
                <span className="hidden truncate text-xs text-muted-foreground sm:block">{s.hint}</span>
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span className={`h-px flex-1 ${step > s.n ? "bg-primary" : "bg-border"}`} aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm">{value.trim()}</dd>
    </div>
  );
}

function NewAgent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const startFn = useServerFn(startAgentBuild);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
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

  function next() {
    if (step === 1 && form.role.trim().length < 3) {
      toast.error("Tell us the role in a few words.");
      return;
    }
    if (step === 2 && form.company.trim().length < 10) {
      toast.error("Describe your company in at least a sentence.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  async function submit() {
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
            Three steps, about five minutes. We write the operating soul, the skills, the playbooks and the guardrails —
            then score and repair it until it clears grade A.
          </p>
        </header>

        <Stepper step={step} />

        <div className="mt-6 rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-7">
          {!canBuild ? (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
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
          ) : (
            <>
              {step === 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="role">What role do you need?</Label>
                  <Input
                    id="role"
                    placeholder="e.g. Head of Customer Success"
                    value={form.role}
                    onChange={set("role")}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">One line is enough. Pick an example to start:</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: ex }))}
                        className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="company">What does your company do?</Label>
                    <Textarea
                      id="company"
                      rows={4}
                      placeholder="What you sell, to whom, company size, and how this role creates value."
                      value={form.company}
                      onChange={set("company")}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="constraints">What must it never do? (optional)</Label>
                    <Textarea
                      id="constraints"
                      rows={3}
                      placeholder="Never quote prices without approval. Never share patient data."
                      value={form.constraints}
                      onChange={set("constraints")}
                    />
                    <p className="text-xs text-muted-foreground">These become enforceable guardrails.</p>
                  </div>
                  <details className="group rounded-xl border border-border bg-surface/40 px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                      More detail sharpens the result (optional)
                      <ChevronRight
                        className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90"
                        aria-hidden
                      />
                    </summary>
                    <div className="mt-4 space-y-4 pb-1">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="industry">Industry</Label>
                          <Input id="industry" placeholder="healthcare, fintech…" value={form.industry} onChange={set("industry")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tone">Tone / voice</Label>
                          <Input id="tone" placeholder="direct, no hedging" value={form.tone} onChange={set("tone")} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="outcomes">What is it accountable for?</Label>
                        <Textarea id="outcomes" rows={3} placeholder="The results you'd fire a human over." value={form.outcomes} onChange={set("outcomes")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="context">Existing docs to inherit</Label>
                        <Textarea id="context" rows={4} placeholder="Paste your playbook, ICP, pricing rules or style guide." value={form.context} onChange={set("context")} />
                      </div>
                    </div>
                  </details>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <h2 className="text-lg font-semibold">Final review</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This is the brief we'll build from. Go back to change anything.
                  </p>
                  <dl className="mt-4 rounded-xl border border-border p-4">
                    <Row label="Role" value={form.role} />
                    <Row label="Company" value={form.company} />
                    <Row label="Never do" value={form.constraints} />
                    <Row label="Industry" value={form.industry} />
                    <Row label="Tone" value={form.tone} />
                    <Row label="Accountable for" value={form.outcomes} />
                    <Row label="Inherited docs" value={form.context} />
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    We'll generate the soul, skills, playbooks and guardrails, then score and repair until grade A.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1 || busy}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden /> Back
                </Button>
                {step < 3 ? (
                  <Button onClick={next} size="lg">
                    Continue <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-muted-foreground">~5 min. You can leave and come back.</span>
                    <Button onClick={submit} disabled={busy} size="lg">
                      {busy ? "Starting…" : "Build my agent"}
                    </Button>
                  </div>
                )}
              </div>
            </>
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
