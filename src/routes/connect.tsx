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

        {/* Quick jump */}
        <nav className="mb-10 flex flex-wrap gap-2">
          <a
            href="#test-mcp"
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 transition hover:border-emerald-500/60 dark:text-emerald-400"
          >
            ▶ Test MCP
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

        <section className="mt-12 rounded-2xl border border-dashed border-border bg-card p-5 md:p-6">
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
