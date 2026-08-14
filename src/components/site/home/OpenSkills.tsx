import { Link } from "@tanstack/react-router";
import { ShieldCheck, Terminal, Plug } from "lucide-react";
import { CodeBlockCopy } from "@/components/site/CopyButton";
import {
  AGENT_PLUGINS_SITE,
  AGENT_PLUGINS_SPEC_VERSION,
  AGENT_PLUGINS_STEWARDS,
  OPEN_SKILLS_AGENTS,
  OPEN_SKILLS_SITE,
  openSkillsInstallAll,
  openSkillsUpdate,
} from "@/lib/skills/open-skills";

const ROUTES = [
  {
    icon: Terminal,
    title: "Open Skills CLI",
    body: "One command drops our SKILL.md files into whichever agent you already use. No account, no config file.",
  },
  {
    icon: Plug,
    title: "MCP server",
    body: "Paste one URL for always-current graded versions, plus review, diagnosis and before/after proof tools.",
  },
  {
    icon: ShieldCheck,
    title: "Trust Score on top",
    body: "Every skill carries a public grade: format, substance and adversarial testing, with the evidence attached.",
  },
];

/**
 * Compatibility with the open agent skills ecosystem (skills.sh). The message
 * is additive on purpose: the ecosystem solves distribution, we add the
 * evidence layer that tells you whether a skill is worth installing.
 */
export function OpenSkills() {
  return (
    <section id="open-skills" className="border-b border-border px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            Open ecosystem
          </p>
          <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
            Works with the open agent skills ecosystem
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            Our catalog ships in the standard <code className="font-mono text-foreground">SKILL.md</code>{" "}
            format, so you can install it with the open{" "}
            <a
              href={OPEN_SKILLS_SITE}
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
            >
              skills.sh
            </a>{" "}
            CLI, with our own CLI, or over MCP. Same skills, whichever route your agent prefers.
          </p>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            We are also conformant with{" "}
            <a
              href={AGENT_PLUGINS_SITE}
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
            >
              Agent Plugins v{AGENT_PLUGINS_SPEC_VERSION}
            </a>{" "}
            — the vendor-neutral package format stewarded by {AGENT_PLUGINS_STEWARDS.join(", ")}.
            Every graded skill downloads as a portable{" "}
            <code className="font-mono text-foreground">plugin.json</code> +{" "}
            <code className="font-mono text-foreground">mcp.json</code> +{" "}
            <code className="font-mono text-foreground">SKILL.md</code> package.
          </p>
        </div>

        <div className="mt-8 max-w-2xl space-y-3">
          <CodeBlockCopy code={openSkillsInstallAll} label="install command" />
          <CodeBlockCopy code={openSkillsUpdate} label="update command" />
        </div>

        <div className="mt-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Installs into
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {OPEN_SKILLS_AGENTS.map((agent) => (
              <li
                key={agent}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
              >
                {agent}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {ROUTES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          The open ecosystem gives skills distribution. We add the part that decides whether you
          should install one: a graded Trust Score, an adversarial pass rate, and a before/after
          report when a skill is improved.{" "}
          <Link
            to="/marketplace"
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
          >
            Browse the graded catalog
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
