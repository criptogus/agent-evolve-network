import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, KeyRound, Plug, Terminal, Zap } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { CodeBlock } from "@/components/site/CodeBlock";
import { useAuth } from "@/hooks/use-auth";
import { createMcpToken } from "@/lib/account/tokens.functions";
import { recordFunnelEvent } from "@/lib/telemetry/funnel.functions";

export const Route = createFileRoute("/connect/quick")({
  head: () => ({
    meta: [
      { title: "Quick connect — token + config in 10 seconds" },
      {
        name: "description",
        content:
          "One click: sign in (free plan), get a personal access token and ready-to-paste MCP configs with auth already injected. No JSON hunting, no OAuth dance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuickConnectPage,
});

const ENDPOINT = "https://superagentskill.com/api/public/mcp";

function QuickConnectPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createMcpToken);
  const track = useServerFn(recordFunnelEvent);
  const [token, setToken] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const minted = useRef(false);

  // Not signed in → send through signup/login and come straight back here.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/signup", search: { next: "/connect/quick" } });
    }
  }, [authLoading, user, navigate]);

  // Signed in → mint exactly once per mount.
  useEffect(() => {
    if (authLoading || !user || minted.current) return;
    minted.current = true;
    void track({ data: { event: "connect_viewed", props: { surface: "quick-connect" } } }).catch(
      () => {},
    );
    create({ data: { name: "quick-connect" } })
      .then((r) => {
        setToken(r.token);
        void track({
          data: {
            event: "cta_clicked",
            props: { surface: "quick-connect", result: "token_minted" },
          },
        }).catch(() => {});
      })
      .catch((e) => setMintError(e?.message ?? "Could not mint token"));
  }, [authLoading, user, create, track]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const authdJson = (indent = "    ") => `{
  "mcpServers": {
    "super-agent-skill": {
      "url": "${ENDPOINT}",
      "headers": { "Authorization": "Bearer ${token ?? "<token>"}" }
    }
  }
}`;

  const snippets = token
    ? [
        {
          name: "Claude Desktop / Cursor / Windsurf (JSON)",
          filename: "mcp config",
          lang: "json",
          code: authdJson(),
        },
        {
          name: "Codex CLI (~/.codex/config.toml)",
          filename: "config.toml",
          lang: "toml",
          code: `[mcp_servers.super-agent-skill]
url = "${ENDPOINT}"
http_headers = { "Authorization" = "Bearer ${token}" }`,
        },
        {
          name: "Any MCP client (generic)",
          filename: "request",
          lang: "bash",
          code: `curl -X POST ${ENDPOINT} \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -H 'Authorization: Bearer ${token}' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
        },
      ]
    : [];

  return (
    <SitePage>
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Quick connect · free plan
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Token + config in 10 seconds.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Sign in once and we mint a personal access token for you — read <em>and</em> write tools
          included on the free plan. Paste the config into your agent and you're connected.
        </p>

        {authLoading || (!user && !mintError) ? (
          <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            {authLoading ? "Checking your session…" : "Redirecting to sign up…"}
          </div>
        ) : mintError ? (
          <div className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
            <p className="font-medium text-destructive">{mintError}</p>
            <p className="mt-2 text-muted-foreground">
              You can still mint manually at{" "}
              <Link to="/account/tokens" className="text-primary hover:underline">
                /account/tokens
              </Link>
              .
            </p>
          </div>
        ) : !token ? (
          <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Minting your token…
          </div>
        ) : (
          <>
            {/* token card */}
            <section className="mt-8 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-surface to-surface p-6">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                <KeyRound className="h-3.5 w-3.5" /> Your token — shown once
              </div>
              <div className="mt-3 flex items-center gap-3">
                <code className="flex-1 overflow-x-auto rounded-lg bg-background/80 px-3 py-2.5 font-mono text-[13px] text-foreground">
                  {token}
                </code>
                <button
                  onClick={() => copy(token, "token")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40"
                >
                  {copied === "token" ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied === "token" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Store it somewhere safe — it's hashed on our side and can't be shown again. Revoke
                or mint more at{" "}
                <Link to="/account/tokens" className="text-primary hover:underline">
                  /account/tokens
                </Link>
                .
              </p>
            </section>

            {/* configs */}
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Paste into your agent</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Auth is already injected — no header editing needed.
              </p>
              <div className="mt-5 space-y-5">
                {snippets.map((s) => (
                  <div key={s.name}>
                    <p className="mb-2 text-xs font-medium text-foreground">{s.name}</p>
                    <CodeBlock filename={s.filename} lang={s.lang} code={s.code} />
                  </div>
                ))}
              </div>
            </section>

            {/* next steps */}
            <section className="mt-8 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <Zap className="h-3.5 w-3.5" /> You're done when
              </div>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                {[
                  "Your agent calls the overview tool — you should see the intent → tool map.",
                  "Write tools (upload_packages, request_primitive) work immediately with this token.",
                  "Restart your MCP client after pasting the config.",
                ].map((t, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] text-primary">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/connect"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Plug className="h-4 w-4" /> All client configs
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/docs/mcp"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
                >
                  MCP docs
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </SitePage>
  );
}
