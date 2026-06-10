export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Connect your AI",
      body: "Paste one link into Claude, ChatGPT, Cursor or any MCP-compatible tool. Done in 30 seconds. No code, no setup, no IT ticket.",
    },
    {
      n: "02",
      title: "Pick a skill — or describe one",
      body: "Browse ready-made experts, or just say what you do: “I run a cardiology clinic.” SkillForge installs the right skills, playbooks and guardrails — or forges a custom one from your own context.",
    },
    {
      n: "03",
      title: "It improves on its own",
      body: "Every skill is re-tested daily against new attacks. Patched versions arrive automatically; underperformers get re-scored, not buried.",
    },
  ];
  return (
    <section className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            How it works
          </span>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            From generic AI to your specialist — in 3 steps.
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            No prompt engineering. No fine-tuning. No new tools to learn.
          </p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="bg-background p-7 transition-colors hover:bg-surface">
              <div className="font-mono text-xs text-primary">{s.n}</div>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          One endpoint · Claude Code · Cursor · ChatGPT · Continue · Cline · Any MCP client
        </p>
      </div>
    </section>
  );
}
