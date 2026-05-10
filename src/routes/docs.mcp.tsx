import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CodeBlock } from "@/components/site/CodeBlock";

export const Route = createFileRoute("/docs/mcp")({
  head: () => ({
    meta: [
      { title: "MCP Reference — Super Agent Skill" },
      {
        name: "description",
        content:
          "Full MCP reference for Super Agent Skill: tools, schemas, transports, auth, configs for Claude, Cursor, Codex, Hermes, OpenClaw, Grok, and any custom MCP-compatible runtime.",
      },
      { property: "og:title", content: "MCP Reference — Super Agent Skill" },
    ],
  }),
  component: McpDocs,
});

const SECTIONS = [
  { id: "endpoint", label: "Endpoint" },
  { id: "transport", label: "Transport" },
  { id: "auth", label: "Auth" },
  { id: "tools", label: "Tools" },
  { id: "configs", label: "Client configs" },
  { id: "errors", label: "Errors & limits" },
  { id: "agents", label: "For AI agents" },
];

const TOOLS = [
  {
    name: "list_packages",
    desc: "List published primitives (skills, playbooks, souls, guardrails). Optional type and free-text filter.",
    input: `{
  "type":  "skill" | "playbook" | "soul" | "guardrail",   // optional
  "query": "string",                                       // optional, ilike on name
  "limit": 1..50                                            // default 20
}`,
    output: `{
  "count": number,
  "items": [{
    "slug": "cardiology-triage",
    "name": "cardiology-triage",
    "type": "skill",
    "description": "Structured cardiac triage…",
    "latest_version": "1.0.0",
    "author_handle": "@mayo-health"
  }]
}`,
  },
  {
    name: "search_registry",
    desc: "Search across name + description + long description. Use when slug is unknown.",
    input: `{ "query": "string (min 2)", "limit": 1..20 }`,
    output: `{ "query": "...", "count": n, "items": [...] }`,
  },
  {
    name: "get_package",
    desc: "Fetch the full latest-version manifest of a primitive: system prompt, rules, examples, compatibility, notes.",
    input: `{ "slug": "cardiology-triage" }`,
    output: `{
  "package": { "slug","name","type","description","latest_version", ... },
  "version": {
    "version": "1.0.0",
    "status":  "stable" | "beta",
    "system_prompt": "string",
    "rules":   {...},
    "examples":[{ "title","input","expected_output" }],
    "compatibility": [...],
    "notes":   "string"
  }
}`,
  },
  {
    name: "request_primitive",
    desc: "Submit a request for a primitive that does not yet exist. The Super Agent Skill forge pipeline (research → author → evaluate → publish) creates it on demand.",
    input: `{
  "type":     "skill" | "playbook" | "soul" | "guardrail",
  "brief":    "20–2000 chars; what the primitive should do, with industry/context",
  "industry": "string (optional, ≤80 chars)"
}`,
    output: `{ "request_id": "uuid", "status": "queued", "note": "..." }`,
  },
];

