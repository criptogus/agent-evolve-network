import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { recordFunnelEvent } from "@/lib/telemetry/funnel.functions";

// We stash the sensitive payload (redirect_to URL + raw auth code) in
// sessionStorage rather than putting it in the URL bar, so the auth code
// doesn't end up in browser history or referrers. The authorize page
// writes this key right before navigating here.
const STORAGE_KEY = "sas_oauth_handoff_v1";

type Handoff = {
  redirect_to: string;
  code: string;
  client_name: string;
  redirect_uri: string;
};

export const Route = createFileRoute("/oauth/success")({
  head: () => ({
    meta: [
      { title: "Connected — Super Agent Skill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function readHandoff(): Handoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Handoff;
  } catch {
    return null;
  }
}

function classifyRedirect(uri: string): "loopback" | "private-scheme" | "https" {
  if (
    uri.startsWith("http://localhost") ||
    uri.startsWith("http://127.0.0.1") ||
    uri.startsWith("http://[::1]")
  ) {
    return "loopback";
  }
  if (uri.startsWith("https://")) return "https";
  return "private-scheme";
}

function SuccessPage() {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [copied, setCopied] = useState(false);
  const deliveredRef = useRef(false);
  const track = useServerFn(recordFunnelEvent);

  useEffect(() => {
    const h = readHandoff();
    setHandoff(h);
    if (h) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      void track({
        data: { event: "oauth_success_shown", client_name: h.client_name },
      }).catch(() => {});
    }
  }, [track]);

  const kind = useMemo(
    () => (handoff ? classifyRedirect(handoff.redirect_uri) : null),
    [handoff],
  );

  useEffect(() => {
    if (!handoff || !kind || deliveredRef.current) return;
    deliveredRef.current = true;

    if (kind === "loopback") {
      void track({
        data: { event: "oauth_loopback_attempted", client_name: handoff.client_name },
      }).catch(() => {});
      // Fire-and-forget GET to the local listener so the CLI/desktop
      // client picks up the code. We do not navigate the tab — that's
      // exactly what produced the broken "site can't be reached" page
      // when the listener had already closed. With no-cors we don't get
      // to read the response, but the listener typically only needs to
      // see the request hit /callback?code=… to complete the flow.
      fetch(handoff.redirect_to, { mode: "no-cors", cache: "no-store" }).catch(
        () => {
          /* swallow; the manual-paste fallback below covers this */
        },
      );
      return;
    }
    if (kind === "private-scheme") {
      void track({
        data: { event: "oauth_scheme_triggered", client_name: handoff.client_name },
      }).catch(() => {});
      // Trigger the OS deep link. If the app is registered, the user
      // pops back into Claude/Cursor/etc. If not, the browser stays on
      // this page (which is fine — we show the manual fallback).
      try {
        window.location.href = handoff.redirect_to;
      } catch {
        /* ignored — manual fallback covers it */
      }
      return;
    }
    // https: a normal remote callback — let the browser handle it.
    window.location.replace(handoff.redirect_to);
  }, [handoff, kind]);

  async function copyCode() {
    if (!handoff) return;
    try {
      await navigator.clipboard.writeText(handoff.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      void track({
        data: { event: "oauth_manual_code_copied", client_name: handoff.client_name },
      }).catch(() => {});
    } catch {
      /* clipboard may be denied; the code is still visible */
    }
  }

  if (!handoff) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
          <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-elevated">
            <h1 className="text-2xl font-semibold tracking-tight">No pending connection</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This page completes an MCP client authorization. Start the flow from your client
              (Claude, Cursor, Codex, Lovable, OpenClaw, Hermes, …) or run{" "}
              <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs">
                npx -y super-agent connect
              </code>
              .
            </p>
            <Link
              to="/docs/mcp"
              className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Read the MCP docs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isHttps = kind === "https";

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto flex min-h-[80vh] max-w-xl items-center px-6 py-16">
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-elevated">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"
            >
              ✓
            </span>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Authorization complete
            </p>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Connected to{" "}
            <span className="text-primary">{handoff.client_name}</span>
          </h1>

          {isHttps ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Returning you to <span className="font-mono text-xs">{handoff.client_name}</span>…
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                You can close this tab and return to{" "}
                <span className="font-medium text-foreground">{handoff.client_name}</span>.
                The connection is already live.
              </p>

              <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-elevated p-4 text-sm">
                <div className="font-medium text-foreground">
                  Didn't see your client connect?
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kind === "loopback"
                    ? "The local listener may have closed before we delivered the code. Paste the code below into your CLI or client when prompted."
                    : `If ${handoff.client_name} didn't open automatically, paste this code into the client when prompted.`}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 break-all rounded border border-border bg-background px-2 py-1.5 font-mono text-xs">
                    {handoff.code}
                  </code>
                  <button
                    onClick={copyCode}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                {kind === "loopback" && (
                  <a
                    href={handoff.redirect_to}
                    className="mt-3 inline-block text-xs text-primary underline-offset-4 hover:underline"
                  >
                    Or retry sending to your local client →
                  </a>
                )}
                {kind === "private-scheme" && (
                  <a
                    href={handoff.redirect_to}
                    className="mt-3 inline-block text-xs text-primary underline-offset-4 hover:underline"
                  >
                    Open in {handoff.client_name} →
                  </a>
                )}
              </div>
            </>
          )}

          <div className="mt-8 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Manage this connection at{" "}
              <Link to="/account/connections" className="text-primary hover:underline">
                Account → Connections
              </Link>
              .
            </span>
            <Link to="/docs/mcp" className="text-primary hover:underline">
              MCP docs ↗
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
