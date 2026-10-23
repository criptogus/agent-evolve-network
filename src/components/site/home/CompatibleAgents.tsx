import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

type Agent = {
  name: string;
  glyph: string;
  href: string;
};

const AGENTS: Agent[] = [
  { name: "Lovable", glyph: "♥", href: "/connect/lovable" },
  { name: "Codex", glyph: "◆", href: "/connect/codex" },
  { name: "Claude", glyph: "✦", href: "/connect/claude" },
  { name: "Hermes", glyph: "🜂", href: "/connect/hermes" },
  { name: "Open Claw", glyph: "⚡", href: "/connect/openclaw" },
  { name: "Cursor", glyph: "▸", href: "/connect/cursor" },
  { name: "VS Code", glyph: "</>", href: "/connect/vscode" },
  { name: "ChatGPT", glyph: "●", href: "/connect" },
  { name: "Windsurf", glyph: "≋", href: "/connect" },
  { name: "Cline", glyph: "⌘", href: "/connect" },
  { name: "Continue", glyph: "↗", href: "/connect" },
  { name: "Any MCP client", glyph: "∞", href: "/connect" },
];

export function CompatibleAgents() {
  return (
    <section data-testid="compatible-agents" className="border-b border-border bg-surface/40 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Universal compatibility
          </span>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Works with every agent you already use.
          </h2>
          <p className="mt-4 text-pretty text-base text-muted-foreground md:text-lg">
            One MCP endpoint, no SDK. Most clients take the URL from settings; a few (Claude Desktop, Cursor) still need a small JSON/TOML entry and a restart — the per-client steps are in the docs.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {AGENTS.map((agent) => (
            <Link
              key={agent.name}
              to={agent.href}
              className="group inline-flex items-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 shadow-sm transition-all hover:border-primary/40 hover:bg-accent hover:shadow-elevated"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold text-primary">
                {agent.glyph}
              </span>
              <span className="text-sm font-medium text-foreground">{agent.name}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Missing your favorite?{" "}
          <Link to="/community" className="text-primary underline-offset-2 hover:underline">
            Request it →
          </Link>
        </p>
      </div>
    </section>
  );
}