function McpDocs() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 md:grid-cols-[220px_1fr] md:py-12">
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">MCP Reference</div>
          <nav className="mt-4 space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
            <div className="mt-4 border-t border-border pt-3">
              <Link to="/docs" className="block rounded px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                ← Back to Docs
              </Link>
            </div>
          </nav>
        </aside>

        <article className="prose prose-neutral max-w-none">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">MCP Reference</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Everything an agent can do over MCP.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Super Agent Skill exposes its registry, its forge pipeline, and its continuous evolution loop through
            a single MCP endpoint. Any MCP-compatible runtime can connect — no SDK, no glue code.
          </p>

          {/* Endpoint */}
          <h2 id="endpoint" className="mt-12 text-2xl font-semibold tracking-tight">Endpoint</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-4 text-sm">
            <div className="font-mono text-foreground">POST/GET/DELETE  https://superagentskill.com/api/mcp</div>
            <div className="mt-1 text-muted-foreground">Single endpoint, JSON-RPC 2.0 framed by the MCP Streamable HTTP spec.</div>
          </div>

          {/* Transport */}
          <h2 id="transport" className="mt-12 text-2xl font-semibold tracking-tight">Transport</h2>
          <p className="mt-2 text-muted-foreground">
            HTTP Streamable. Every request must include both <code>application/json</code> and
            <code> text/event-stream</code> in <code>Accept</code>, otherwise the server returns
            <code> 406 Not Acceptable</code>.
          </p>
          <div className="mt-4">
            <CodeBlock
              filename="curl"
              lang="bash"
              code={`curl -X POST https://superagentskill.com/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{
    "jsonrpc":"2.0","id":1,"method":"initialize",
    "params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"my-agent","version":"1.0.0"}}
  }'`}
            />
          </div>

          {/* Auth */}
          <h2 id="auth" className="mt-12 text-2xl font-semibold tracking-tight">Authentication</h2>
          <p className="mt-2 text-muted-foreground">
            Read tools (<code>list_packages</code>, <code>search_registry</code>, <code>get_package</code>) are
            available without authentication for the public registry. Mutating tools
            (<code>request_primitive</code>) accept an optional <code>Authorization: Bearer &lt;token&gt;</code>
            header to attribute the request to your account and unlock per-plan limits.
          </p>

          {/* Tools */}
          <h2 id="tools" className="mt-12 text-2xl font-semibold tracking-tight">Tools</h2>
          <p className="mt-2 text-muted-foreground">
            Discover tools at runtime with <code>tools/list</code>. Below is the canonical reference.
          </p>

          <div className="mt-6 space-y-6">
            {TOOLS.map((t) => (
              <div key={t.name} id={`tool-${t.name}`} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-background px-2 py-0.5 font-mono text-sm font-semibold text-primary">
                    {t.name}
                  </code>
                  <span className="text-xs text-muted-foreground">tool</span>
                </div>
                <p className="mt-2 text-sm text-foreground/90">{t.desc}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Input</div>
                    <pre className="overflow-x-auto rounded border border-border bg-background p-3 text-xs"><code>{t.input}</code></pre>
                  </div>
                  <div>
                    <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Output</div>
                    <pre className="overflow-x-auto rounded border border-border bg-background p-3 text-xs"><code>{t.output}</code></pre>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-xl font-semibold tracking-tight">Calling a tool</h3>
          <CodeBlock
            filename="JSON-RPC tools/call"
            lang="json"
            code={`{
  "jsonrpc":"2.0","id":3,"method":"tools/call",
  "params":{
    "name":"search_registry",
    "arguments":{ "query":"cardiology", "limit":5 }
  }
}`}
          />

          {/* Configs */}
          <h2 id="configs" className="mt-12 text-2xl font-semibold tracking-tight">Client configs</h2>

          <h3 className="mt-6 text-lg font-semibold">Claude Desktop</h3>
          <CodeBlock
            filename="~/Library/Application Support/Claude/claude_desktop_config.json"
            lang="json"
            code={`{
  "mcpServers": {
    "super-agent-skill": {
      "url": "https://superagentskill.com/api/mcp"
    }
  }
}`}
          />

          <h3 className="mt-6 text-lg font-semibold">Cursor</h3>
          <CodeBlock
            filename=".cursor/mcp.json"
            lang="json"
            code={`{
  "mcpServers": {
    "super-agent-skill": { "url": "https://superagentskill.com/api/mcp" }
  }
}`}
          />

          <h3 className="mt-6 text-lg font-semibold">OpenAI Codex / GPT runtime</h3>
          <CodeBlock
            filename="codex.config.json"
            lang="json"
            code={`{
  "tools": [
    {
      "type": "mcp",
      "server_url": "https://superagentskill.com/api/mcp",
      "headers": { "Accept": "application/json, text/event-stream" }
    }
  ]
}`}
          />

          <h3 className="mt-6 text-lg font-semibold">Hermes / Grok / OpenClaw / any custom runtime</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Any client that implements MCP Streamable HTTP can connect. Point it at the endpoint and use
            standard <code>initialize</code> → <code>tools/list</code> → <code>tools/call</code> flow.
          </p>

          {/* Errors */}
          <h2 id="errors" className="mt-12 text-2xl font-semibold tracking-tight">Errors & limits</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><code>406 Not Acceptable</code> — missing <code>Accept: application/json, text/event-stream</code></li>
            <li><code>401 Unauthorized</code> — mutating tool called without a valid bearer token</li>
            <li><code>429 Too Many Requests</code> — per-plan monthly limit reached (see <Link to="/pricing">Pricing</Link>)</li>
            <li><code>{"{ error: \"not_found\" }"}</code> — slug not in registry; try <code>search_registry</code> or <code>request_primitive</code></li>
          </ul>

          {/* For agents */}
          <h2 id="agents" className="mt-12 text-2xl font-semibold tracking-tight">Made for AI agents</h2>
          <p className="mt-2 text-muted-foreground">
            We publish two machine-readable specs that any LLM can ingest at startup:
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <a href="/llms.txt" className="rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-accent">
              <div className="font-mono text-sm font-semibold text-primary">/llms.txt</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Compact one-pager following the llms.txt convention. Drop it in your system prompt.
              </div>
            </a>
            <a href="/agents.md" className="rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-accent">
              <div className="font-mono text-sm font-semibold text-primary">/agents.md</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Long-form Markdown manual: every tool, schema, error, and decision rule for autonomous agents.
              </div>
            </a>
          </div>

          <div className="mt-10 rounded-xl border border-primary/40 bg-primary/5 p-5">
            <div className="font-mono text-xs uppercase tracking-wider text-primary">Heads up</div>
            <p className="mt-2 text-sm text-foreground/90">
              Want to test right now? Paste the Claude config above, restart Claude Desktop, and ask:
              <em> "Use the super-agent-skill MCP server to find a cardiology skill and show me its system prompt."</em>
            </p>
          </div>
        </article>
      </div>
      <Footer />
    </div>
  );
}
