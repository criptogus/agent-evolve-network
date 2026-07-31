import { ArrowUpRight, ShieldCheck, Sparkles, Timer } from "lucide-react";

type Row = { metric: string; diy: string; sak: string; delta: string };

const ROWS: Row[] = [
  { metric: "Task success rate", diy: "46%", sak: "93%", delta: "+102%" },
  { metric: "Answers that follow your rules", diy: "51%", sak: "97%", delta: "+90%" },
  { metric: "Prompt-injection attempts blocked", diy: "21%", sak: "99%", delta: "+371%" },
  { metric: "Hallucinated facts per 1k runs", diy: "28%", sak: "1.6%", delta: "−94%" },
  { metric: "Tokens burned per task", diy: "17,900", sak: "4,300", delta: "−76%" },
  { metric: "Human rescues needed", diy: "1 in 3 runs", sak: "1 in 22 runs", delta: "−86%" },
];

const HIGHLIGHTS = [
  { icon: Sparkles, stat: "2.0×", label: "more tasks finished without a human stepping in" },
  { icon: ShieldCheck, stat: "99%", label: "of adversarial prompts blocked by the built-in guardrails" },
  { icon: Timer, stat: "5 min", label: "from a one-paragraph brief to a graded, installable agent" },
];

/**
 * Proof band for the Agent Factory: a plain-prompt agent written straight into
 * an LLM vs. an agent built here (soul + bounded skills + playbooks + guardrails,
 * scored and repaired to grade A).
 */
export function FactoryProof() {
  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Why not just paste a prompt into the LLM?</h2>
        <span className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Illustrative targets
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Same model, same task. On the left: a hand-written prompt. On the right: an agent built by this factory.
        The figures below are the certification targets the pipeline is designed to hit — they are modelled, not
        measured customer results, and each one flips to a live number as paired-benchmark telemetry reaches
        sample size.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {HIGHLIGHTS.map((h) => (
          <div key={h.label} className="rounded-xl border border-border bg-background p-4">
            <h.icon className="h-4 w-4 text-primary" aria-hidden />
            <p className="mt-2 text-2xl font-semibold tracking-tight">{h.stat}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{h.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-background">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Metric</th>
              <th className="px-3 py-3 font-medium">Prompt in the LLM</th>
              <th className="px-3 py-3 font-medium text-primary">Built here</th>
              <th className="px-4 py-3 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.metric} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">{r.metric}</td>
                <td className="px-3 py-3 text-muted-foreground">{r.diy}</td>
                <td className="px-3 py-3 font-semibold">{r.sak}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-primary">
                  <span className="inline-flex items-center gap-1">
                    {r.delta}
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Certification targets, not a guarantee or a measured customer average — your numbers depend on the task
        and the model you run. Method:{" "}
        <a href="/evaluation" className="underline decoration-dotted hover:text-foreground">
          how we score
        </a>
        .
      </p>
    </section>
  );
}
