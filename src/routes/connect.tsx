import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CodeBlock } from "@/components/site/CodeBlock";
import { McpTester } from "@/components/site/McpTester";

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

type Client = {
  id: string;
  name: string;
  blurb: string;
  badge?: string;
  steps: string[];
  filename: string;
  lang: string;
  code: string;
  notes?: string;
};

const CLIENTS: Client[] = [
  {
    id: "lovable",
    name: "Lovable",
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
    name: "Claude Code (Anthropic CLI)",
    badge: "CLI",
    blurb:
      "One command registers the MCP server globally. Reuses your Claude account auth.",
    steps: [
      "Run the command in any terminal.",
      "Verify with `claude mcp list`.",
    ],
    filename: "shell",
    lang: "bash",
    code: `claude mcp add --transport http super-agent-skill ${ENDPOINT}`,
    notes:
      "For write tools (upload_packages, request_primitive auth-gated), append: --header 'Authorization: Bearer <token>'",
  },
  {
    id: "cursor",
    name: "Cursor",
    badge: "Project + Global",
    blurb:
      "Drop-in JSON config at the project root or in the global settings folder.",
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
    name: "Windsurf (Codeium)",
    badge: "Cascade",
    blurb: "Cascade reads MCP servers from the codeium config directory.",
    steps: [
      "Edit the config file.",
      "Restart Windsurf.",
    ],
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
    name: "OpenAI Codex CLI",
    badge: "TOML",
    blurb: "Codex CLI registers MCP servers via its config.toml.",
    steps: [
      "Edit ~/.codex/config.toml.",
      "Append the [mcp_servers] block below.",
    ],
    filename: "~/.codex/config.toml",
    lang: "toml",
    code: `[mcp_servers.super-agent-skill]
url = "${ENDPOINT}"
transport = "http"`,
  },
  {
    id: "opencode",
    name: "OpenCode",
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
    name: "VS Code (Copilot Chat / Cline / Continue)",
    badge: "settings.json",
    blurb:
      "VS Code 1.93+ supports MCP servers natively for GitHub Copilot Chat. Cline and Continue use the same shape.",
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
    badge: "context_servers",
    blurb: "Zed exposes MCP servers as context servers in its settings.json.",
    steps: [
      "Open Zed settings (Cmd+,).",
      "Add the snippet under context_servers.",
    ],
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
    name: "Cline / Roo Code (CoWork)",
    badge: "Side panel",
    blurb:
      "Cline-family extensions read MCP servers from a dedicated JSON file managed via the side panel.",
    steps: [
      "Open Cline → MCP Servers → Edit MCP Settings.",
      "Paste the snippet, save.",
    ],
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
    name: "n8n (workflow agent)",
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
    name: "Any custom runtime",
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

function ConnectPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Connect</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            One MCP server. Every coding agent.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Copy-paste config for the client of your choice. Read tools (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">list_packages</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">search_registry</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">get_package</code>) work
            anonymously. Write tools (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">upload_packages</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">request_primitive</code>) need
            a token from{" "}
            <Link to="/account/tokens" className="text-primary hover:underline">
              Account → Tokens
            </Link>
            .
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs">
            <span className="text-muted-foreground">Endpoint:</span>
            <span>{ENDPOINT}</span>
          </div>
        </header>

        {/* Live test */}
        <McpTester />

        {/* Health check from terminal */}
        <section className="mb-10 rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-xl font-semibold">Verify from your terminal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hit the public health endpoint to confirm the registry is reachable from your network
            and to enumerate the live tool catalog — no auth required.
          </p>
          <div className="mt-3">
            <CodeBlock
              filename="shell"
              lang="bash"
              code={`curl -s ${ENDPOINT.replace("/api/mcp", "/api/public/mcp/health")} | jq`}
            />
          </div>
        </section>

        {/* Ready-to-paste prompts */}
        <section id="prompts" className="mb-10 scroll-mt-24 rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">Copy-paste prompts (no config editing)</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Fastest path
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Don't want to touch JSON? Paste the prompt for your agent — it will install Super Agent
            Skill as an MCP server, then call <code className="rounded bg-muted px-1 py-0.5 text-xs">tools/list</code> to confirm
            it works.
          </p>

          <div className="mt-4 grid gap-4">
            <CodeBlock
              filename="Codex CLI / OpenCode — paste in chat"
              lang="txt"
              code={`Install the "Super Agent Skill" MCP server using this Streamable HTTP endpoint:
  ${ENDPOINT}

Steps:
1. Add it to my MCP config (transport: http, no auth required for read tools).
2. Restart the MCP connection.
3. Call the "list_packages" tool with no arguments and show me the first 5 results.
If anything fails, print the exact error and the config you wrote.`}
            />

            <CodeBlock
              filename="Claude Code (CLI) — paste in chat"
              lang="txt"
              code={`Run this command in my shell, then verify it works:

  claude mcp add --transport http super-agent-skill ${ENDPOINT}

After it succeeds, call the MCP tool "search_registry" with query "code review" and summarize the top 3 results.`}
            />

            <CodeBlock
              filename="Claude Desktop — paste in chat"
              lang="txt"
              code={`Add this MCP server to my claude_desktop_config.json under "mcpServers":

  "super-agent-skill": { "url": "${ENDPOINT}" }

Tell me the exact file path for my OS, write the merged JSON (preserving any existing servers), and remind me to fully quit and reopen Claude Desktop. Then list the tools I should see (list_packages, search_registry, get_package, request_primitive, report_execution, get_skill_trust, upload_packages).`}
            />

            <CodeBlock
              filename="Cursor / Windsurf / VS Code — paste in chat"
              lang="txt"
              code={`Add the "Super Agent Skill" MCP server to this project.

Endpoint (Streamable HTTP): ${ENDPOINT}
Auth: none for read tools (list_packages, search_registry, get_package). Bearer token only for write tools.

Create or update the right config file for the editor I'm using (.cursor/mcp.json, ~/.codeium/windsurf/mcp_config.json, or VS Code settings.json under "mcp.servers"), then tell me to reload the window. After reload, call list_packages and show me the count.`}
            />

            <CodeBlock
              filename="Lovable — paste in chat"
              lang="txt"
              code={`Connect the Super Agent Skill MCP server to this project.

URL: ${ENDPOINT}
Transport: Streamable HTTP, no auth required.

After it's connected, call the tool "search_registry" with query "design review" and recommend the best matching skill for this codebase.`}
            />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            For write tools (<code className="rounded bg-muted px-1 py-0.5 text-[11px]">upload_packages</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">request_primitive</code>), append:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">Authorization: Bearer &lt;token&gt;</code> from{" "}
            <Link to="/account/tokens" className="text-primary hover:underline">Account → Tokens</Link>.
          </p>
        </section>

        {/* Quick jump */}
        <nav className="mb-10 flex flex-wrap gap-2">
          <a
            href="#prompts"
            className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition hover:border-primary/60"
          >
            ✨ Copy-paste prompts
          </a>
          <a
            href="#test-mcp"
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 transition hover:border-emerald-500/60 dark:text-emerald-400"
          >
            ▶ Test MCP
          </a>
          <a
            href="#usage"
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 transition hover:border-emerald-500/60 dark:text-emerald-400"
          >
            💬 How to use it
          </a>
          {CLIENTS.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {c.name}
            </a>
          ))}
        </nav>

        <div className="grid gap-6">
          {CLIENTS.map((c) => (
            <section
              key={c.id}
              id={c.id}
              className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 md:p-6"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">{c.name}</h2>
                {c.badge && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {c.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{c.blurb}</p>

              <ol className="mt-4 grid gap-1.5 text-sm">
                {c.steps.map((s, i) => (
                  <li key={s} className="flex gap-2 text-muted-foreground">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-4">
                <CodeBlock filename={c.filename} lang={c.lang} code={c.code} />
              </div>

              {c.notes && (
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> {c.notes}
                </p>
              )}
            </section>
          ))}
        </div>

        {/* After connecting — how to actually USE it */}
        <section id="usage" className="mt-12 scroll-mt-24 rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">Once connected — copy-paste prompts for your agent</h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              Ready-made
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Three things you can do from Claude / Codex / any MCP-aware agent. Just copy a block,
            paste it in chat, swap the file path or topic, and send. The agent routes to{" "}
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">@superagentskill</code> automatically.
          </p>

          {/* INTENT 1 — UPGRADE */}
          <div className="mt-6 flex items-baseline gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              1. Upgrade
            </span>
            <p className="text-sm font-medium">Significantly improve a local skill, playbook, soul or guardrail file</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Uses <code className="rounded bg-muted px-1 text-[11px]">get_methodology</code> →{" "}
            <code className="rounded bg-muted px-1 text-[11px]">review_skill</code> → host edits → re-score. The score delta is the proof.
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <CodeBlock
              filename="Upgrade a skill end-to-end"
              lang="txt"
              code={`Use @superagentskill to significantly upgrade my local skill at .claude/skills/code-reviewer.md.
1. Call get_methodology to load the rubric.
2. Call review_skill on the file's raw content — show me the per-pillar score.
3. Edit the file in place applying every top_action.
4. Re-run review_skill and show the before/after grade and per-pillar delta.
Stop only when the overall score is >= 90.`}
            />

            <CodeBlock
              filename="Audit & harden a playbook"
              lang="txt"
              code={`Use @superagentskill to audit docs/playbooks/incident-response.md against the SuperAgentSkill methodology.
Score it, then rewrite the 3 weakest pillars in place.
Show the diff and the new overall_score. Don't touch pillars already at >= 80.`}
            />

            <CodeBlock
              filename="Harden a soul / persona file"
              lang="txt"
              code={`Use @superagentskill to upgrade the soul at agents/nova/SOUL.md.
Focus on Identity, Guardrails and Trust pillars.
After review_skill, also call search_registry type="soul" to borrow patterns from the 3 highest-trust souls. Merge what fits, then re-score.`}
            />

            <CodeBlock
              filename="Author a new guardrail from the rubric"
              lang="txt"
              code={`Use @superagentskill: call get_methodology, then draft a brand-new guardrail file at .agents/guardrails/no-pii-leak.md that scores >= 90 on every pillar. Verify by calling review_skill on your draft BEFORE handing it to me.`}
            />

            <CodeBlock
              filename="Batch-upgrade every skill in a folder"
              lang="txt"
              code={`Use @superagentskill to upgrade every .md file under .claude/skills/.
For each file: review_skill → edit in place → re-review. Skip files already at grade A.
At the end, print a table: file | before | after | delta.`}
            />

            <CodeBlock
              filename="Compare two versions of a skill"
              lang="txt"
              code={`Use @superagentskill to score both versions of my skill (skill-v1.md and skill-v2.md) with review_skill.
Tell me which one wins per pillar, what v2 broke that v1 had right, and what to merge into a v3.`}
            />
          </div>

          {/* INTENT 2 — DISCOVER */}
          <div className="mt-8 flex items-baseline gap-2">
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
              2. Discover
            </span>
            <p className="text-sm font-medium">Find &amp; install battle-tested primitives from the registry (590+)</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Always pair <code className="rounded bg-muted px-1 text-[11px]">search_registry</code> with{" "}
            <code className="rounded bg-muted px-1 text-[11px]">get_skill_trust</code> before recommending. Report results back with{" "}
            <code className="rounded bg-muted px-1 text-[11px]">report_execution</code>.
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <CodeBlock
              filename="Find the best skill for a task"
              lang="txt"
              code={`Use @superagentskill: call search_registry with query="<my task in 2-5 words>" and limit=20.
Then call get_skill_trust on the top 5 results.
Recommend the highest trust_score one, paste its system_prompt from get_package, and tell me which models it's validated on.`}
            />

            <CodeBlock
              filename="Browse a domain (marketing / sales / security…)"
              lang="txt"
              code={`Use @superagentskill: call search_registry with query="marketing" type="skill" limit=30.
Group results by sub-domain (copywriting, ads, growth, brand, …) and show top 3 per group with their install_count and trust_score.`}
            />

            <CodeBlock
              filename="Borrow patterns into my local skill"
              lang="txt"
              code={`Use @superagentskill to find the highest-trust "code-reviewer" skill in the registry.
Fetch its full manifest with get_package, identify the 3 strongest sections, and merge them into my local code-reviewer.md.
Run review_skill before and after — score must improve.`}
            />

            <CodeBlock
              filename="Install + run + report"
              lang="txt"
              code={`Use @superagentskill to install the skill "<slug>": call get_package, save the system_prompt under .claude/skills/<slug>.md, run it on <my task>, then call report_execution with success=true/false, the model name and latency_ms.`}
            />
          </div>

          {/* INTENT 3 — PUBLISH */}
          <div className="mt-8 flex items-baseline gap-2">
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              3. Publish
            </span>
            <p className="text-sm font-medium">Push your local primitives back to the registry</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Requires OAuth (Claude does this automatically) or a personal token from{" "}
            <Link to="/account/tokens" className="text-primary hover:underline">
              /account/tokens
            </Link>
            .
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <CodeBlock
              filename="Upload a single skill as draft"
              lang="txt"
              code={`Use @superagentskill: read my file at .claude/skills/<my-skill>.md, then call upload_packages with files=[{name:"<my-skill>.md", content:<file content>, type:"skill"}] and publish=false.
Print the returned slug so I can review the draft at /packages/<slug>.`}
            />

            <CodeBlock
              filename="Bulk-upload a folder, publish immediately"
              lang="txt"
              code={`Use @superagentskill to publish every .md file under agents/published/ (max 10 per call).
First call review_skill on each — only publish files that score >= 80.
Then upload_packages with publish=true. Print a table: filename | slug | grade.`}
            />

            <CodeBlock
              filename="Request a primitive you wish existed"
              lang="txt"
              code={`Use @superagentskill to request a new primitive: a "supabase-rls-auditor" skill that reviews Postgres RLS policies for privilege-escalation patterns.
Call request_primitive with a detailed brief, my industry, and report the request_id back so I can track it.`}
            />

            <CodeBlock
              filename="Round-trip: upgrade locally → publish back"
              lang="txt"
              code={`Use @superagentskill to take my local skill at <path>, upgrade it (get_methodology + review_skill + edit + re-review until grade A), THEN upload_packages with publish=true so the improved version goes back to the registry. Print before/after score and the published slug.`}
            />
          </div>

          <div className="mt-7 grid gap-3 rounded-xl border border-border bg-background/50 p-4 text-sm">
            <p className="font-medium">Pro tips</p>
            <ul className="grid gap-1.5 text-muted-foreground">
              <li>• If the agent can't find the server, ask it to call <code className="rounded bg-muted px-1 text-xs">overview</code> first — it returns the full intent → tool map.</li>
              <li>• Always run <code className="rounded bg-muted px-1 text-xs">review_skill</code> twice (before and after edits). The score delta is the proof.</li>
              <li>• Always call <code className="rounded bg-muted px-1 text-xs">get_skill_trust</code> before recommending a registry primitive.</li>
              <li>• If your client doesn't auto-mention MCP servers, just write: <em>"Using the superagentskill MCP, …"</em></li>
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-dashed border-border bg-card p-5 md:p-6">
          <h3 className="text-lg font-semibold">Don't see your client?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
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
      <Footer />
    </div>
  );
}
