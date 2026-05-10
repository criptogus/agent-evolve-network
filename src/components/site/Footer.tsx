import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-14 md:grid-cols-5">
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="text-[15px] font-semibold tracking-tight">Super Agent Skill</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            The MCP infrastructure layer for AI agents. One command, your agent becomes a genius.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" />
            All systems operational
          </div>
        </div>
        <FooterCol title="Product" links={[
          { label: "Marketplace", to: "/marketplace" },
          { label: "Docs", to: "/docs" },
          { label: "Pricing", to: "/pricing" },
        ]} />
        <FooterCol title="Platform" links={[
          { label: "MCP Gateway", href: "#" },
          { label: "Skill Registry", href: "#" },
          { label: "Evolution Engine", href: "#" },
        ]} />
        <FooterCol title="Legal" links={[
          { label: "Terms", to: "/terms" },
          { label: "Privacy", to: "/privacy" },
          { label: "Refunds", to: "/refunds" },
        ]} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Super Agent Skill, Inc.</span>
          <span className="font-mono">v3.0 · MCP-native</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ label: string; to?: string; href?: string }> }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
            ) : (
              <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
