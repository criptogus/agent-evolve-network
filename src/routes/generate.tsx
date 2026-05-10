import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/generate")({
  component: GeneratePage,
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Live Generation · AgentForge" },
      {
        name: "description",
        content:
          "Type a command in plain English and watch AgentForge generate skills, playbooks and souls in real time, with a live Health Score summary.",
      },
    ],
  }),
});

type Kind = "skill" | "playbook" | "soul" | "guardrail";

interface Artifact {
  kind: Kind;
  name: string;
  version: string;
  summary: string;
  source: "enriched" | "generated";
  delta: { health: number; precision: number; safety: number; latency: number };
  bullets: string[];
}

interface StreamLine {
  id: number;
  text: string;
  tone: "muted" | "info" | "ok" | "warn" | "evolve";
}

interface Preset {
  id: string;
  name: string;
  tags: string[];
  prompt: string;
  createdAt: number;
  lastRun?: {
    at: number;
    artifacts: number;
    healthDelta: number;
    precisionDelta: number;
    latencyDelta: number;
  };
}

const PRESETS_KEY = "agentforge.generate.presets.v1";

function loadPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePresets(p: Preset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRESETS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

const SAMPLES = [
  "I run a cardiology clinic and want my agent to triage chest-pain cases using the latest 2026 ESC guidelines.",
  "I sell to CFOs of mid-market SaaS. Build the playbook and give it a McKinsey soul.",
  "Create a custom soul that talks like our founder Marina, plus a guardrail that never recommends competitors.",
  "Make my agent an SDR for a Series B fintech: prospect on LinkedIn, qualify, book demos in HubSpot.",
];

function GeneratePage() {
  const { prompt: initialPrompt } = Route.useSearch();
  const [input, setInput] = useState<string>(initialPrompt ?? "");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [stream, setStream] = useState<StreamLine[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [phase, setPhase] = useState<string>("idle");
  const [score, setScore] = useState({ health: 71, precision: 74, safety: 88, latency: 920 });
  const [baseline] = useState({ health: 71, precision: 74, safety: 88, latency: 920 });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetFormOpen, setPresetFormOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetTagsInput, setPresetTagsInput] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const lineId = useRef(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  // Auto-run from URL ?prompt=
  useEffect(() => {
    if (initialPrompt && !running && !done) {
      // small delay so user sees the box populated first
      const id = setTimeout(() => start(initialPrompt), 350);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushLine(text: string, tone: StreamLine["tone"] = "muted") {
    lineId.current += 1;
    setStream((s) => [...s, { id: lineId.current, text, tone }]);
  }

  function reset() {
    setRunning(false);
    setDone(false);
    setStream([]);
    setArtifacts([]);
    setPhase("idle");
    setScore(baseline);
  }

  async function start(promptText: string) {
    if (!promptText.trim() || running) return;
    setRunning(true);
    setDone(false);
    setStream([]);
    setArtifacts([]);
    setScore(baseline);

    const plan = planFromPrompt(promptText);

    setPhase("understand");
    pushLine(`› Command: "${promptText}"`, "info");
    await wait(450);
    pushLine(`Detected domain: ${plan.industry} · Detected role: ${plan.role}`, "muted");
    await wait(350);
    pushLine(`Strategy: enrich ${plan.enrich.length} package${plan.enrich.length === 1 ? "" : "s"} from registry, generate ${plan.generate.length} custom from your context.`, "muted");
    await wait(450);

    setPhase("enrich");
    for (const a of plan.enrich) {
      pushLine(`◆ Pulling ${labelOf(a.kind)} ${a.name}@${a.version} — state-of-the-art for ${plan.industry}`, "info");
      await wait(280);
      pushLine(`  ✓ Installed. ${a.summary}`, "ok");
      setArtifacts((arr) => [...arr, a]);
      bumpScore(a.delta);
      await wait(320);
    }

    setPhase("generate");
    pushLine("—— SkillForge: synthesizing custom packages ——", "info");
    await wait(380);
    for (const a of plan.generate) {
      pushLine(`✦ Generating ${labelOf(a.kind)} ${a.name}@${a.version}…`, "warn");
      await wait(420);
      pushLine(`  · scanning your context, distilling ${a.bullets.length} principles`, "muted");
      await wait(380);
      pushLine(`  ✓ Generated & signed. ${a.summary}`, "ok");
      setArtifacts((arr) => [...arr, a]);
      bumpScore(a.delta);
      await wait(360);
    }

    setPhase("verify");
    pushLine("Replaying benchmark suite (412 traces)…", "info");
    await wait(700);
    pushLine("● Agent updated. Improvements locked in.", "evolve");

    setRunning(false);
    setDone(true);
    setPhase("done");
  }

  function bumpScore(d: Artifact["delta"]) {
    setScore((s) => ({
      health: clamp(s.health + d.health, 0, 99.6),
      precision: clamp(s.precision + d.precision, 0, 99),
      safety: clamp(s.safety + d.safety, 0, 100),
      latency: clamp(s.latency + d.latency, 320, 2000),
    }));
  }

  const delta = useMemo(
    () => ({
      health: round(score.health - baseline.health),
      precision: round(score.precision - baseline.precision),
      safety: round(score.safety - baseline.safety),
      latency: Math.round(baseline.latency - score.latency),
    }),
    [score, baseline],
  );

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        {/* Header */}
        <div className="border-b border-border/70 pb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-signal pulse-dot" />
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              Live generation · {phase}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            One sentence. A specialist agent.
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Type what you want your agent to be. Watch AgentForge enrich it with state-of-the-art
            packages and generate custom skills, playbooks and souls — with the Health Score moving
            in real time.
          </p>
        </div>

        {/* Composer */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-border bg-surface/60 p-4">
            <label className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Prompt
            </label>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder='e.g. "Make my agent a hematology specialist for a São Paulo clinic, conservative tone, never advise without citing a source."'
              className="mt-2 w-full resize-none rounded-lg border border-border bg-background p-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => start(input)}
                disabled={running || !input.trim()}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-primary-foreground" />
                    Forging…
                  </>
                ) : (
                  <>Forge agent →</>
                )}
              </button>
              <button
                onClick={reset}
                disabled={running}
                className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                Reset
              </button>
              <ShareButton prompt={input} />
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                ⌘ ↵ to run
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    taRef.current?.focus();
                  }}
                  disabled={running}
                  className="rounded-full border border-border bg-background px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  {truncate(s, 64)}
                </button>
              ))}
            </div>
          </div>

          {/* Health Score panel */}
          <div className="rounded-2xl border border-border bg-surface/60 p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Health Score
              </span>
              <span className={"font-mono text-[11px] " + (delta.health >= 0 ? "text-signal-foreground" : "text-destructive")}>
                {delta.health >= 0 ? "+" : ""}
                {delta.health.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-semibold tracking-tight tabular-nums">
                {score.health.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <Bar value={score.health} max={100} />
            <div className="mt-5 space-y-3">
              <Metric label="Precision" value={score.precision} unit="%" delta={delta.precision} good="up" />
              <Metric label="Safety" value={score.safety} unit="%" delta={delta.safety} good="up" />
              <Metric label="Latency" value={score.latency} unit="ms" delta={delta.latency} good="up" rawIsLatency />
            </div>
          </div>
        </section>

        {/* Stream + Artifacts */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Stream */}
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Forge stream
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {stream.length} events
              </span>
            </div>
            <div className="h-[420px] overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed">
              {stream.length === 0 ? (
                <p className="text-muted-foreground">
                  Press <span className="text-foreground">Forge agent</span> to start streaming…
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {stream.map((l) => (
                    <li
                      key={l.id}
                      className={
                        "animate-fade-in " +
                        (l.tone === "ok"
                          ? "text-signal-foreground"
                          : l.tone === "warn"
                            ? "text-primary"
                            : l.tone === "evolve"
                              ? "text-foreground font-semibold"
                              : l.tone === "info"
                                ? "text-foreground"
                                : "text-muted-foreground")
                      }
                    >
                      {l.text}
                    </li>
                  ))}
                  {running && (
                    <li className="text-muted-foreground">
                      <span className="inline-block animate-pulse">▍</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Artifacts */}
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Generated stack
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {artifacts.length} package{artifacts.length === 1 ? "" : "s"}
              </span>
            </div>
            {artifacts.length === 0 ? (
              <div className="flex h-[380px] items-center justify-center text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  Skills, playbooks, souls and guardrails will appear here as they are forged.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {artifacts.map((a, i) => (
                  <li
                    key={i}
                    className="animate-fade-in rounded-xl border border-border bg-surface/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <KindBadge kind={a.kind} />
                          <span className="truncate font-mono text-[13px] text-foreground">
                            {a.name}
                            <span className="text-muted-foreground">@{a.version}</span>
                          </span>
                        </div>
                        <p className="mt-1.5 text-[13px] text-muted-foreground">{a.summary}</p>
                        <ul className="mt-2 space-y-0.5">
                          {a.bullets.map((b, k) => (
                            <li key={k} className="text-[12px] text-muted-foreground">
                              · {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider " +
                          (a.source === "enriched"
                            ? "bg-primary/10 text-primary"
                            : "bg-signal/20 text-signal-foreground")
                        }
                      >
                        {a.source}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {done && (
          <section className="mt-8 animate-fade-in rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Agent forged.</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Health Score moved <strong className="text-foreground">{baseline.health.toFixed(1)} → {score.health.toFixed(1)}</strong>{" "}
                  ({delta.health >= 0 ? "+" : ""}
                  {delta.health.toFixed(1)}). {artifacts.filter((a) => a.source === "enriched").length} enriched and {artifacts.filter((a) => a.source === "generated").length} generated from your context.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={reset}
                  className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
                >
                  Forge another
                </button>
                <a
                  href="/evolution"
                  className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
                >
                  Watch it evolve →
                </a>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ---------- helpers ---------- */

function ShareButton({ prompt }: { prompt: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const disabled = !prompt.trim();

  async function handleShare() {
    if (disabled || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("prompt", prompt.trim());
    const shareUrl = url.toString();

    // Try Web Share API on mobile/supported browsers
    const nav = window.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share && /Mobi|Android|iPhone|iPad/i.test(nav.userAgent)) {
      try {
        await nav.share({
          title: "AgentForge — Live demo",
          text: `Watch this prompt forge an agent: "${prompt.trim()}"`,
          url: shareUrl,
        });
        setState("copied");
        setTimeout(() => setState("idle"), 1800);
        return;
      } catch {
        // user cancelled or share failed → fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={disabled}
      title={disabled ? "Type a prompt first" : "Copy a shareable link with this prompt"}
      aria-live="polite"
      className={
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 " +
        (state === "copied"
          ? "border-signal/40 bg-signal/10 text-signal-foreground"
          : state === "error"
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border bg-background hover:bg-accent")
      }
    >
      {state === "copied" ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Link copied
        </>
      ) : state === "error" ? (
        <>Copy failed</>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Share demo
        </>
      )}
    </button>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-signal transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  delta,
  rawIsLatency = false,
}: {
  label: string;
  value: number;
  unit: string;
  delta: number;
  good?: "up" | "down";
  rawIsLatency?: boolean;
}) {
  const positive = delta > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums">
          <span className="text-foreground">
            {rawIsLatency ? Math.round(value) : value.toFixed(1)}
          </span>
          <span className="text-muted-foreground">{unit}</span>
          {delta !== 0 && (
            <span className={"ml-2 " + (positive ? "text-signal-foreground" : "text-destructive")}>
              {positive ? "+" : ""}
              {rawIsLatency ? `${Math.round(delta)}ms faster` : delta.toFixed(1)}
            </span>
          )}
        </span>
      </div>
      <Bar value={rawIsLatency ? Math.max(0, 100 - (value / 1500) * 100) : value} max={100} />
    </div>
  );
}

function KindBadge({ kind }: { kind: Kind }) {
  const map: Record<Kind, { label: string; cls: string }> = {
    skill: { label: "SKILL", cls: "bg-primary/10 text-primary" },
    playbook: { label: "PLAYBOOK", cls: "bg-signal/20 text-signal-foreground" },
    soul: { label: "SOUL", cls: "bg-accent text-accent-foreground" },
    guardrail: { label: "GUARDRAIL", cls: "bg-destructive/10 text-destructive" },
  };
  const v = map[kind];
  return (
    <span className={"rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider " + v.cls}>
      {v.label}
    </span>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function round(n: number) {
  return Math.round(n * 10) / 10;
}
function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function labelOf(k: Kind) {
  return k;
}

/* ---------- prompt → plan (deterministic, keyword-based) ---------- */

function planFromPrompt(prompt: string): {
  industry: string;
  role: string;
  enrich: Artifact[];
  generate: Artifact[];
} {
  const p = prompt.toLowerCase();

  let industry = "Generalist";
  let role = "Knowledge worker";

  if (/(cardio|chest pain|esc|arrhythm)/.test(p)) {
    industry = "Healthcare · Cardiology";
    role = "Clinical assistant";
    return {
      industry,
      role,
      enrich: [
        artifact("skill", "cardiology-diagnostics", "2.1.0", "enriched", {
          summary: "ESC 2026 chest-pain triage, ACS pathways, risk scoring (HEART, GRACE).",
          bullets: ["12-lead ECG interpretation", "Troponin kinetics", "Rule-out ACS in 0/1h"],
          delta: { health: 6.4, precision: 5.8, safety: 1.2, latency: -40 },
        }),
        artifact("guardrail", "medical-guardrails", "1.4.0", "enriched", {
          summary: "Blocks unverified diagnoses, requires citations, defers ambiguous to MD.",
          bullets: ["Citation-required", "No drug dosing without weight", "Escalate red flags"],
          delta: { health: 2.1, precision: 0.4, safety: 6.0, latency: 10 },
        }),
      ],
      generate: [
        artifact("playbook", "chest-pain-triage", "0.1.0", "generated", {
          summary: "Custom intake → risk score → escalation flow tuned to your clinic.",
          bullets: ["Intake template", "Risk-stratified routing", "Handoff note to cardiologist"],
          delta: { health: 3.2, precision: 2.6, safety: 1.4, latency: -30 },
        }),
      ],
    };
  }

  if (/(cfo|enterprise|saas|sales|sdr|prospect|hubspot|linkedin|outbound|close)/.test(p)) {
    industry = "Enterprise SaaS";
    role = "Revenue agent";
    const enrich: Artifact[] = [
      artifact("playbook", "enterprise-sales-flow", "1.4.2", "enriched", {
        summary: "MEDDPICC qualification, multi-thread outreach, deal review cadence.",
        bullets: ["MEDDPICC scoring", "Champion enablement", "Mutual close plan"],
        delta: { health: 5.2, precision: 4.1, safety: 0.2, latency: -20 },
      }),
    ];
    if (/sdr|prospect|linkedin|hubspot/.test(p)) {
      enrich.push(
        artifact("skill", "linkedin-prospecting", "1.2.0", "enriched", {
          summary: "Persona research + InMail sequences benchmarked above 18% reply.",
          bullets: ["ICP scoring", "Trigger-based outreach", "HubSpot sync"],
          delta: { health: 3.4, precision: 3.2, safety: 0.0, latency: -15 },
        }),
      );
    }
    const generate: Artifact[] = [];
    if (/mckinsey|consultant/.test(p) || /cfo/.test(p)) {
      generate.push(
        artifact("soul", "cfo-whisperer", "0.1.0", "generated", {
          summary: "Speaks ROI, payback period and unit economics. Concise, numerate.",
          bullets: ["Quantifies every claim", "TCO framing", "MoM/QoQ language"],
          delta: { health: 3.6, precision: 2.8, safety: 0.4, latency: 0 },
        }),
      );
    }
    if (/competitor|never recommend/.test(p)) {
      generate.push(
        artifact("guardrail", "competitor-shield", "0.1.0", "generated", {
          summary: "Blocks 14 competitor mentions and rerouting to comparison frames.",
          bullets: ["Brand allowlist", "Comparison reframing", "Audit log"],
          delta: { health: 1.4, precision: 0.0, safety: 3.2, latency: 5 },
        }),
      );
    }
    if (generate.length === 0) {
      generate.push(
        artifact("soul", "challenger-rep", "0.1.0", "generated", {
          summary: "Challenger-style soul tuned for your ICP and tone of voice.",
          bullets: ["Insight-led openers", "Reframing objections", "Confident close"],
          delta: { health: 2.8, precision: 2.0, safety: 0.2, latency: -5 },
        }),
      );
    }
    return { industry, role, enrich, generate };
  }

  if (/(legal|law|due diligence|contract|nda)/.test(p)) {
    industry = "Legal";
    role = "Junior associate";
    return {
      industry,
      role,
      enrich: [
        artifact("skill", "legal-due-diligence", "1.6.0", "enriched", {
          summary: "Contract review, red-flag detection, NDA/MSA clause comparison.",
          bullets: ["Clause taxonomy", "Risk heatmap", "Redline suggestions"],
          delta: { health: 5.8, precision: 5.0, safety: 1.6, latency: -25 },
        }),
        artifact("guardrail", "legal-compliance", "2.0.0", "enriched", {
          summary: "Jurisdiction-aware, never gives legal advice, attorney-review flag.",
          bullets: ["Jurisdiction tagging", "Privilege protection", "Citation-required"],
          delta: { health: 2.0, precision: 0.6, safety: 5.4, latency: 10 },
        }),
      ],
      generate: [
        artifact("playbook", "deal-room-prep", "0.1.0", "generated", {
          summary: "Custom checklist + memo flow modeled on your last 30 deals.",
          bullets: ["Doc index", "Issue list draft", "Closing checklist"],
          delta: { health: 2.8, precision: 2.2, safety: 0.8, latency: -10 },
        }),
      ],
    };
  }

  if (/(hematolog|oncolog|onco)/.test(p)) {
    industry = "Healthcare · Hematology";
    role = "Specialist assistant";
    return {
      industry,
      role,
      enrich: [
        artifact("skill", "hematology-specialist", "1.3.0", "enriched", {
          summary: "CBC interpretation, anemia workup, coagulation pathways.",
          bullets: ["Smear hints", "Reticulocyte logic", "DDx ranking"],
          delta: { health: 6.0, precision: 5.4, safety: 1.0, latency: -30 },
        }),
        artifact("guardrail", "medical-guardrails", "1.4.0", "enriched", {
          summary: "Citation-required, deferral on red flags, dosing safety net.",
          bullets: ["Cite-or-quiet", "Red-flag escalation", "Dose sanity check"],
          delta: { health: 2.0, precision: 0.4, safety: 5.6, latency: 10 },
        }),
      ],
      generate: [
        artifact("soul", "humanized-clinician", "0.1.0", "generated", {
          summary: "Calm, specific tone for patient-facing summaries in plain Portuguese.",
          bullets: ["Avoids jargon", "Names uncertainty", "Always next step"],
          delta: { health: 2.4, precision: 1.4, safety: 0.6, latency: 0 },
        }),
      ],
    };
  }

  if (/(founder|marina|ceo|talk like|voice of)/.test(p)) {
    industry = "Brand voice";
    role = "Voice of the company";
    return {
      industry,
      role,
      enrich: [
        artifact("skill", "brand-voice-writer", "1.2.0", "enriched", {
          summary: "On-brand long-form and short-form with tone fidelity scoring.",
          bullets: ["Tone score ≥ 0.85", "Style guide pinned", "Terminology lock"],
          delta: { health: 4.2, precision: 3.6, safety: 0.4, latency: -15 },
        }),
      ],
      generate: [
        artifact("soul", "founder-soul", "0.1.0", "generated", {
          summary: "Distilled from 412 transcripts. Cadence, idioms, decision style locked in.",
          bullets: ["Signature phrases", "Story arcs", "Opinionated POV"],
          delta: { health: 4.6, precision: 2.8, safety: 0.2, latency: -10 },
        }),
        artifact("guardrail", "off-brand-shield", "0.1.0", "generated", {
          summary: "Flags off-voice drafts before they ship. Suggests rewrites.",
          bullets: ["Tone fidelity gate", "Forbidden terms", "Rewrite hints"],
          delta: { health: 1.6, precision: 0.4, safety: 3.4, latency: 5 },
        }),
      ],
    };
  }

  // Default fallback — generic but useful
  return {
    industry,
    role,
    enrich: [
      artifact("skill", "research-pro", "1.5.0", "enriched", {
        summary: "Structured research with sources, dedup and recency weighting.",
        bullets: ["Source diversity", "Freshness boost", "Cite-on-claim"],
        delta: { health: 4.0, precision: 3.6, safety: 0.6, latency: -20 },
      }),
      artifact("guardrail", "no-hallucination", "1.4.0", "enriched", {
        summary: "Blocks low-confidence claims, requires citations, hedges uncertainty.",
        bullets: ["Confidence floor", "Citation-required", "Hedging policy"],
        delta: { health: 2.4, precision: 0.6, safety: 4.8, latency: 10 },
      }),
    ],
    generate: [
      artifact("soul", "your-house-style", "0.1.0", "generated", {
        summary: "Soul tuned to your brief — tone, cadence and decision style.",
        bullets: ["Cadence locked", "Vocabulary curated", "Opinion calibrated"],
        delta: { health: 2.8, precision: 1.6, safety: 0.4, latency: -5 },
      }),
    ],
  };
}

function artifact(
  kind: Kind,
  name: string,
  version: string,
  source: "enriched" | "generated",
  rest: { summary: string; bullets: string[]; delta: Artifact["delta"] },
): Artifact {
  return { kind, name, version, source, ...rest };
}
