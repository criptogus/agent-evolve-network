import { Link } from "@tanstack/react-router";

export function CoreConcepts() {
  const items = [
    {
      tag: "SKILLS",
      title: "Capabilities, installable.",
      body: "Cardiology Diagnostics. Growth Hacking. Legal Due Diligence. Discrete units of expertise an agent can install on demand.",
      sample: ["cardiology-diagnostics", "growth-hacking-pro", "legal-due-diligence"],
    },
    {
      tag: "PLAYBOOKS",
      title: "Workflows that ship results.",
      body: "Complete operational logic for real-world processes — from enterprise sales motions to medical consultations.",
      sample: ["enterprise-sales-flow", "medical-consultation-v2", "startup-validation"],
    },
    {
      tag: "SOULS",
      title: "Personality as code.",
      body: "Tone, style, principles, decision-making. Give your agent a Challenger-rep soul, a McKinsey soul, or a humanized doctor soul.",
      sample: ["challenger-rep-soul", "mckinsey-consultant", "humanized-doctor"],
    },
    {
      tag: "GUARDRAILS",
      title: "Safety, by default.",
      body: "Block hallucinations, regulatory violations, out-of-domain behavior and unsafe actions before they reach your users.",
      sample: ["medical-guardrails", "finance-compliance", "no-hallucination"],
    },
  ];
  return (
    <section className="border-b border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              The Stack
            </span>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Four primitives. Infinite agents.
            </h2>
          </div>
          <Link
            to="/marketplace"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            Browse the registry →
          </Link>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {items.map((it) => (
            <div
              key={it.tag}
              className="group rounded-2xl border border-border bg-background p-7 shadow-sm transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                {it.tag}
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {it.sample.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
