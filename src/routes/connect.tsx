import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Copy, Plug, Sparkles, Search, Upload, Terminal, Zap } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { CodeBlock } from "@/components/site/CodeBlock";
import { McpTester } from "@/components/site/McpTester";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect MCP — Lovable, Claude, Cursor, Codex, VS Code & more" },
      {
        name: "description",
        content:
          "Plug Super Agent Skill into any MCP-compatible client in under 30 seconds. Copy-paste configs for Lovable, Claude Desktop, Claude Code, Cursor, Windsurf, Codex CLI, OpenCode, VS Code, Zed and more.",
      },
      { property: "og:title", content: "Connect MCP — Super Agent Skill" },
    ],
  }),
  component: ConnectPage,
});

const ENDPOINT = "https://superagentskill.com/api/mcp";

/* ---------------- types ---------------- */

type Client = {
  id: string;
  name: string;
  short: string;
  badge?: string;
  blurb: string;
  steps: string[];
  filename: string;
  lang: string;
  code: string;
  notes?: string;
};

type Prompt = { title: string; code: string };

/* ---------------- data ---------------- */

const CLIENTS: Client[] = [
  {
    id: "lovable",
    name: "Lovable",
    short: "Workspace",
    badge: "1-click",
    blurb:
      "Add Super Agent Skill as an MCP connector inside the Lovable workspace. Tools become available to the agent during builds.",
    steps: [
      "Open Connectors → Add MCP Server in your Lovable workspace.",
      `Paste the URL: ${ENDPOINT}`,
      "Save. Tools appear in the agent automatically on the next message.",
    ],
    filename: "Workspace → Connectors",
    lang: "txt",
    code: `Name: Super Agent Skill
URL:  ${ENDPOINT}
Auth: none (read-only) · Bearer <token> for write tools`,
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    short: "Desktop app",
    badge: "Streamable HTTP",
    blurb:
      "Native MCP support. Edit the config file and restart Claude. The server appears in the tools menu.",
    steps: [
      "Open the config file (path below).",
      "Paste the snippet under mcpServers.",
      "Quit and reopen Claude Desktop.",
    ],
    filename: "~/Library/Application Support/Claude/claude_desktop_config.json",
    lang: "json",
    code: `{
  "mcpServers": {
    "super-agent-skill": {
      "url": "${ENDPOINT}"
    }
  }
}`,
    notes: "Windows path: %APPDATA%\\Claude\\claude_desktop_config.json",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    short: "Anthropic CLI",
    badge: "CLI",
    blurb: "One command registers the MCP server globally. Reuses your Claude account auth.",
    steps: ["Run the command in any terminal.", "Verify with `claude mcp list`."],
    filename: "shell",
    lang: "bash",
    code: `claude mcp add --transport http super-agent-skill ${ENDPOINT}`,
    notes:
      "For write tools (upload_packages, request_primitive auth-gated), append: --header 'Authorization: Bearer <token>'",
  },
  {
    id: "cursor",
    name: "Cursor",
    short: "IDE",
    badge: "Project + Global",
    blurb: "Drop-in JSON config at the project root or in the global settings folder.",
    steps: [
      "Create the file at the path below.",
      "Reload Cursor (Cmd/Ctrl+Shift+P → Reload Window).",
      "Open the MCP panel; super-agent-skill should be green.",
    ],
    filename: ".cursor/mcp.json",
    lang: "json",
    code: `{
  "mcpServers": {
    "super-agent-skill": {
      "url": "${ENDPOINT}"
    }
  }
}`,
    notes: "Global path: ~/.cursor/mcp.json — same JSON shape.",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    short: "Codeium Cascade",
    badge: "Cascade",
    blurb: "Cascade reads MCP servers from the codeium config directory.",
    steps: ["Edit the config file.", "Restart Windsurf."],
    filename: "~/.codeium/windsurf/mcp_config.json",
    lang: "json",
    code: `{
  "mcpServers": {
    "super-agent-skill": {
      "serverUrl": "${ENDPOINT}"
    }
  }
}`,
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    short: "OpenAI",
    badge: "TOML",
    blurb: "Codex CLI registers MCP servers via its config.toml.",
    steps: ["Edit ~/.codex/config.toml.", "Append the [mcp_servers] block below."],
    filename: "~/.codex/config.toml",
    lang: "toml",
    code: `[mcp_servers.super-agent-skill]
url = "${ENDPOINT}"
transport = "http"`,
  },
  {
    id: "opencode",
    name: "OpenCode",
    short: "OSS agent",
    badge: "JSON",
    blurb: "Open-source coding agent with native MCP support.",
    steps: [
      "Edit ~/.config/opencode/config.json.",
      "Run `opencode` in any repo — tools auto-load.",
    ],
    filename: "~/.config/opencode/config.json",
    lang: "json",
    code: `{
  "mcp": {
    "super-agent-skill": {
      "type": "remote",
      "url": "${ENDPOINT}",
      "enabled": true
    }
  }
}`,
  },
  {
    id: "vscode",
    name: "VS Code",
    short: "Copilot / Cline / Continue",
    badge: "settings.json",
    blurb:
      "VS Code 1.93+ supports MCP servers natively for Copilot Chat. Cline and Continue use the same shape.",
    steps: [
      "Open Settings (JSON) — Cmd/Ctrl+Shift+P → 'Preferences: Open User Settings (JSON)'.",
      "Add the snippet, save, reload window.",
    ],
    filename: "settings.json",
    lang: "json",
    code: `{
  "mcp": {
    "servers": {
      "super-agent-skill": {
        "type": "http",
        "url": "${ENDPOINT}"
      }
    }
  }
}`,
    notes:
      "Cline: same key under cline.mcpServers. Continue: ~/.continue/config.json under mcpServers.",
  },
  {
    id: "zed",
    name: "Zed",
    short: "Editor",
    badge: "context_servers",
    blurb: "Zed exposes MCP servers as context servers in its settings.json.",
    steps: ["Open Zed settings (Cmd+,).", "Add the snippet under context_servers."],
    filename: "~/.config/zed/settings.json",
    lang: "json",
    code: `{
  "context_servers": {
    "super-agent-skill": {
      "source": "custom",
      "url": "${ENDPOINT}"
    }
  }
}`,
  },
  {
    id: "cline",
    name: "Cline / Roo",
    short: "VS Code panel",
    badge: "Side panel",
    blurb:
      "Cline-family extensions read MCP servers from a dedicated JSON file managed via the side panel.",
    steps: ["Open Cline → MCP Servers → Edit MCP Settings.", "Paste the snippet, save."],
    filename: "cline_mcp_settings.json",
    lang: "json",
    code: `{
  "mcpServers": {
    "super-agent-skill": {
      "url": "${ENDPOINT}",
      "disabled": false,
      "autoApprove": ["list_packages", "search_registry", "get_package"]
    }
  }
}`,
  },
  {
    id: "n8n",
    name: "n8n",
    short: "Workflow agent",
    badge: "MCP Client node",
    blurb:
      "Use the MCP Client node inside any AI Agent workflow. Tools become callable steps.",
    steps: [
      "Add the MCP Client node to your AI Agent.",
      "Set transport to HTTP and paste the URL.",
    ],
    filename: "n8n → MCP Client node",
    lang: "txt",
    code: `Transport: HTTP (Streamable)
Endpoint:  ${ENDPOINT}
Headers:   Accept: application/json, text/event-stream`,
  },
  {
    id: "custom",
    name: "Custom",
    short: "Any MCP runtime",
    badge: "Generic",
    blurb:
      "Any client speaking MCP Streamable HTTP can connect — Hermes, Grok, OpenClaw, custom Python/Node agents.",
    steps: [
      "POST JSON-RPC 2.0 to the endpoint.",
      "Always send the Accept header — servers reject without it (HTTP 406).",
    ],
    filename: "shell",
    lang: "bash",
    code: `curl -X POST ${ENDPOINT} \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
  },
];

const QUICK_PROMPTS: Prompt[] = [
  {
    title: "Codex CLI / OpenCode",
    code: `Install the "Super Agent Skill" MCP server using this Streamable HTTP endpoint:
  ${ENDPOINT}

Steps:
1. Add it to my MCP config (transport: http, no auth required for read tools).
2. Restart the MCP connection.
3. Call the "list_packages" tool with no arguments and show me the first 5 results.
If anything fails, print the exact error and the config you wrote.`,
  },
  {
    title: "Claude Code (CLI)",
    code: `Run this command in my shell, then verify it works:

  claude mcp add --transport http super-agent-skill ${ENDPOINT}

After it succeeds, call the MCP tool "search_registry" with query "code review" and summarize the top 3 results.`,
  },
  {
    title: "Claude Desktop",
    code: `Add this MCP server to my claude_desktop_config.json under "mcpServers":

  "super-agent-skill": { "url": "${ENDPOINT}" }

Tell me the exact file path for my OS, write the merged JSON (preserving any existing servers), and remind me to fully quit and reopen Claude Desktop.`,
  },
  {
    title: "Cursor / Windsurf / VS Code",
    code: `Add the "Super Agent Skill" MCP server to this project.

Endpoint (Streamable HTTP): ${ENDPOINT}
Auth: none for read tools. Bearer token only for write tools.

Create or update the right config file for the editor I'm using, then tell me to reload the window. After reload, call list_packages and show me the count.`,
  },
  {
    title: "Lovable",
    code: `Connect the Super Agent Skill MCP server to this project.

URL: ${ENDPOINT}
Transport: Streamable HTTP, no auth required.

After it's connected, call the tool "search_registry" with query "design review" and recommend the best matching skill for this codebase.`,
  },
];

