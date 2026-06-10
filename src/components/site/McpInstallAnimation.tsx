import { useEffect, useState } from "react";
import { SITE_STATS } from "@/lib/site-stats";

const MCP_URL = "https://superagentskill.com/api/mcp";

const CLIENTS = [
  { name: "Claude", glyph: "✦" },
  { name: "Cursor", glyph: "▸" },
  { name: "Codex", glyph: "◆" },
  { name: "Lovable", glyph: "♥" },
  { name: "Windsurf", glyph: "≋" },
];

const TOOLS = [
  "list_packages",
  "search_registry",
  "get_package",
  "get_skill_trust",
  "request_primitive",
];

/**
 * 3-step looping animation showing how easy it is to install
 * the Super Agent Skill MCP:
 *  1. Copy the MCP URL
 *  2. Paste in any client
 *  3. Tools light up — agent evolved
 */
export function McpInstallAnimation() {
  const [step, setStep] = useState(0); // 0,1,2
  const [typed, setTyped] = useState(0); // chars typed for step 1
  const [copied, setCopied] = useState(false);
  const [activeClient, setActiveClient] = useState(0);
  const [toolsLit, setToolsLit] = useState(0);

  // Step machine — runs forever, restarts cleanly
  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      while (!cancelled) {
        // Reset
        setStep(0);
        setTyped(0);
        setCopied(false);
        setToolsLit(0);
        setActiveClient((c) => (c + 1) % CLIENTS.length);

        // Step 1 — type the URL
        await sleep(600);
        if (cancelled) return;
        for (let i = 1; i <= MCP_URL.length; i++) {
          if (cancelled) return;
          setTyped(i);
          await sleep(22);
        }
        await sleep(450);
        if (cancelled) return;
        setCopied(true);
        await sleep(900);
        if (cancelled) return;

        // Step 2 — paste into client
        setStep(1);
        await sleep(1800);
        if (cancelled) return;

        // Step 3 — tools come online
        setStep(2);
        for (let i = 1; i <= TOOLS.length; i++) {
          if (cancelled) return;
          setToolsLit(i);
          await sleep(220);
        }
        await sleep(2400);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const client = CLIENTS[activeClient];

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-[oklch(0.14_0.01_270)] text-[12px] shadow-elevated sm:text-[13px]">
      {/* Title bar */}
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.55_0.21_28)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.16_85)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-signal" />
          <span className="ml-2 font-mono text-xs text-white/50 sm:ml-3">install.mcp</span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-white/40">30 seconds</span>
      </div>

      <div className="min-h-[330px] p-4 font-mono leading-relaxed text-white/90 sm:p-5">
        {/* Step indicator */}
        <div className="mb-5 flex min-w-0 items-center gap-2 text-[11px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={
                  "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-all duration-500 " +
                  (step >= i
                    ? "border-signal bg-signal/15 text-signal"
                    : "border-white/15 text-white/40")
                }
              >
                {step > i ? "✓" : i + 1}
              </span>
              {i < 2 && (
                <span
                  className={
                    "h-px w-8 transition-colors duration-500 sm:w-10 " +
                    (step > i ? "bg-signal/60" : "bg-white/10")
                  }
                />
              )}
            </div>
          ))}
          <span className="ml-1 min-w-0 flex-1 text-pretty text-white/40 sm:ml-3">
            {step === 0 && "Paste URL into client"}
            {step === 1 && `Authorize ${client.name} (OAuth)`}
            {step === 2 && "Tools are live"}
          </span>
        </div>

        {/* Step 1 — copy URL */}
        <div
          className={
            "transition-all duration-500 " +
            (step === 0 ? "opacity-100" : "pointer-events-none absolute opacity-0")
          }
          style={step === 0 ? {} : { display: "none" }}
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
            Your MCP endpoint
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2.5">
            <span className="text-primary">→</span>
            <span className="min-w-0 flex-1 truncate text-white">
              {MCP_URL.slice(0, typed)}
              {typed < MCP_URL.length && <span className="caret" aria-hidden />}
            </span>
            <button
              type="button"
              className={
                "shrink-0 rounded border px-2 py-0.5 text-[10px] transition-all " +
                (copied
                  ? "border-signal/40 bg-signal/15 text-signal"
                  : "border-white/15 bg-white/5 text-white/70")
              }
            >
              {copied ? "✓ copied" : "copy"}
            </button>
          </div>
          <div className="mt-4 text-pretty text-white/50">
            That's it. One URL — no SDK, no keys, no DevOps.
          </div>
        </div>

        {/* Step 2 — OAuth popup */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              {client.name} → Browser opens automatically
            </div>
            <div className="mt-2 overflow-hidden rounded-md border border-white/10 bg-black/40">
              <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-[oklch(0.55_0.21_28)]" />
                <span className="h-2 w-2 rounded-full bg-[oklch(0.78_0.16_85)]" />
                <span className="h-2 w-2 rounded-full bg-signal" />
                <span className="ml-2 truncate font-mono text-[10px] text-white/40">
                  superagentskill.com/oauth/authorize
                </span>
              </div>
              <div className="p-4">
                <div className="text-[11px] text-white/50">Authorize MCP client</div>
                <div className="mt-1 text-white">
                  Connect <span className="text-primary">{client.name}</span> to your skills?
                </div>
                <div className="mt-2 text-[11px] text-white/50">
                  Scopes: <span className="font-mono text-white/70">mcp:read mcp:write</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded border border-white/15 px-2 py-1 text-[10px] text-white/60">
                    Deny
                  </span>
                  <span className="rounded bg-primary px-3 py-1 text-[10px] font-medium text-primary-foreground shadow-elevated">
                    Authorize ✓
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-pretty text-white/50">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Issuing access token via OAuth 2.1 + PKCE…
            </div>
          </div>
        )}

        {/* Step 3 — tools live */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-signal">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
              Connected · {SITE_STATS.skills} skills indexed
            </div>
            <div className="mt-3 grid gap-1.5">
              {TOOLS.map((t, i) => (
                <div
                  key={t}
                  className={
                    "flex items-center gap-2 transition-all duration-300 " +
                    (i < toolsLit ? "opacity-100" : "opacity-0")
                  }
                  style={{ transform: i < toolsLit ? "translateX(0)" : "translateX(-6px)" }}
                >
                  <span className="text-signal">✓</span>
                  <span className="text-white/80">{t}</span>
                  <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">
                    tool
                  </span>
                </div>
              ))}
            </div>
            {toolsLit >= TOOLS.length && (
              <div className="mt-4 rounded-md border border-signal/30 bg-signal/10 px-3 py-2 text-signal">
                ● Agent evolved. Health score: 98.3 / 100
              </div>
            )}
          </div>
        )}

        {/* Client chips */}
        <div className="mt-6 flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">Works with</span>
          {CLIENTS.map((c, i) => (
            <span
              key={c.name}
              className={
                "rounded-full border px-2 py-0.5 text-[10px] transition-all " +
                (i === activeClient
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/5 text-white/50")
              }
            >
              {c.glyph} {c.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
