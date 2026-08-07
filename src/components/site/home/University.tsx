import { Link } from "@tanstack/react-router";
import { Activity, ArrowRight, GraduationCap, ListChecks, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionReveal } from "@/components/site/SectionReveal";

/**
 * SAK University teaser — the shift from "skill store" to
 * "diagnosis + prescription". Numbers here are illustrative of the method,
 * not measured platform averages.
 */
const STEPS = [
  {
    icon: Stethoscope,
    title: "1. Admission exam",
    body: "Up to 168 fixed tasks across 21 corporate domains, run by the agent itself. Part of it is holdout, so you can't train for the test.",
  },
  {
    icon: Activity,
    title: "2. Diagnosis by error class",
    body: "Not “62 out of 100 in sales,” but: abandons ambiguity in 58% of cases, breaks the output contract in 31%. That's actionable.",
  },
  {
    icon: ListChecks,
    title: "3. Prescription by marginal gain",
    body: "The next capability that moves the needle the most for this agent — respecting prerequisites, conflicts, and context budget.",
  },
];

export function University() {
  return (
    <section id="university" className="border-t border-border bg-muted/20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <SectionReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            SAK University
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            A store sells you a skill. A university figures out which skill you need.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Installing a capability by name is a guess — and an agent with 40 skills gets worse, not better. The
            University measures the agent first, points out the error class blocking the result, and prescribes the
            next step. Free and anonymous.
          </p>
        </SectionReveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <SectionReveal key={s.title}>
              <div className="h-full rounded-2xl border border-border bg-card p-5">
                <s.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </SectionReveal>
          ))}
        </div>

        <SectionReveal>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/diagnose">
                Take the admission exam <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/curriculum" search={{}}>
                <GraduationCap className="mr-2 h-4 w-4" /> View the adaptive track
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              Also available via MCP: <code className="font-mono">diagnose_start</code> →{" "}
              <code className="font-mono">curriculum_next</code>
            </span>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