const UPGRADE_PROMPTS: Prompt[] = [
  {
    title: "Upgrade a skill end-to-end",
    code: `Use @superagentskill to significantly upgrade my local skill at .claude/skills/code-reviewer.md.
1. Call get_methodology to load the rubric.
2. Call review_skill on the file's raw content — show me the per-pillar score.
3. Edit the file in place applying every top_action.
4. Re-run review_skill and show the before/after grade and per-pillar delta.
Stop only when the overall score is >= 90.`,
  },
  {
    title: "Audit & harden a playbook",
    code: `Use @superagentskill to audit docs/playbooks/incident-response.md against the SuperAgentSkill methodology.
Score it, then rewrite the 3 weakest pillars in place.
Show the diff and the new overall_score. Don't touch pillars already at >= 80.`,
  },
  {
    title: "Harden a soul / persona",
    code: `Use @superagentskill to upgrade the soul at agents/nova/SOUL.md.
Focus on Identity, Guardrails and Trust pillars.
After review_skill, also call search_registry type="soul" to borrow patterns from the 3 highest-trust souls. Merge what fits, then re-score.`,
  },
  {
    title: "Author a new guardrail",
    code: `Use @superagentskill: call get_methodology, then draft a brand-new guardrail file at .agents/guardrails/no-pii-leak.md that scores >= 90 on every pillar. Verify by calling review_skill on your draft BEFORE handing it to me.`,
  },
  {
    title: "Batch-upgrade a folder",
    code: `Use @superagentskill to upgrade every .md file under .claude/skills/.
For each file: review_skill → edit in place → re-review. Skip files already at grade A.
At the end, print a table: file | before | after | delta.`,
  },
  {
    title: "Compare two versions",
    code: `Use @superagentskill to score both versions of my skill (skill-v1.md and skill-v2.md) with review_skill.
Tell me which one wins per pillar, what v2 broke that v1 had right, and what to merge into a v3.`,
  },
];

