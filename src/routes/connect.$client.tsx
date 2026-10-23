import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Copy, Terminal } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { CodeBlock } from "@/components/site/CodeBlock";
import { InstallButtons } from "@/components/site/InstallButtons";

const ENDPOINT = "https://superagentskill.com/api/public/mcp";

// A focused, single-client landing — shareable URLs like /connect/cursor
// that a sales/onboarding flow can deep-link to. Mirrors the master
// /connect page but strips it down to one card so first-timers don't
// scroll through twelve configs to find theirs.

type Profile = {
  id: string;
  name: string;
  tagline: string;
  // Install paths, in order of recommendation.
  install: Array<
    | { kind: "deeplink" }
    | { kind: "cli"; command: string; notes?: string }
    | { kind: "config"; filename: string; lang: string; code: string; notes?: string }
    | { kind: "manual"; lines: string[] }
  >;
  test_prompt: string;
};

const ENDPOINT_HEADER_AUTH =
  "Headers:  Authorization: Bearer <token from /account/tokens>  (only needed for write tools)";

const PROFILES: Record<string, Profile> = {
  claude: {
    id: "claude",
    name: "Claude Desktop",
    tagline: "Native MCP. Drop the URL in, restart, done.",
    install: [
      {
        kind: "config",
        filename: "~/Library/Application Support/Claude/claude_desktop_config.json",
        lang: "json",
        code: `{
  "mcpServers": {
    "super-agent-skill": { "url": "${ENDPOINT}" }
  }
}`,
        notes: "Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
      },
      { kind: "cli", command: "npx -y super-agent connect --client claude" },
    ],
    test_prompt:
      "Call the super-agent-skill MCP tool `overview` and show me the intent → tool map.",
  },
  "claude-code": {
    id: "claude-code",
    name: "Claude Code",
    tagline: "One command. Reuses your Claude account auth.",
    install: [
      {
        kind: "cli",
        command: `claude mcp add --transport http super-agent-skill ${ENDPOINT}`,
        notes: "Verify with `claude mcp list`.",
      },
    ],
    test_prompt:
      "Call the super-agent-skill MCP tool `search_registry` with query \"code review\".",
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    tagline: "One-click via deep link, or project-level JSON.",
    install: [
      { kind: "deeplink" },
      {
        kind: "config",
        filename: ".cursor/mcp.json",
        lang: "json",
        code: `{
  "mcpServers": {
    "super-agent-skill": { "url": "${ENDPOINT}" }
  }
}`,
        notes: "Global path: ~/.cursor/mcp.json — same shape.",
      },
    ],
    test_prompt:
      "In the Cursor MCP panel, run `list_packages` with no args and show me the first 5 results.",
  },
  vscode: {
    id: "vscode",
    name: "VS Code",
    tagline: "Copilot Chat, Cline, Continue — same MCP shape.",
    install: [
      { kind: "deeplink" },
      {
        kind: "config",
        filename: "settings.json",
        lang: "json",
        code: `{
  "mcp": {
    "servers": {
      "super-agent-skill": { "type": "http", "url": "${ENDPOINT}" }
    }
  }
}`,
        notes: "Cline: cline.mcpServers. Continue: ~/.continue/config.json under mcpServers.",
      },
    ],
    test_prompt:
      "Use the super-agent-skill MCP server to list available tools and tell me which need auth.",
  },
  codex: {
    id: "codex",
    name: "OpenAI Codex CLI",
    tagline: "TOML-based config. One block, restart.",
    install: [
      {
        kind: "config",
        filename: "~/.codex/config.toml",
        lang: "toml",
        code: `[mcp_servers.super-agent-skill]
url = "${ENDPOINT}"
transport = "http"`,
      },
      { kind: "cli", command: "npx -y super-agent connect --client codex" },
    ],
    test_prompt:
      "Use the super-agent-skill MCP server to call `list_packages` with type=\"skill\" and limit=5.",
  },
  lovable: {
    id: "lovable",
    name: "Lovable",
    tagline: "Add as a Connector in your workspace.",
    install: [
      {
        kind: "manual",
        lines: [
          "Open your Lovable workspace → Connectors → Add MCP Server.",
          `Paste the URL: ${ENDPOINT}`,
          "Save. Tools appear on the next agent message.",
        ],
      },
    ],
    test_prompt:
      "Use the Super Agent Skill MCP to find the best `design review` skill in the registry and show me its system_prompt.",
  },
  hermes: {
    id: "hermes",
    name: "Hermes",
    tagline: "OAuth is flaky on Hermes builds — paste a token.",
    install: [
      {
        kind: "manual",
        lines: [
          "Open /account/tokens and generate a personal access token.",
          `Add the MCP server with URL ${ENDPOINT} and header Authorization: Bearer <token>.`,
          "Save and reload the Hermes session.",
        ],
      },
    ],
    test_prompt:
      "Call the super-agent-skill MCP `overview` tool to confirm authenticated tools are listed.",
  },
  openclaw: {
    id: "openclaw",
    name: "OpenClaw",
    tagline: "Generic MCP runtime — point + paste.",
    install: [
      {
        kind: "manual",
        lines: [
          `Add MCP server URL: ${ENDPOINT}`,
          "Transport: Streamable HTTP",
          ENDPOINT_HEADER_AUTH,
        ],
      },
    ],
    test_prompt:
      "Use the Super Agent Skill MCP server to call `search_registry` with query \"security\".",
  },
};

