import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { formatVersionLabel, PLATFORM_BUILD_DATE } from "@/lib/version";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-12">
        {/* Brand + newsletter */}
        <div className="md:col-span-5">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="text-[15px] font-semibold tracking-tight">Super Agent Skill</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            The MCP infrastructure layer for AI agents. Connect once, ship a specialist in a sentence.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" />
            All systems operational
          </div>
          <NewsletterForm />
        </div>

        <div className="grid grid-cols-2 gap-10 md:col-span-7 md:grid-cols-5">
          <FooterCol title="Product" links={[
            { label: "Connect", to: "/connect" },
            { label: "Marketplace", to: "/marketplace" },
            { label: "Packs", to: "/packs" },
            { label: "Pricing", to: "/pricing" },
            { label: "Enterprise", to: "/enterprise" },
            { label: "Docs", to: "/docs" },
          ]} />
          <FooterCol title="Creators" links={[
            { label: "Forge", to: "/forge" },
            { label: "SkillForge", to: "/skillforge" },
            { label: "Generate", to: "/generate" },
            { label: "Evaluation", to: "/evaluation" },
            { label: "Rankings", to: "/marketplace/rankings" },
          ]} />
          <FooterCol title="Community" links={[
            { label: "Skill of the Week", to: "/skill-of-the-week" },
            { label: "Use cases", to: "/use-cases" },
            { label: "Bounties", to: "/bounties" },
            { label: "Affiliate leaderboard", to: "/leaderboard" },
            { label: "Discord", href: "https://superagentskill.com/community" },
          ]} />
          <FooterCol title="Open source" links={[
            { label: "GitHub repo", href: "https://github.com/criptogus/agent-evolve-network" },
            { label: "Contribute", to: "/community" },
            { label: "Content registry", href: "https://github.com/criptogus/agent-evolve-network/tree/main/content" },
            { label: "MCP docs", to: "/docs/mcp" },
            { label: "llms.txt", href: "/llms.txt" },
          ]} />
          <FooterCol title="Company" links={[
            { label: "About", to: "/about" },
            { label: "Terms", to: "/terms" },
            { label: "Privacy", to: "/privacy" },
            { label: "Contributor FAQ", to: "/contributor-faq" },
            { label: "Refunds", to: "/refunds" },
            { label: "Contact sales", href: "mailto:contact@zeroagency.ai" },
          ]} />
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Super Agent Skill, Inc. — Made for agents, not for slides.</span>
          <span
            className="font-mono"
            title={`Built ${PLATFORM_BUILD_DATE} · see docs/VERSIONING.md`}
          >
            {formatVersionLabel()}
          </span>
        </div>
      </div>
    </footer>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setState("err");
      setMsg("Enter a valid email.");
      return;
    }
    setState("loading");
    const { error } = await supabase
      .from("newsletter_signups")
      .insert({ email: trimmed, source: "footer" });
    if (error && !/duplicate|unique/i.test(error.message)) {
      setState("err");
      setMsg("Couldn't subscribe. Try again.");
      return;
    }
    setState("ok");
    setMsg("You're in. Watch your inbox.");
    setEmail("");
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-sm">
      <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
        Ship updates · monthly, no fluff
      </label>
      <div className="mt-2 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state !== "idle") setState("idle"); }}
          placeholder="dev@yourcompany.com"
          aria-label="Email address"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 disabled:opacity-60"
        >
          {state === "loading" ? "…" : "Subscribe"}
        </button>
      </div>
      {state !== "idle" && msg && (
        <p
          className={
            "mt-2 text-xs " +
            (state === "ok" ? "text-emerald-500" : state === "err" ? "text-destructive" : "text-muted-foreground")
          }
        >
          {msg}
        </p>
      )}
    </form>
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
