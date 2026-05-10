import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CodeBlock } from "@/components/site/CodeBlock";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Super Agent Skill" },
      { name: "description", content: "Connect any AI agent to Super Agent Skill through MCP. Quickstart, capabilities, and the Evolution Engine." },
    ],
  }),
  component: Docs,
});

function Docs() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Documentation</div>
          <nav className="mt-4 space-y-1 text-sm">
            {["Quickstart", "MCP Gateway", "Skills", "Playbooks", "Souls", "Guardrails", "SkillForge AI", "Evolution Engine", "API Reference"].map((s) => (
              <a key={s} href={`#${s.toLowerCase().replace(/\s+/g, "-")}`} className="block rounded px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {s}
              </a>
            ))}
          </nav>
        </aside>

        <article className="prose prose-neutral max-w-none">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Quickstart</span>
          <h1 id="quickstart" className="mt-3 text-4xl font-semibold tracking-tight">Connect your agent in 30 seconds.</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Super Agent Skill speaks MCP natively. Any agent runtime that supports MCP — Claude, Cursor, Codex, OpenClaw, Hermes, Grok — can connect with a single capability declaration.
          </p>

          <h2 id="mcp-gateway" className="mt-12 text-2xl font-semibold tracking-tight">1. Add the MCP server</h2>
          <p className="mt-2 text-muted-foreground">Drop the Super Agent Skill gateway into your agent's MCP config.</p>
          <div className="mt-4">
            <CodeBlock
              filename="mcp.config.json"
              lang="json"
              code={`{
  "mcpServers": {
    "superagentskill": {
      "url": "https://gateway.superagentskill.dev/mcp",
      "auth": { "type": "oauth", "scopes": ["registry:read", "agent:upgrade"] }
    }
  }
}`}
            />
          </div>

          <h2 id="skills" className="mt-12 text-2xl font-semibold tracking-tight">2. Trigger the upgrade</h2>
          <p className="mt-2 text-muted-foreground">Once connected, give your agent the keywords. It does the rest.</p>
          <div className="mt-4">
            <CodeBlock
              code={`> Super Agent Skill: check for updates and improvements

→ Self-assessing context........... primary care, pediatrics
→ Identified gaps.................. 3
→ Recommended packages............. 5
→ Installing...................... ✓
→ New health score................. 96.1 / 100`}
            />
          </div>

          <h2 id="playbooks" className="mt-12 text-2xl font-semibold tracking-tight">3. The four primitives</h2>
          <p className="mt-2 text-muted-foreground">Every agent runs on the same stack: <span className="font-mono text-foreground">skills</span>, <span className="font-mono text-foreground">playbooks</span>, <span className="font-mono text-foreground">souls</span>, and <span className="font-mono text-foreground">guardrails</span>.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { t: "Skills", d: "Discrete capabilities — domain reasoning, tool use, structured outputs." },
              { t: "Playbooks", d: "Multi-step workflows that orchestrate skills toward an outcome." },
              { t: "Souls", d: "Personality, tone, and decision-making style as installable packages." },
              { t: "Guardrails", d: "Safety boundaries enforced before output reaches the user." },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border border-border bg-surface p-5">
                <div className="font-mono text-xs uppercase tracking-wider text-primary">{x.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>

          <h2 id="evolution-engine" className="mt-12 text-2xl font-semibold tracking-tight">4. The Evolution Engine</h2>
          <p className="mt-2 text-muted-foreground">
            Every install reports anonymized feedback. SkillForge AI processes the signal and ships
            improved package versions to the entire network. Your agent gets smarter while you sleep.
          </p>
        </article>
      </div>
      <Footer />
    </div>
  );
}
