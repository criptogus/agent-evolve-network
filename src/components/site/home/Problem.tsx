/**
 * The problem section. Opens with the pain, not the product: a cold headline
 * followed by the questions nobody can answer about an untested skill, each
 * answered with the uncomfortable truth. Closes on "You shipped it anyway."
 */
const QUESTIONS: { q: string; a: string }[] = [
  { q: "Does this skill actually improve the model?", a: "never tested" },
  { q: "Is this version better than the last one?", a: "no versions on file" },
  { q: "Did anyone run adversarial cases against it?", a: "never ran them" },
  { q: "Will it hold up in a different harness?", a: "no way to know" },
  { q: "Can it recover when a tool call fails?", a: "nothing like that" },
  { q: "Can you prove this is the best version?", a: "no benchmark exists" },
];

export function Problem() {
  return (
    <section className="border-b border-border bg-surface/40 py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          The problem
        </span>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight md:text-5xl">
          You write skills, souls and prompts for your agent.
          <span className="block text-muted-foreground">But you never test them.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Don't trust a capability blindly. A badly written skill quietly degrades the model it was
          supposed to improve — and you find out from your customers.
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {QUESTIONS.map((item) => (
            <div key={item.q} className="bg-background p-5">
              <p className="text-sm font-medium leading-snug text-foreground">{item.q}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-destructive">
                {item.a}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-2xl font-semibold tracking-tight md:text-3xl">
          You shipped it anyway.
        </p>
      </div>
    </section>
  );
}
