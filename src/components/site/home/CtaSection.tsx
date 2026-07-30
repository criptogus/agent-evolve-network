import { Link } from "@tanstack/react-router";
import { CodeBlockCopy } from "@/components/site/CopyButton";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="absolute inset-0 grid-bg opacity-50" aria-hidden />
      <div className="absolute inset-0 hero-glow" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
          One MCP URL.
          <br />
          One sentence. Done.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Install the best packages of your industry, generate what doesn't exist yet, and let
          SkillForge ship better versions for you — week after week.
        </p>
        <div className="mx-auto mt-7 max-w-md">
          <CodeBlockCopy code="https://superagentskill.com/api/public/mcp" label="copy MCP url" />
        </div>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/connect"
            className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-elevated transition-all hover:opacity-95"
          >
            Connect your agent — free →
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex h-11 items-center rounded-md border border-border bg-surface-elevated px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Browse the skills
          </Link>
        </div>
      </div>
    </section>
  );
}
