import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { CodeBlock } from "@/components/site/CodeBlock";
import { TypingLines } from "@/components/site/Typewriter";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Connect your agent — Super Agent Skill" },
      { name: "description", content: "Securely connect any AI agent to Super Agent Skill through MCP in under 60 seconds." },
    ],
  }),
  component: Onboarding,
});

type AgentId = "claude" | "cursor" | "codex" | "openclaw" | "hermes" | "grok" | "custom";

const AGENTS: Array<{ id: AgentId; label: string; meta: string }> = [
  { id: "claude", label: "Claude", meta: "Anthropic · MCP native" },
  { id: "cursor", label: "Cursor", meta: "IDE · MCP 1.0+" },
  { id: "codex", label: "Codex", meta: "OpenAI · MCP via gateway" },
  { id: "openclaw", label: "OpenClaw", meta: "Open source · MCP native" },
  { id: "hermes", label: "Hermes", meta: "NousResearch · MCP 1.0+" },
  { id: "grok", label: "Grok", meta: "xAI · MCP via gateway" },
  { id: "custom", label: "Custom agent", meta: "Any MCP-compatible runtime" },
];

const STEPS = ["Agent", "Config", "Authenticate", "Verify", "Done"] as const;

function Onboarding() {
  const [step, setStep] = useState(0);
  const [agent, setAgent] = useState<AgentId | null>(null);
  const [agentName, setAgentName] = useState("");

  const canNext = useMemo(() => {
    if (step === 0) return !!agent && agentName.trim().length > 0;
    return true;
  }, [step, agent, agentName]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Logo className="h-7 w-7" />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Onboarding</div>
            <h1 className="text-2xl font-semibold tracking-tight">Connect your agent</h1>
          </div>
        </div>

        <Stepper step={step} />

        <div className="mt-8 rounded-2xl border border-border bg-background shadow-elevated">
          <div className="p-7 md:p-9">
            {step === 0 && (
              <StepAgent
                agent={agent}
                setAgent={setAgent}
                agentName={agentName}
                setAgentName={setAgentName}
              />
            )}
            {step === 1 && <StepConfig agent={agent!} agentName={agentName} />}
            {step === 2 && <StepAuth onComplete={() => setStep(3)} />}
            {step === 3 && <StepVerify onComplete={() => setStep(4)} />}
            {step === 4 && <StepDone agentName={agentName} />}
          </div>

          {/* Footer nav */}
          {step < 4 && (
            <div className="flex items-center justify-between border-t border-border px-7 py-4 md:px-9">
              <button
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                ← Back
              </button>
              {step < 2 && (
                <button
                  disabled={!canNext}
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
                >
                  Continue →
                </button>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure by design · OAuth 2.1 device flow · short-lived tokens · scoped permissions
        </p>
      </div>
    </div>
  );
}

/* ---------------- Stepper ---------------- */

function Stepper({ step }: { step: number }) {
  return (
    <div className="mt-8 flex items-center gap-2">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "active" : "todo";
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs transition-colors ${
                state === "done"
                  ? "bg-signal text-signal-foreground"
                  : state === "active"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </div>
            <span
              className={`hidden text-xs font-medium md:inline ${
                state === "todo" ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="ml-2 h-px flex-1 bg-border">
                <div
                  className={`h-full transition-all ${state === "done" ? "bg-signal" : "bg-transparent"}`}
                  style={{ width: state === "done" ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Step 1: Agent ---------------- */

function StepAgent({
  agent,
  setAgent,
  agentName,
  setAgentName,
}: {
  agent: AgentId | null;
  setAgent: (a: AgentId) => void;
  agentName: string;
  setAgentName: (s: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Pick your agent runtime</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Super Agent Skill speaks MCP natively. Any modern agent runtime works.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {AGENTS.map((a) => {
          const active = agent === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAgent(a.id)}
              className={`group flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-background hover:border-foreground/30"
              }`}
            >
              <div>
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{a.meta}</div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border-2 transition-colors ${
                  active ? "border-primary bg-primary" : "border-border"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-7">
        <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Agent display name
        </label>
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="e.g. cardio-bot-prod"
          className="mt-2 h-11 w-full rounded-md border border-border bg-background px-4 font-mono text-sm outline-none transition-colors focus:border-primary"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Shows up in your agent fleet dashboard. Lowercase, alphanumerics & dashes.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Step 2: Config ---------------- */

function StepConfig({ agent, agentName }: { agent: AgentId; agentName: string }) {
  const slug = (agentName || "my-agent").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const config = `{
  "mcpServers": {
    "superagentskill": {
      "url": "https://gateway.superagentskill.dev/mcp",
      "auth": {
        "type": "oauth",
        "scopes": ["registry:read", "agent:upgrade", "feedback:write"]
      },
      "agent": {
        "id": "${slug}",
        "runtime": "${agent}"
      }
    }
  }
}`;

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Add the Super Agent Skill MCP server</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Drop this into your <span className="font-mono text-foreground">mcp.config.json</span>. Restart your
        agent runtime so it discovers the new server.
      </p>

      <div className="mt-6">
        <CodeBlock filename="mcp.config.json" lang="json" code={config} />
      </div>

      <div className="mt-5 rounded-lg border border-border bg-surface p-4">
        <div className="font-mono text-[11px] uppercase tracking-wider text-primary">Why these scopes?</div>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <span className="font-mono text-foreground">registry:read</span> — discover packages in the network
          </li>
          <li>
            <span className="font-mono text-foreground">agent:upgrade</span> — install skills, playbooks, souls, guardrails
          </li>
          <li>
            <span className="font-mono text-foreground">feedback:write</span> — anonymized signal back to the Evolution Engine
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Step 3: Authenticate (Device-code OAuth) ---------------- */

function StepAuth({ onComplete }: { onComplete: () => void }) {
  const [code] = useState(() => generateCode());
  const [seconds, setSeconds] = useState(300);
  const [phase, setPhase] = useState<"waiting" | "approving" | "exchanging">("waiting");

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Authorize the connection</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        OAuth 2.1 device flow. Your agent never sees your credentials — only a short-lived, scoped access token.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        {/* Device code */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Verification code
          </div>
          <div className="mt-3 select-all font-mono text-3xl font-semibold tracking-[0.3em] text-foreground">
            {code}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
            Expires in <span className="font-mono text-foreground">{format(seconds)}</span>
          </div>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPhase("approving");
              setTimeout(() => setPhase("exchanging"), 1400);
              setTimeout(onComplete, 2800);
            }}
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-all hover:opacity-95"
          >
            Approve in browser →
          </a>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Opens <span className="font-mono">superagentskill.dev/device</span>
          </p>
        </div>

        {/* Arrow */}
        <div className="hidden items-center justify-center md:flex">
          <div className="font-mono text-2xl text-border">→</div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-border bg-[oklch(0.14_0.01_270)] p-5 text-white">
          <div className="font-mono text-[11px] uppercase tracking-wider text-white/50">Handshake status</div>
          <ul className="mt-4 space-y-2.5 font-mono text-[13px]">
            <Status label="Polling /token endpoint" done active={phase === "waiting"} />
            <Status
              label="User approving in browser"
              done={phase !== "waiting"}
              active={phase === "approving"}
            />
            <Status
              label="Exchanging device code → access token"
              done={phase === "exchanging"}
              active={phase === "exchanging"}
            />
            <Status label="Provisioning short-lived JWT" done={phase === "exchanging"} active={false} />
          </ul>
          <div className="mt-5 rounded-md border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-white/60">
            Tokens are scoped per-agent, rotate every 60 minutes, and are bound to your agent's MCP fingerprint.
          </div>
        </div>
      </div>
    </div>
  );
}

function Status({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
          done ? "bg-signal text-signal-foreground" : active ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/40"
        }`}
      >
        {done ? "✓" : active ? "•" : ""}
      </span>
      <span className={done ? "text-white/90" : active ? "text-white" : "text-white/40"}>{label}</span>
    </li>
  );
}

/* ---------------- Step 4: Verify ---------------- */

function StepVerify({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 5400);
    return () => clearTimeout(t);
  }, [onComplete]);

  const lines = [
    "$ superagentskill verify",
    "",
    "→ Fetching agent identity........... ok",
    "→ Validating JWT signature.......... ok",
    "→ Probing MCP capabilities.......... 12 tools",
    "→ Running self-assessment........... 87.2%",
    "→ SkillForge AI matching upgrades... 5 packages",
    "",
    "● Connection healthy. Ready to evolve.",
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Verifying your agent</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Super Agent Skill is performing the first capability probe and self-assessment.
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-[oklch(0.14_0.01_270)]">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.55_0.21_28)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.16_85)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-signal" />
            <span className="ml-3 font-mono text-xs text-white/50">verify.mcp</span>
          </div>
          <span className="font-mono text-[11px] text-white/40">live</span>
        </div>
        <TypingLines
          lines={lines}
          speed={12}
          startDelay={200}
          className="min-h-[260px] px-5 py-5 font-mono text-[13px] leading-relaxed text-white/90"
          lineClassName={(l) =>
            l.startsWith("●")
              ? "text-signal font-semibold"
              : l.startsWith("→")
                ? "text-white/80"
                : l.startsWith("$")
                  ? "text-primary"
                  : ""
          }
        />
      </div>
    </div>
  );
}

/* ---------------- Step 5: Done ---------------- */

function StepDone({ agentName }: { agentName: string }) {
  const navigate = useNavigate();
  const slug = (agentName || "my-agent").toLowerCase().replace(/[^a-z0-9-]+/g, "-");

  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-signal text-2xl font-bold text-signal-foreground">
        ✓
      </div>
      <h2 className="mt-5 text-3xl font-semibold tracking-tight">Your agent is alive.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-mono text-foreground">{slug}</span> is connected to the Super Agent Skill network.
      </p>

      <div className="mx-auto mt-7 grid max-w-md gap-3 text-left">
        {[
          { k: "Health score", v: "87.2 / 100" },
          { k: "Recommended upgrades", v: "5 packages" },
          { k: "Token rotation", v: "every 60 min" },
        ].map((m) => (
          <div
            key={m.k}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="text-sm text-muted-foreground">{m.k}</span>
            <span className="font-mono text-sm font-semibold">{m.v}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          onClick={() => navigate({ to: "/marketplace" })}
          className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95"
        >
          Browse marketplace →
        </button>
        <Link
          to="/docs"
          className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Read the docs
        </Link>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (i === 3) s += "-";
  }
  return s;
}

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
