import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CodeBlock } from "@/components/site/CodeBlock";
import { Logo } from "@/components/site/Logo";
import { PACKAGES_LABEL } from "@/lib/site-stats";

const ENDPOINT = "https://superagentskill.com/api/mcp";

const searchSchema = z.object({
  session_id: z.string().optional(),
  plan: z.string().optional(),
});

export const Route = createFileRoute("/welcome")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Welcome — Connect your agent in 60 seconds | Super Agent Skill" },
      {
        name: "description",
        content:
          "You're in. Pick your AI tool — ChatGPT, Claude, Cursor, Codex, Grok, VS Code or Windsurf — and connect it to Super Agent Skill in under a minute.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WelcomePage,
});

type Client = {
  id: string;
  name: string;
  badge: string;
  blurb: string;
  steps: string[];
  filename: string;
  lang: string;
  code: string;
  notes?: string;
};

const CLIENTS: Client[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    badge: "Custom GPT · Pro/Team/Enterprise",
    blurb:
      "Add Super Agent Skill as a custom connector inside ChatGPT. Available on Pro, Team, Enterprise and Edu plans.",
    steps: [
      "Open ChatGPT → Settings → Connectors → Add custom connector.",
      `Paste the MCP URL: ${ENDPOINT}`,
      "Choose 'No authentication' (read-only) — you can switch to bearer token later for write tools.",
      "Save. The connector is now selectable in any new chat (paperclip icon → Super Agent Skill).",
    ],
    filename: "Settings → Connectors → Add custom",
    lang: "txt",
    code: `Name: Super Agent Skill
URL:  ${ENDPOINT}
Auth: None (read-only)`,
    notes: "On Free / Plus, use the prompt method on the next step instead — it works in any chat.",
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    badge: "Native MCP",
    blurb:
      "Edit one config file, restart Claude, done. The server appears under the tools icon at the bottom of the chat.",
    steps: [
      "Open the config file at the path below (create it if missing).",
      "Paste the JSON snippet.",
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
    notes: "Windows: %APPDATA%\\Claude\\claude_desktop_config.json — Linux: ~/.config/Claude/claude_desktop_config.json",
  },
  {
    id: "claude-code",
    name: "Claude Code (CLI)",
    badge: "One command",
    blurb: "Anthropic's official CLI. One command and the tools are wired into every session.",
    steps: ["Run the command in your terminal.", "Open any project — tools are auto-loaded."],
    filename: "terminal",
    lang: "bash",
    code: `claude mcp add super-agent-skill ${ENDPOINT}`,
  },
  {
    id: "cursor",
    name: "Cursor",
    badge: "IDE · MCP 1.0+",
    blurb: "Cursor reads MCP servers from a JSON file in your home or project directory.",
    steps: [
      "Open ~/.cursor/mcp.json (or .cursor/mcp.json in your project).",
      "Add the snippet below.",
      "Restart Cursor.",
    ],
    filename: "~/.cursor/mcp.json",
    lang: "json",
    code: `{
  "mcpServers": {
    "super-agent-skill": {
      "url": "${ENDPOINT}"
    }
  }
}`,
  },
  {
    id: "vscode",
    name: "VS Code (GitHub Copilot)",
    badge: "Agent mode",
    blurb: "Copilot Chat in VS Code 1.95+ supports MCP servers in agent mode.",
    steps: [
      "Open .vscode/mcp.json in your workspace (or the user-level mcp.json).",
      "Paste the snippet.",
      "Reload window. Toggle Copilot Chat into Agent mode — tools appear in the picker.",
    ],
    filename: ".vscode/mcp.json",
    lang: "json",
    code: `{
  "servers": {
    "super-agent-skill": {
      "type": "http",
      "url": "${ENDPOINT}"
    }
  }
}`,
  },
  {
    id: "codex",
    name: "Codex CLI",
    badge: "OpenAI",
    blurb: "OpenAI's open-source coding agent. Uses TOML config under your home directory.",
    steps: [
      "Open ~/.codex/config.toml (create if missing).",
      "Append the block below.",
      "Restart `codex`.",
    ],
    filename: "~/.codex/config.toml",
    lang: "toml",
    code: `[mcp_servers.super-agent-skill]
url = "${ENDPOINT}"`,
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    badge: "Custom tool",
    blurb:
      "Grok web/desktop accepts MCP-compatible tool URLs through the Tools panel.",
    steps: [
      "Open Grok → Settings → Tools → Add tool.",
      `Paste the URL: ${ENDPOINT}`,
      "Pick 'MCP / HTTP' as the transport. Save.",
    ],
    filename: "Settings → Tools",
    lang: "txt",
    code: `Name: Super Agent Skill
URL:  ${ENDPOINT}
Type: MCP (HTTP)`,
    notes: "If you don't see Tools yet, use the prompt method below — it works in any Grok chat.",
  },
  {
    id: "windsurf",
    name: "Windsurf (Codeium)",
    badge: "Cascade",
    blurb: "Cascade reads MCP servers from a JSON config under ~/.codeium/windsurf/.",
    steps: [
      "Open ~/.codeium/windsurf/mcp_config.json.",
      "Paste the snippet.",
      "Reload Windsurf.",
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
    id: "continue",
    name: "Continue.dev",
    badge: "Open source",
    blurb: "The open-source AI code assistant. Add MCP servers under experimental in config.json.",
    steps: ["Open ~/.continue/config.json.", "Add the snippet under experimental → modelContextProtocolServers."],
    filename: "~/.continue/config.json",
    lang: "json",
    code: `{
  "experimental": {
    "modelContextProtocolServers": [
      { "transport": { "type": "http", "url": "${ENDPOINT}" } }
    ]
  }
}`,
  },
  {
    id: "custom",
    name: "Anything else (curl)",
    badge: "Universal",
    blurb:
      "Any MCP-compatible runtime works. Test the endpoint directly to verify your network can reach it.",
    steps: ["Run the curl below.", "You should see a JSON response listing the available tools."],
    filename: "terminal",
    lang: "bash",
    code: `curl -X POST ${ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
  },
];

const MAGIC_PROMPT = `I just connected the "Super Agent Skill" MCP server (https://superagentskill.com/api/mcp). 

Please do the following:
1. Call the discover tool to list the most relevant skills, playbooks, souls and guardrails for what I'm working on.
2. Recommend 3 skills to install first based on my role (ask me what I do if you don't know yet).
3. Install them via the install tool and confirm what changed in your behavior.

After that, briefly explain in plain English what new things you can now do that you couldn't before.`;

const SUGGESTED_SKILLS = [
  { slug: "code-reviewer", role: "Coding assistants", what: "Senior-level PR reviews with security & perf checks." },
  { slug: "pragmatic-sre", role: "SRE / DevOps", what: "Incident triage, runbooks, postmortems." },
  { slug: "meddpicc-sales", role: "Sales / GTM", what: "Qualify deals using the MEDDPICC framework." },
  { slug: "no-pii-guardrail", role: "Anyone touching customer data", what: "Hard rule: never echo PII back." },
  { slug: "research-deepdive", role: "Research / strategy", what: "Multi-source synthesis with citations." },
  { slug: "humanized-doctor", role: "Health / clinical", what: "Empathetic clinical tone, evidence-based." },
];

function WelcomePage() {
  const search = useSearch({ from: "/welcome" });
  const [active, setActive] = useState<string>(CLIENTS[0].id);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [verifyState, setVerifyState] = useState<"idle" | "checking" | "ok" | "fail">("idle");

  const client = useMemo(() => CLIENTS.find((c) => c.id === active)!, [active]);

  useEffect(() => {
    // jump to step 2 if returning from checkout with session_id
    if (search.session_id && step === 1) setStep(1);
  }, [search.session_id, step]);

  const checkEndpoint = async () => {
    setVerifyState("checking");
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      setVerifyState(r.ok ? "ok" : "fail");
    } catch {
      setVerifyState("fail");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-bg opacity-50" aria-hidden />
        <div className="absolute inset-0 hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center gap-3">
            <Logo className="h-7 w-7" />
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Welcome</div>
              <div className="text-xs text-muted-foreground">
                {search.plan ? `Plan: ${search.plan} ·` : ""} You're in. Let's give your agent superpowers.
              </div>
            </div>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Connect your AI in 60 seconds.
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Pick your tool below. We'll show you the exact config to paste —
            and a magic prompt that makes any AI auto-install its first skills.
          </p>

          {/* Stepper */}
          <ol className="mt-8 flex flex-wrap items-center gap-2 text-xs">
            {[
              { n: 1, label: "Pick your AI" },
              { n: 2, label: "Paste the prompt" },
              { n: 3, label: "Verify & next steps" },
            ].map((s) => (
              <li key={s.n} className="flex items-center gap-2">
                <button
                  onClick={() => setStep(s.n as 1 | 2 | 3)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
                    step === s.n
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-full font-mono text-[10px] ${
                      step >= s.n ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-muted-foreground"
                    }`}
                  >
                    {s.n}
                  </span>
                  {s.label}
                </button>
                {s.n < 3 && <span className="text-muted-foreground/40">→</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {/* Step 1 — Pick your AI + config */}
        {step === 1 && (
          <div className="grid gap-8 md:grid-cols-[260px_1fr]">
            <aside>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Your AI tool
              </div>
              <ul className="mt-3 space-y-1">
                {CLIENTS.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setActive(c.id)}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        active === c.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-surface text-foreground/80 hover:bg-accent"
                      }`}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {c.badge}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <div>
              <div className="rounded-2xl border border-border bg-surface/40 p-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{client.name}</h2>
                  <span className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {client.badge}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{client.blurb}</p>

                <ol className="mt-5 space-y-2 text-sm">
                  {client.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] text-primary">
                        {i + 1}
                      </span>
                      <span className="text-foreground/90">{s}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-6">
                  <CodeBlock code={client.code} lang={client.lang} filename={client.filename} />
                </div>

                {client.notes && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Note:</span> {client.notes}
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:opacity-95"
                >
                  Done — get the magic prompt →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Magic prompt */}
        {step === 2 && (
          <div>
            <div className="mx-auto max-w-3xl">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                The magic prompt
              </span>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                Paste this into {CLIENTS.find((c) => c.id === active)?.name ?? "your AI"}.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                It tells the AI to discover the right skills for what you do, install them
                through MCP, and explain what just changed.
              </p>

              <div className="mt-6">
                <CodeBlock code={MAGIC_PROMPT} lang="text" filename="paste this into your AI" />
              </div>

              <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  Or pick a starter pack manually
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">
                  Skills most subscribers install first
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SUGGESTED_SKILLS.map((s) => (
                    <li
                      key={s.slug}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-xs text-primary">{s.slug}</code>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {s.role}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground/90">{s.what}</p>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/marketplace"
                  className="mt-5 inline-flex h-9 items-center rounded-md border border-border bg-surface-elevated px-4 text-xs font-medium hover:bg-accent"
                >
                  Browse all {PACKAGES_LABEL} packages →
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm hover:bg-accent"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-elevated hover:opacity-95"
                >
                  Verify the connection →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Verify */}
        {step === 3 && (
          <div className="mx-auto max-w-3xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              Verify
            </span>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Make sure the endpoint is reachable.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              We'll ping the MCP gateway from your browser. If it answers, your AI can too.
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-surface/40 p-6">
              <div className="flex items-center justify-between gap-4">
                <code className="break-all font-mono text-xs text-foreground/80">{ENDPOINT}</code>
                <button
                  onClick={checkEndpoint}
                  disabled={verifyState === "checking"}
                  className="inline-flex h-10 shrink-0 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
                >
                  {verifyState === "checking" ? "Checking…" : "Run check"}
                </button>
              </div>
              <div className="mt-4 text-sm">
                {verifyState === "idle" && (
                  <span className="text-muted-foreground">Click "Run check" to test.</span>
                )}
                {verifyState === "ok" && (
                  <span className="inline-flex items-center gap-2 rounded-md border border-signal/40 bg-signal/10 px-2.5 py-1 text-signal">
                    ● Endpoint reachable. You're good to go.
                  </span>
                )}
                {verifyState === "fail" && (
                  <span className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-destructive">
                    ● Couldn't reach the endpoint. Check your network or firewall.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Link
                to="/marketplace"
                className="rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Step 4</div>
                <div className="mt-2 text-base font-semibold">Browse packages</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {PACKAGES_LABEL} skills, playbooks, souls and guardrails.
                </p>
              </Link>
              <Link
                to="/account/billing"
                className="rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Step 5</div>
                <div className="mt-2 text-base font-semibold">Manage your plan</div>
                <p className="mt-1 text-xs text-muted-foreground">Invoices, seats and renewal.</p>
              </Link>
              <Link
                to="/docs"
                className="rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Step 6</div>
                <div className="mt-2 text-base font-semibold">Read the docs</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Health Score, SkillForge, write your own skill.
                </p>
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm hover:bg-accent"
              >
                ← Back
              </button>
              <Link
                to="/marketplace"
                className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-elevated hover:opacity-95"
              >
                Install your first skill →
              </Link>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
