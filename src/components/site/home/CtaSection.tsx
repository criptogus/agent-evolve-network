import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CodeBlockCopy } from "@/components/site/CopyButton";

const REASSURANCE = [
  "Free tier — no card",
  "Reversible in one command",
  "Every install logged",
] as const;

/**
 * Closing band. Deliberately mirrors the hero's dark instrumentation surface so
 * the page opens and closes on the same note, with the MCP URL as the single
 * thing a visitor has to copy.
 */
export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-deep py-24 text-deep-foreground md:py-28">
      <div className="pointer-events-none absolute inset-0 deep-grid" aria-hidden />
      <div className="pointer-events-none absolute inset-0 deep-glow" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Start now
        </span>
        <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          One MCP URL.
          <br />
          One sentence. Done.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-deep-muted">
          Install the best packages of your industry, generate what doesn't exist yet, and let
          SkillForge ship better versions for you — week after week.
        </p>
        <div className="mx-auto mt-8 max-w-md text-left">
          <CodeBlockCopy code="https://superagentskill.com/api/public/mcp" label="copy MCP url" />
        </div>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/connect"
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-cta transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
          >
            Connect your agent — free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-deep-border bg-deep-elevated px-6 text-[15px] font-medium text-deep-foreground transition-colors hover:bg-deep-elevated/70 sm:w-auto"
          >
            Browse the skills
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-deep-muted">
          {REASSURANCE.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-signal" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