const ALIASES: Record<string, string> = {
  "claude-desktop": "claude",
  claudecode: "claude-code",
  "vs-code": "vscode",
  "codex-cli": "codex",
};

export const Route = createFileRoute("/connect/$client")({
  loader: ({ params }) => {
    const id = (ALIASES[params.client] ?? params.client).toLowerCase();
    const profile = PROFILES[id];
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Connect ${loaderData?.name ?? "MCP client"} — Super Agent Skill` },
      {
        name: "description",
        content: loaderData
          ? `Plug Super Agent Skill into ${loaderData.name} in under 30 seconds. ${loaderData.tagline}`
          : "Connect any MCP client to Super Agent Skill.",
      },
    ],
  }),
  component: ConnectClientPage,
});

function CopyButton({ value }: { value: string }) {
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
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ConnectClientPage() {
  const profile = Route.useLoaderData();

  return (
    <SitePage>
      <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Link
          to="/connect"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All clients
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Connect {profile.name}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{profile.tagline}</p>

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <code className="flex-1 break-all font-mono text-sm">{ENDPOINT}</code>
          <CopyButton value={ENDPOINT} />
        </div>

        <ol className="mt-10 space-y-6">
          {profile.install.map((step, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-foreground">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {step.kind === "deeplink"
                    ? "One-click install"
                    : step.kind === "cli"
                      ? "CLI"
                      : step.kind === "config"
                        ? "Config file"
                        : "Manual setup"}
                </span>
              </div>
              <div className="mt-4">
                {step.kind === "deeplink" && <InstallButtons />}
                {step.kind === "cli" && (
                  <>
                    <CodeBlock filename="terminal" lang="bash" code={step.command} />
                    {step.notes && (
                      <p className="mt-2 text-xs text-muted-foreground">{step.notes}</p>
                    )}
                  </>
                )}
                {step.kind === "config" && (
                  <>
                    <CodeBlock filename={step.filename} lang={step.lang} code={step.code} />
                    {step.notes && (
                      <p className="mt-2 text-xs text-muted-foreground">{step.notes}</p>
                    )}
                  </>
                )}
                {step.kind === "manual" && (
                  <ul className="space-y-2 text-sm text-foreground/90">
                    {step.lines.map((l, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
            Verify it works
          </p>
          <p className="mt-2 text-sm">
            Paste this in your {profile.name} chat:
          </p>
          <div className="mt-3">
            <CodeBlock filename={`${profile.name} chat`} lang="txt" code={profile.test_prompt} />
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Need write tools?
            </p>
          </div>
          <p className="mt-2 text-sm text-foreground/90">
            Generate a Personal Access Token at{" "}
            <Link to="/account/tokens" className="text-primary hover:underline">
              /account/tokens
            </Link>{" "}
            and add it as a Bearer header — or run{" "}
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
              npx -y super-agent login
            </code>{" "}
            to do OAuth in your browser.
          </p>
        </section>

        <div className="mt-12 flex items-center justify-between text-sm">
          <Link to="/connect" className="text-muted-foreground hover:text-foreground">
            ← Back to all clients
          </Link>
          <Link to="/docs/mcp" className="text-primary hover:underline">
            MCP reference ↗
          </Link>
        </div>
      </main>
    </SitePage>
  );
}