const DISCOVER_PROMPTS: Prompt[] = [
  {
    title: "Find the best skill for a task",
    code: `Use @superagentskill: call search_registry with query="<my task in 2-5 words>" and limit=20.
Then call get_skill_trust on the top 5 results.
Recommend the highest trust_score one, paste its system_prompt from get_package, and tell me which models it's validated on.`,
  },
  {
    title: "Browse a domain",
    code: `Use @superagentskill: call search_registry with query="marketing" type="skill" limit=30.
Group results by sub-domain (copywriting, ads, growth, brand, …) and show top 3 per group with their install_count and trust_score.`,
  },
  {
    title: "Borrow patterns into my local skill",
    code: `Use @superagentskill to find the highest-trust "code-reviewer" skill in the registry.
Fetch its full manifest with get_package, identify the 3 strongest sections, and merge them into my local code-reviewer.md.
Run review_skill before and after — score must improve.`,
  },
  {
    title: "Install + run + report",
    code: `Use @superagentskill to install the skill "<slug>": call get_package, save the system_prompt under .claude/skills/<slug>.md, run it on <my task>, then call report_execution with success=true/false, the model name and latency_ms.`,
  },
];

const PUBLISH_PROMPTS: Prompt[] = [
  {
    title: "Upload a single skill as draft",
    code: `Use @superagentskill: read my file at .claude/skills/<my-skill>.md, then call upload_packages with files=[{name:"<my-skill>.md", content:<file content>, type:"skill"}] and publish=false.
Print the returned slug so I can review the draft at /packages/<slug>.`,
  },
  {
    title: "Bulk-upload a folder & publish",
    code: `Use @superagentskill to publish every .md file under agents/published/ (max 10 per call).
First call review_skill on each — only publish files that score >= 80.
Then upload_packages with publish=true. Print a table: filename | slug | grade.`,
  },
  {
    title: "Request a primitive you wish existed",
    code: `Use @superagentskill to request a new primitive: a "supabase-rls-auditor" skill that reviews Postgres RLS policies for privilege-escalation patterns.
Call request_primitive with a detailed brief, my industry, and report the request_id back so I can track it.`,
  },
  {
    title: "Round-trip: upgrade → publish",
    code: `Use @superagentskill to take my local skill at <path>, upgrade it (get_methodology + review_skill + edit + re-review until grade A), THEN upload_packages with publish=true so the improved version goes back to the registry. Print before/after score and the published slug.`,
  },
];

/* ---------------- small UI helpers ---------------- */

function CopyInline({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
      aria-label="Copy endpoint"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function PromptGrid({ prompts }: { prompts: Prompt[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {prompts.map((p) => (
        <CodeBlock key={p.title} filename={p.title} lang="txt" code={p.code} />
      ))}
    </div>
  );
}

/* ---------------- page ---------------- */

function ConnectPage() {
  const [activeClient, setActiveClient] = useState<string>(CLIENTS[0].id);
  const client = CLIENTS.find((c) => c.id === activeClient) ?? CLIENTS[0];

  return (
    <SitePage>
      <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        {/* ============ HERO ============ */}
        <section className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
              Connect · MCP
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              One MCP server.
              <br />
              <span className="text-muted-foreground">Every coding agent.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              Plug Super Agent Skill into Lovable, Claude, Cursor, Codex, VS Code, Zed, n8n and any
              MCP-compatible runtime. Read tools work anonymously — write tools need a token.
            </p>
          </div>

          {/* Endpoint card */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-elevated">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Streamable HTTP endpoint
            </p>
            <div className="mt-3 flex items-center gap-3">
              <code className="font-mono text-sm font-medium text-foreground">{ENDPOINT}</code>
              <CopyInline value={ENDPOINT} />
            </div>
            <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                Live
              </span>
              <span>·</span>
              <span>3 read tools · free</span>
              <span>·</span>
              <span>4 write tools · token</span>
            </div>
          </div>
        </section>

        {/* ============ JUMP NAV ============ */}
        <nav className="mt-10 flex flex-wrap gap-2 border-y border-border py-4">
          {[
            { href: "#quick-start", label: "Quick start", icon: Zap },
            { href: "#test", label: "Test it live", icon: Plug },
            { href: "#clients", label: "Client configs", icon: Terminal },
            { href: "#prompts", label: "Power prompts", icon: Sparkles },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </nav>

        {/* ============ QUICK START — paste-prompt path ============ */}
        <section id="quick-start" className="mt-14 scroll-mt-24">
          <SectionHeader
            eyebrow="01 · Fastest path"
            title="Don't touch JSON. Paste a prompt."
            description="Pick your agent. Paste the prompt in chat. It writes the config, restarts, and runs a test call so you know it works."
            icon={Zap}
          />

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            <Tabs defaultValue={QUICK_PROMPTS[0].title}>
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                {QUICK_PROMPTS.map((p) => (
                  <TabsTrigger
                    key={p.title}
                    value={p.title}
                    className="rounded-md border border-transparent px-3 py-1.5 text-xs font-medium data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {p.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {QUICK_PROMPTS.map((p) => (
                <TabsContent key={p.title} value={p.title} className="mt-4">
                  <CodeBlock filename={`Paste in ${p.title}`} lang="txt" code={p.code} />
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            For write tools (
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">upload_packages</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">request_primitive</code>),
            append <code className="rounded bg-muted px-1 py-0.5 text-[11px]">Authorization: Bearer &lt;token&gt;</code>{" "}
            from{" "}
            <Link to="/account/tokens" className="text-primary hover:underline">
              Account → Tokens
            </Link>
            .
          </p>
        </section>

        {/* ============ TEST IT LIVE ============ */}
        <section id="test" className="mt-16 scroll-mt-24">
          <SectionHeader
            eyebrow="02 · Verify"
            title="Test the MCP server, right here."
            description="Probe the live endpoint from your browser or a shell. No setup needed."
            icon={Plug}
          />
          <div className="mt-6">
            <McpTester />
          </div>

          <details className="mt-4 rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer text-sm font-medium">
              Or hit the public health endpoint from your terminal
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirms reachability from your network and enumerates the live tool catalog — no auth.
            </p>
            <div className="mt-3">
              <CodeBlock
                filename="shell"
                lang="bash"
                code={`curl -s ${ENDPOINT.replace("/api/mcp", "/api/public/mcp/health")} | jq`}
              />
            </div>
          </details>
        </section>

        {/* ============ CLIENT CONFIGS ============ */}
        <section id="clients" className="mt-16 scroll-mt-24">
          <SectionHeader
            eyebrow="03 · Configs"
            title="Manual setup for every client."
            description="Pick your client. Copy the snippet. Restart. Tools appear in the agent."
            icon={Terminal}
          />

          <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
            {/* Left: client list */}
            <aside className="rounded-2xl border border-border bg-card p-2">
              <ul className="grid gap-0.5">
                {CLIENTS.map((c) => {
                  const active = c.id === activeClient;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveClient(c.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{c.name}</div>
                          <div className="truncate font-mono text-[10px] uppercase tracking-wider opacity-70">
                            {c.short}
                          </div>
                        </div>
                        {active && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Right: client detail */}
            <article className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">{client.name}</h3>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {client.short}
                  </p>
                </div>
                {client.badge && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    {client.badge}
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{client.blurb}</p>

              <ol className="mt-5 grid gap-2 text-sm">
                {client.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-5">
                <CodeBlock filename={client.filename} lang={client.lang} code={client.code} />
              </div>

              {client.notes && (
                <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> {client.notes}
                </p>
              )}
            </article>
          </div>
        </section>

        {/* ============ POWER PROMPTS — once connected ============ */}
        <section id="prompts" className="mt-16 scroll-mt-24">
          <SectionHeader
            eyebrow="04 · Power moves"
            title="Once connected — what to ask the agent."
            description="Three intent groups. Copy a prompt, swap a path or topic, send. The agent routes to @superagentskill automatically."
            icon={Sparkles}
          />

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            <Tabs defaultValue="upgrade">
              <TabsList className="grid w-full grid-cols-3 bg-muted/60">
                <TabsTrigger value="upgrade" className="gap-1.5 data-[state=active]:bg-background">
                  <Zap className="h-3.5 w-3.5" /> Upgrade
                </TabsTrigger>
                <TabsTrigger value="discover" className="gap-1.5 data-[state=active]:bg-background">
                  <Search className="h-3.5 w-3.5" /> Discover
                </TabsTrigger>
                <TabsTrigger value="publish" className="gap-1.5 data-[state=active]:bg-background">
                  <Upload className="h-3.5 w-3.5" /> Publish
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upgrade" className="mt-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Significantly improve a local skill, playbook, soul or guardrail. Uses{" "}
                  <code className="rounded bg-muted px-1 text-[11px]">get_methodology</code> →{" "}
                  <code className="rounded bg-muted px-1 text-[11px]">review_skill</code> → host
                  edits → re-score. The score delta is the proof.
                </p>
                <PromptGrid prompts={UPGRADE_PROMPTS} />
              </TabsContent>

              <TabsContent value="discover" className="mt-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Find &amp; install battle-tested primitives from the registry (590+). Always pair{" "}
                  <code className="rounded bg-muted px-1 text-[11px]">search_registry</code> with{" "}
                  <code className="rounded bg-muted px-1 text-[11px]">get_skill_trust</code> before
                  recommending. Report results back with{" "}
                  <code className="rounded bg-muted px-1 text-[11px]">report_execution</code>.
                </p>
                <PromptGrid prompts={DISCOVER_PROMPTS} />
              </TabsContent>

              <TabsContent value="publish" className="mt-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Push your local primitives back to the registry. Requires OAuth (Claude does this
                  automatically) or a personal token from{" "}
                  <Link to="/account/tokens" className="text-primary hover:underline">
                    /account/tokens
                  </Link>
                  .
                </p>
                <PromptGrid prompts={PUBLISH_PROMPTS} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary">Pro tips</p>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <li className="flex gap-2">
                <span className="text-primary">→</span> If the agent can't find the server, ask it
                to call <code className="rounded bg-muted px-1 text-xs">overview</code> first — it
                returns the full intent → tool map.
              </li>
              <li className="flex gap-2">
                <span className="text-primary">→</span> Always run{" "}
                <code className="rounded bg-muted px-1 text-xs">review_skill</code> twice (before
                and after edits). The score delta is the proof.
              </li>
              <li className="flex gap-2">
                <span className="text-primary">→</span> Always call{" "}
                <code className="rounded bg-muted px-1 text-xs">get_skill_trust</code> before
                recommending a registry primitive.
              </li>
              <li className="flex gap-2">
                <span className="text-primary">→</span> If your client doesn't auto-mention MCP
                servers, just write: <em>"Using the superagentskill MCP, …"</em>
              </li>
            </ul>
          </div>
        </section>

        {/* ============ FOOTER NOTE ============ */}
        <section className="mt-16 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <h3 className="text-lg font-semibold">Don't see your client?</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Any runtime that speaks{" "}
            <a
              href="https://modelcontextprotocol.io/specification/2025-06-18/basic/transports"
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              MCP Streamable HTTP
            </a>{" "}
            connects with the same URL. The full reference (tools, schemas, errors) lives in the{" "}
            <Link to="/docs/mcp" className="text-primary hover:underline">
              MCP docs
            </Link>
            .
          </p>
        </section>
      </main>
    </SitePage>
  );
}
