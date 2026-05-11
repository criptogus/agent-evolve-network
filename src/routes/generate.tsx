import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { autoCreateMissing } from "@/lib/skills/forge-loop.functions";

const FREE_PROVIDERS = new Set([
  "gmail.com","googlemail.com","yahoo.com","yahoo.co.uk","ymail.com","hotmail.com","outlook.com","live.com","msn.com","icloud.com","me.com","mac.com","aol.com","proton.me","protonmail.com","pm.me","gmx.com","gmx.net","mail.com","zoho.com","yandex.com","yandex.ru","qq.com","163.com","126.com","duck.com","tutanota.com","fastmail.com","hey.com"
]);
function isBusinessEmail(email: string): { ok: boolean; domain: string; reason?: string } {
  const e = email.trim().toLowerCase();
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(e);
  if (!m) return { ok: false, domain: "", reason: "Enter a valid email address." };
  const domain = m[1];
  if (FREE_PROVIDERS.has(domain)) return { ok: false, domain, reason: "Please use your work email — free providers aren't accepted." };
  return { ok: true, domain };
}

export const Route = createFileRoute("/generate")({
  component: GeneratePage,
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Live Generation · Super Agent Skill" },
      {
        name: "description",
        content:
          "Type a command in plain English and watch Super Agent Skill generate skills, playbooks and souls in real time, with a live Health Score summary.",
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

const PRESETS_KEY = "superagentskill.generate.presets.v1";

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

type Governance = "standard" | "strict" | "lockdown";

const GOVERNANCE: Record<Governance, { label: string; blurb: string; safetyBoost: number }> = {
  standard: {
    label: "Standard",
    blurb: "Balanced defaults: PII redaction, citation enforcement, refusal on out-of-scope asks.",
    safetyBoost: 0,
  },
  strict: {
    label: "Strict",
    blurb: "Adds dual-LLM judge on every output, blocks ungrounded claims, requires source for any number.",
    safetyBoost: 4,
  },
  lockdown: {
    label: "Lockdown",
    blurb: "Regulated-industry mode: human-in-the-loop on writes, full audit log, jailbreak & prompt-injection shields.",
    safetyBoost: 8,
  },
};

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
  const [governance, setGovernance] = useState<Governance>("standard");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetFormOpen, setPresetFormOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetTagsInput, setPresetTagsInput] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<Kind | "all">("all");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadUnlocked, setLeadUnlocked] = useState(false);
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

    // Update lastRun for any preset matching this exact prompt
    const totalArtifacts = plan.enrich.length + plan.generate.length;
    const sumDelta = [...plan.enrich, ...plan.generate].reduce(
      (acc, a) => ({
        health: acc.health + a.delta.health,
        precision: acc.precision + a.delta.precision,
        latency: acc.latency + a.delta.latency,
      }),
      { health: 0, precision: 0, latency: 0 },
    );
    setPresets((prev) => {
      const next = prev.map((p) =>
        p.prompt.trim() === promptText.trim()
          ? {
              ...p,
              lastRun: {
                at: Date.now(),
                artifacts: totalArtifacts,
                healthDelta: round(sumDelta.health),
                precisionDelta: round(sumDelta.precision),
                latencyDelta: Math.round(-sumDelta.latency),
              },
            }
          : p,
      );
      savePresets(next);
      return next;
    });
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
            Type what you want your agent to be. Watch Super Agent Skill enrich it with state-of-the-art
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
              <button
                type="button"
                onClick={() => {
                  if (!input.trim()) return;
                  // Pre-fill name from prompt if empty
                  setPresetName((n) => n || truncate(input.trim(), 48));
                  setPresetFormOpen((v) => !v);
                }}
                disabled={!input.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
                title="Save this prompt as a reusable preset"
              >
                <span aria-hidden>★</span>
                Save preset
              </button>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                ⌘ ↵ to run
              </span>
            </div>

            {presetFormOpen && (
              <div className="mt-3 rounded-lg border border-dashed border-border bg-background/60 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name (e.g. Cardiology v1)"
                    className="h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:border-primary/50 focus:outline-none"
                  />
                  <input
                    value={presetTagsInput}
                    onChange={(e) => setPresetTagsInput(e.target.value)}
                    placeholder="Tags, comma-separated (healthcare, triage)"
                    className="h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:border-primary/50 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!presetName.trim() || !input.trim()) return;
                        const tags = presetTagsInput
                          .split(",")
                          .map((t) => t.trim().toLowerCase())
                          .filter(Boolean);
                        const next: Preset[] = [
                          {
                            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            name: presetName.trim(),
                            tags,
                            prompt: input.trim(),
                            createdAt: Date.now(),
                          },
                          ...presets,
                        ].slice(0, 30);
                        setPresets(next);
                        savePresets(next);
                        setPresetFormOpen(false);
                        setPresetName("");
                        setPresetTagsInput("");
                      }}
                      disabled={!presetName.trim()}
                      className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetFormOpen(false)}
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
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

        {/* Presets */}
        <PresetsPanel
          presets={presets}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          onLoad={(p) => {
            setInput(p.prompt);
            taRef.current?.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onRun={(p) => {
            setInput(p.prompt);
            start(p.prompt);
          }}
          onDelete={(id) => {
            const next = presets.filter((p) => p.id !== id);
            setPresets(next);
            savePresets(next);
          }}
          running={running}
        />

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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Generated stack
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {artifacts.length} package{artifacts.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Governance level selector */}
            <div className="mt-3 rounded-xl border border-border bg-surface/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Governance level
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  safety {(score.safety + GOVERNANCE[governance].safetyBoost).toFixed(0)}%
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label="Governance level"
                className="mt-2 grid grid-cols-3 gap-1.5"
              >
                {(Object.keys(GOVERNANCE) as Governance[]).map((g) => {
                  const active = governance === g;
                  return (
                    <button
                      key={g}
                      role="radio"
                      aria-checked={active}
                      type="button"
                      onClick={() => setGovernance(g)}
                      className={
                        "rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors " +
                        (active
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground")
                      }
                    >
                      {GOVERNANCE[g].label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                {GOVERNANCE[governance].blurb}
              </p>
            </div>

            {/* Kind filter / grouping tabs */}
            {artifacts.length > 0 && (
              <div
                role="tablist"
                aria-label="Filter by kind"
                className="mt-3 flex flex-wrap gap-1.5"
              >
                {(["all", "skill", "playbook", "soul", "guardrail"] as const).map((k) => {
                  const count =
                    k === "all"
                      ? artifacts.length + implicitGuardrails(governance, artifacts).length
                      : artifacts.filter((a) => a.kind === k).length +
                        (k === "guardrail" ? implicitGuardrails(governance, artifacts).length : 0);
                  const active = kindFilter === k;
                  const label = k === "all" ? "All" : KIND_LABELS[k];
                  return (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={active}
                      type="button"
                      onClick={() => setKindFilter(k)}
                      className={
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors " +
                        (active
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground")
                      }
                    >
                      {label}
                      <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {artifacts.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  Skills, playbooks, souls and guardrails will appear here as they are forged.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {artifacts
                  .map((a, i) => ({ a, i }))
                  .filter(({ a }) => kindFilter === "all" || a.kind === kindFilter)
                  .map(({ a, i }) => (
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
                        {a.kind === "guardrail" && (
                          <GuardrailExplain name={a.name} level={governance} />
                        )}
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

                {/* Implicit guardrails injected by governance level */}
                {(kindFilter === "all" || kindFilter === "guardrail") &&
                  implicitGuardrails(governance, artifacts).map((g) => (
                  <li
                    key={g.id}
                    className="animate-fade-in rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <KindBadge kind="guardrail" />
                          <span className="truncate font-mono text-[13px] text-foreground">
                            {g.name}
                          </span>
                          <span className="rounded-full bg-background px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            from {GOVERNANCE[governance].label.toLowerCase()}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
                          {g.why}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {artifacts.length > 0 && (
          <HealthBreakdownPanel
            artifacts={artifacts}
            governance={governance}
            baseline={baseline}
            score={score}
            delta={delta}
          />
        )}

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
                {(() => {
                  const skillCount = artifacts.filter((a) => a.kind === "skill").length;
                  const isFree = skillCount === 1 || leadUnlocked;
                  const reportPayload = {
                    prompt: input,
                    baseline,
                    score,
                    governance,
                    artifacts,
                    implicit: implicitGuardrails(governance, artifacts),
                  };
                  const handleClick = () => {
                    if (isFree) downloadHealthReport(reportPayload);
                    else setLeadOpen(true);
                  };
                  const handleClickPDF = () => {
                    if (isFree) void downloadHealthReportPDF(reportPayload);
                    else setLeadOpen(true);
                  };
                  return (
                    <>
                      <button
                        onClick={handleClick}
                        title={isFree ? "Free download" : "Free for qualified leads"}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
                      >
                        ↓ Markdown report
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/15 text-primary"}`}>
                          {isFree ? "FREE" : "Unlock"}
                        </span>
                      </button>
                      <button
                        onClick={handleClickPDF}
                        title={isFree ? "Free PDF download — command + Health Score" : "Free for qualified leads"}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
                      >
                        ↓ Export PDF
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/15 text-primary"}`}>
                          {isFree ? "FREE" : "Unlock"}
                        </span>
                      </button>
                    </>
                  );
                })()}
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
        {leadOpen && (
          <LeadGateModal
            onClose={() => setLeadOpen(false)}
            onUnlock={async (lead) => {
              await supabase.from("report_leads").insert({
                email: lead.email,
                email_domain: lead.domain,
                company: lead.company,
                role: lead.role,
                prompt: input,
                stack_size: artifacts.length,
                governance,
                health_score: score.health,
              });
              setLeadUnlocked(true);
              setLeadOpen(false);
              downloadHealthReport({
                prompt: input,
                baseline,
                score,
                governance,
                artifacts,
                implicit: implicitGuardrails(governance, artifacts),
              });
            }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ---------- helpers ---------- */

/* ---------- health report download ---------- */

interface ReportInput {
  prompt: string;
  baseline: { health: number; precision: number; safety: number; latency: number };
  score: { health: number; precision: number; safety: number; latency: number };
  governance: Governance;
  artifacts: Artifact[];
  implicit: ImplicitGuardrail[];
}

function buildHealthReportMarkdown(r: ReportInput): string {
  const ts = new Date();
  const fmt = (n: number) => n.toFixed(1);
  const dH = r.score.health - r.baseline.health;
  const dP = r.score.precision - r.baseline.precision;
  const dS = r.score.safety + GOVERNANCE[r.governance].safetyBoost - r.baseline.safety;
  const dL = r.score.latency - r.baseline.latency;
  const sign = (n: number) => (n >= 0 ? "+" : "");
  const groups: Kind[] = ["skill", "playbook", "soul", "guardrail"];
  const counts = Object.fromEntries(
    groups.map((k) => [k, r.artifacts.filter((a) => a.kind === k).length])
  ) as Record<Kind, number>;

  const lines: string[] = [];
  lines.push(`# Super Agent Skill — Health Score Report`);
  lines.push(``);
  lines.push(`Generated: ${ts.toISOString()}`);
  lines.push(`Governance: **${GOVERNANCE[r.governance].label}** — ${GOVERNANCE[r.governance].blurb}`);
  lines.push(``);
  lines.push(`## Brief`);
  lines.push(``);
  lines.push("> " + (r.prompt.trim() || "(no prompt)").replace(/\n/g, "\n> "));
  lines.push(``);
  lines.push(`## Score deltas`);
  lines.push(``);
  lines.push(`| Metric | Baseline | Final | Δ |`);
  lines.push(`|---|---:|---:|---:|`);
  lines.push(`| Health | ${fmt(r.baseline.health)} | ${fmt(r.score.health)} | ${sign(dH)}${fmt(dH)} |`);
  lines.push(`| Precision | ${fmt(r.baseline.precision)} | ${fmt(r.score.precision)} | ${sign(dP)}${fmt(dP)} |`);
  lines.push(`| Safety (with governance) | ${fmt(r.baseline.safety)} | ${fmt(r.score.safety + GOVERNANCE[r.governance].safetyBoost)} | ${sign(dS)}${fmt(dS)} |`);
  lines.push(`| Latency (ms) | ${Math.round(r.baseline.latency)} | ${Math.round(r.score.latency)} | ${sign(dL)}${Math.round(dL)} |`);
  lines.push(``);
  lines.push(`## Stack composition`);
  lines.push(``);
  lines.push(
    `Skills ${counts.skill} · Playbooks ${counts.playbook} · Souls ${counts.soul} · Guardrails ${counts.guardrail} (+${r.implicit.length} implicit)`
  );
  lines.push(``);
  for (const k of groups) {
    const items = r.artifacts.filter((a) => a.kind === k);
    if (items.length === 0) continue;
    lines.push(`### ${KIND_LABELS[k]} (${items.length})`);
    lines.push(``);
    for (const a of items) {
      lines.push(`- **${a.name}@${a.version}** _(${a.source})_ — ${a.summary}`);
      for (const b of a.bullets) lines.push(`  - ${b}`);
    }
    lines.push(``);
  }
  if (r.implicit.length) {
    lines.push(`### Implicit guardrails (from ${GOVERNANCE[r.governance].label})`);
    lines.push(``);
    for (const g of r.implicit) lines.push(`- **${g.name}** — ${g.why}`);
    lines.push(``);
  }
  lines.push(`---`);
  lines.push(`Report generated by Super Agent Skill.`);
  return lines.join("\n");
}

function downloadHealthReport(r: ReportInput) {
  if (typeof window === "undefined") return;
  const md = buildHealthReportMarkdown(r);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const a = document.createElement("a");
  a.href = url;
  a.download = `superagentskill-health-report-${stamp}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadHealthReportPDF(r: ReportInput) {
  if (typeof window === "undefined") return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const newPageIfNeeded = (delta: number) => {
    if (y + delta > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const writeText = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const { size = 11, bold = false, color = [30, 30, 30], gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const line of lines) {
      newPageIfNeeded(size + gap);
      doc.text(line, margin, y);
      y += size + gap;
    }
  };
  const hr = () => {
    newPageIfNeeded(12);
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };

  const fmt = (n: number) => n.toFixed(1);
  const sign = (n: number) => (n >= 0 ? "+" : "");
  const dH = r.score.health - r.baseline.health;
  const dP = r.score.precision - r.baseline.precision;
  const dS = r.score.safety + GOVERNANCE[r.governance].safetyBoost - r.baseline.safety;
  const dL = r.score.latency - r.baseline.latency;

  // Header
  writeText("Super Agent Skill — Health Score Report", { size: 20, bold: true, gap: 6 });
  writeText(`Generated: ${new Date().toLocaleString()}`, { size: 9, color: [120, 120, 120], gap: 2 });
  writeText(`Governance: ${GOVERNANCE[r.governance].label}`, { size: 10, color: [80, 80, 80], gap: 2 });
  writeText(GOVERNANCE[r.governance].blurb, { size: 9, color: [120, 120, 120] });
  hr();

  // Brief / command
  writeText("Command", { size: 13, bold: true, gap: 6 });
  writeText(r.prompt.trim() || "(no prompt)", { size: 11, color: [40, 40, 40] });
  y += 8;

  // Score table
  writeText("Score deltas", { size: 13, bold: true, gap: 6 });
  const rows: [string, string, string, string][] = [
    ["Metric", "Baseline", "Final", "Δ"],
    ["Health", fmt(r.baseline.health), fmt(r.score.health), `${sign(dH)}${fmt(dH)}`],
    ["Precision", fmt(r.baseline.precision), fmt(r.score.precision), `${sign(dP)}${fmt(dP)}`],
    ["Safety", fmt(r.baseline.safety), fmt(r.score.safety + GOVERNANCE[r.governance].safetyBoost), `${sign(dS)}${fmt(dS)}`],
    ["Latency (ms)", String(Math.round(r.baseline.latency)), String(Math.round(r.score.latency)), `${sign(dL)}${Math.round(dL)}`],
  ];
  const colX = [margin, margin + 200, margin + 300, margin + 400];
  rows.forEach((row, idx) => {
    newPageIfNeeded(18);
    doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    row.forEach((cell, i) => doc.text(cell, colX[i], y));
    y += 16;
    if (idx === 0) {
      doc.setDrawColor(230);
      doc.line(margin, y - 12, pageW - margin, y - 12);
    }
  });
  y += 8;
  hr();

  // Stack composition
  const groups: Kind[] = ["skill", "playbook", "soul", "guardrail"];
  const counts = Object.fromEntries(groups.map((k) => [k, r.artifacts.filter((a) => a.kind === k).length])) as Record<Kind, number>;
  writeText("Stack composition", { size: 13, bold: true, gap: 6 });
  writeText(
    `Skills ${counts.skill} · Playbooks ${counts.playbook} · Souls ${counts.soul} · Guardrails ${counts.guardrail} (+${r.implicit.length} implicit)`,
    { size: 10, color: [80, 80, 80] },
  );
  y += 6;

  for (const k of groups) {
    const items = r.artifacts.filter((a) => a.kind === k);
    if (!items.length) continue;
    writeText(`${KIND_LABELS[k]} (${items.length})`, { size: 12, bold: true, gap: 4 });
    for (const a of items) {
      writeText(`• ${a.name}@${a.version}  (${a.source})`, { size: 10, bold: true, color: [40, 40, 40] });
      writeText(`   ${a.summary}`, { size: 10, color: [70, 70, 70] });
      for (const b of a.bullets) writeText(`   – ${b}`, { size: 9, color: [110, 110, 110] });
      y += 2;
    }
    y += 4;
  }

  if (r.implicit.length) {
    writeText(`Implicit guardrails (from ${GOVERNANCE[r.governance].label})`, { size: 12, bold: true, gap: 4 });
    for (const g of r.implicit) {
      writeText(`• ${g.name}`, { size: 10, bold: true, color: [40, 40, 40] });
      writeText(`   ${g.why}`, { size: 9, color: [110, 110, 110] });
    }
  }

  // Footer on each page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Super Agent Skill · Health Score Report · Page ${i} / ${total}`, margin, pageH - 24);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  doc.save(`superagentskill-health-report-${stamp}.pdf`);
}

function HealthBreakdownPanel({
  artifacts,
  governance,
  baseline,
  score,
  delta,
}: {
  artifacts: Artifact[];
  governance: Governance;
  baseline: { health: number; precision: number; safety: number; latency: number };
  score: { health: number; precision: number; safety: number; latency: number };
  delta: { health: number; precision: number; safety: number; latency: number };
}) {
  type Metric = "health" | "precision" | "safety" | "latency";
  const [metric, setMetric] = useState<Metric>("health");
  const [open, setOpen] = useState(true);

  const totals = artifacts.reduce(
    (acc, a) => ({
      health: acc.health + a.delta.health,
      precision: acc.precision + a.delta.precision,
      safety: acc.safety + a.delta.safety,
      latency: acc.latency + a.delta.latency,
    }),
    { health: 0, precision: 0, safety: 0, latency: 0 },
  );
  const govBoost = GOVERNANCE[governance].safetyBoost;

  // Score per artifact for the chosen metric. For latency, reduction (negative delta) is good.
  const scored = artifacts
    .map((a, idx) => {
      const raw = a.delta[metric];
      const contribution = metric === "latency" ? -raw : raw;
      return { a, idx, raw, contribution };
    })
    .sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution));

  const maxAbs = Math.max(0.001, ...scored.map((s) => Math.abs(s.contribution)));

  const totalForMetric = (() => {
    if (metric === "latency") return Math.round(baseline.latency - score.latency); // ms saved
    if (metric === "safety") return Number((delta.safety + govBoost).toFixed(1));
    return Number(delta[metric].toFixed(1));
  })();

  const fmt = (n: number) =>
    metric === "latency" ? `${n >= 0 ? "+" : ""}${Math.round(n)}ms` : `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
  const goodText = (n: number) =>
    n > 0 ? "text-signal-foreground" : n < 0 ? "text-destructive" : "text-muted-foreground";

  const metricMeta: Record<Metric, { label: string; unit: string; help: string }> = {
    health: { label: "Health", unit: "pts", help: "Composite of precision, safety and latency. Each package's contribution is signed and additive." },
    precision: { label: "Precision", unit: "pp", help: "Pass rate on the benchmark suite. Skills and playbooks usually move this." },
    safety: { label: "Safety", unit: "pp", help: "Block rate on adversarial probes. Guardrails and governance level dominate." },
    latency: { label: "Latency", unit: "ms", help: "Average response time. Lighter packages reduce it; heavy reasoning increases it." },
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-background p-5">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex size-6 items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
            title={open ? "Collapse" : "Expand"}
          >
            {open ? "−" : "+"}
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Health Score breakdown
          </span>
          <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            why this score
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(metricMeta) as Metric[]).map((m) => {
            const active = m === metric;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={active}
                className={
                  "rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors " +
                  (active
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground")
                }
              >
                {metricMeta[m].label}
              </button>
            );
          })}
        </div>
      </header>

      {open && (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
            <div className="rounded-xl border border-border bg-surface/40 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {metricMeta[metric].label} delta
              </div>
              <div className={"mt-1 text-3xl font-semibold tabular-nums " + goodText(totalForMetric)}>
                {fmt(totalForMetric)}
              </div>
              <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                {metricMeta[metric].help}
              </p>
              {metric === "safety" && govBoost > 0 && (
                <div className="mt-3 rounded-md border border-dashed border-border bg-background p-2 text-[11.5px] text-muted-foreground">
                  Includes <span className="text-foreground">+{govBoost}</span> from governance:{" "}
                  <span className="text-foreground">{GOVERNANCE[governance].label}</span>.
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md border border-border bg-background p-2">
                  <div className="text-muted-foreground">Baseline</div>
                  <div className="mt-0.5 font-mono text-foreground">
                    {metric === "latency" ? `${Math.round(baseline.latency)}ms` : baseline[metric].toFixed(1)}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-background p-2">
                  <div className="text-muted-foreground">Final</div>
                  <div className="mt-0.5 font-mono text-foreground">
                    {metric === "latency"
                      ? `${Math.round(score.latency)}ms`
                      : metric === "safety"
                        ? (score.safety + govBoost).toFixed(1)
                        : score[metric].toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Per-package contribution
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  sum {fmt(metric === "latency" ? -totals.latency : totals[metric])}
                </span>
              </div>
              <ul className="space-y-2">
                {scored.map(({ a, idx, raw, contribution }) => {
                  const pct = (Math.abs(contribution) / maxAbs) * 100;
                  const positive = contribution > 0;
                  const neutral = contribution === 0;
                  return (
                    <li key={idx} className="rounded-lg border border-border bg-surface/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <KindBadge kind={a.kind} />
                            <span className="truncate font-mono text-[12.5px] text-foreground">
                              {a.name}
                              <span className="text-muted-foreground">@{a.version}</span>
                            </span>
                            <span
                              className={
                                "rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider " +
                                (a.source === "enriched"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-signal/20 text-signal-foreground")
                              }
                            >
                              {a.source}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                            {justifyContribution(a, metric, raw)}
                          </p>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                            <div
                              className={
                                "h-full transition-all " +
                                (neutral
                                  ? "bg-muted-foreground/30"
                                  : positive
                                    ? "bg-signal/70"
                                    : "bg-destructive/70")
                              }
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={
                            "shrink-0 font-mono text-[12px] tabular-nums " + goodText(contribution)
                          }
                        >
                          {fmt(contribution)}
                        </span>
                      </div>
                    </li>
                  );
                })}

                {metric === "safety" && govBoost > 0 && (
                  <li className="rounded-lg border border-dashed border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            governance
                          </span>
                          <span className="font-mono text-[12.5px] text-foreground">
                            {GOVERNANCE[governance].label} mode
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                          {GOVERNANCE[governance].blurb}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-signal-foreground">
                        +{govBoost.toFixed(1)}
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function justifyContribution(a: Artifact, metric: "health" | "precision" | "safety" | "latency", raw: number): string {
  const kindWord =
    a.kind === "skill"
      ? "skill"
      : a.kind === "playbook"
        ? "playbook"
        : a.kind === "soul"
          ? "soul"
          : "guardrail";
  const sourceWord = a.source === "enriched" ? "enriched from registry" : "generated from your context";

  if (metric === "latency") {
    if (raw < 0) return `${cap(kindWord)} ${sourceWord} — trims ${Math.abs(Math.round(raw))}ms by short-circuiting reasoning paths.`;
    if (raw > 0) return `${cap(kindWord)} ${sourceWord} — adds ${Math.round(raw)}ms of deeper checks; pays for itself in precision.`;
    return `${cap(kindWord)} ${sourceWord} — neutral on latency.`;
  }
  if (metric === "safety") {
    if (a.kind === "guardrail") return `Guardrail ${sourceWord} — blocks the unsafe pattern outright. ${a.summary}`;
    if (raw > 0) return `${cap(kindWord)} ${sourceWord} — narrows scope, indirectly reduces unsafe outputs.`;
    return `${cap(kindWord)} ${sourceWord} — no direct safety contribution.`;
  }
  if (metric === "precision") {
    if (raw > 0) return `${cap(kindWord)} ${sourceWord} — adds domain rules and verified examples that lift pass rate.`;
    if (raw < 0) return `${cap(kindWord)} ${sourceWord} — slight precision tradeoff for tone or safety.`;
    return `${cap(kindWord)} ${sourceWord} — neutral on precision.`;
  }
  // health (composite)
  if (raw > 0) return `${cap(kindWord)} ${sourceWord} — net positive across precision, safety and latency. ${a.summary}`;
  if (raw < 0) return `${cap(kindWord)} ${sourceWord} — drags the composite; consider pairing with a complementary package.`;
  return `${cap(kindWord)} ${sourceWord} — composite-neutral.`;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
          title: "Super Agent Skill — Live demo",
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

const KIND_LABELS: Record<Kind, string> = {
  skill: "Skills",
  playbook: "Playbooks",
  soul: "Souls",
  guardrail: "Guardrails",
};

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

/* ---------- guardrail explanations ---------- */

const GUARDRAIL_BLURBS: Array<{ match: RegExp; blurb: string }> = [
  { match: /pii|redact|privacy/i, blurb: "Detects names, emails, phone numbers, IDs and PHI; redacts before logging or sending to third parties." },
  { match: /medical|clinical|hippocratic|fda/i, blurb: "Blocks unsafe drug doses, requires citation of authoritative source, escalates to a clinician above an uncertainty threshold." },
  { match: /no-?halluc|grounding|citation/i, blurb: "Rejects claims with no retrievable source. Every factual statement must carry a citation." },
  { match: /competit|brand|legal/i, blurb: "Refuses to recommend competitors, mention disallowed brands, or speculate on litigation." },
  { match: /jailbreak|injection|prompt/i, blurb: "Filters prompt-injection attempts in tool inputs and untrusted documents before the model sees them." },
];

function explainGuardrail(name: string) {
  return (
    GUARDRAIL_BLURBS.find((g) => g.match.test(name))?.blurb ??
    "Hard boundary: outputs that violate the rule are blocked or require human approval before sending."
  );
}

function GuardrailExplain({ name, level }: { name: string; level: Governance }) {
  const blurb = explainGuardrail(name);
  return (
    <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Why this is safe
      </div>
      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{blurb}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">
        Enforcement under <span className="text-foreground">{GOVERNANCE[level].label}</span>:{" "}
        {level === "lockdown"
          ? "block + human review + audit log."
          : level === "strict"
            ? "block + dual-LLM judge confirmation."
            : "redact or refuse with reason."}
      </p>
    </div>
  );
}

interface ImplicitGuardrail {
  id: string;
  name: string;
  why: string;
}

function implicitGuardrails(level: Governance, current: Artifact[]): ImplicitGuardrail[] {
  const have = new Set(current.filter((a) => a.kind === "guardrail").map((a) => a.name.toLowerCase()));
  const pool: ImplicitGuardrail[] = [];

  pool.push({
    id: "pii-baseline",
    name: "pii-redactor",
    why: "Auto-redacts personal data before it leaves the agent — applied to every output and tool call.",
  });
  if (level === "strict" || level === "lockdown") {
    pool.push({
      id: "grounding",
      name: "no-hallucination",
      why: "Every factual claim is checked by a second model and dropped if no source can be cited.",
    });
    pool.push({
      id: "injection",
      name: "prompt-injection-shield",
      why: "Strips instructions hidden inside retrieved documents and untrusted tool outputs.",
    });
  }
  if (level === "lockdown") {
    pool.push({
      id: "hitl",
      name: "human-in-the-loop-writes",
      why: "Any tool call that mutates external state (send, charge, deploy) requires explicit human approval.",
    });
    pool.push({
      id: "audit",
      name: "full-audit-trail",
      why: "Every prompt, tool call and output is signed and stored for regulator-grade replay.",
    });
  }

  return pool.filter((g) => !have.has(g.name.toLowerCase()));
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

function PresetsPanel({
  presets,
  tagFilter,
  setTagFilter,
  onLoad,
  onRun,
  onDelete,
  running,
}: {
  presets: Preset[];
  tagFilter: string | null;
  setTagFilter: (t: string | null) => void;
  onLoad: (p: Preset) => void;
  onRun: (p: Preset) => void;
  onDelete: (id: string) => void;
  running: boolean;
}) {
  const allTags = Array.from(new Set(presets.flatMap((p) => p.tags))).sort();
  const filtered = tagFilter ? presets.filter((p) => p.tags.includes(tagFilter)) : presets;

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface/40">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <div className="text-sm font-medium">Presets</div>
          <div className="text-xs text-muted-foreground">
            Save commands with name + tags. Re-run any time and compare last results side by side.
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={
                "rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider " +
                (tagFilter === null
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground")
              }
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(t === tagFilter ? null : t)}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] font-mono " +
                  (tagFilter === t
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground")
                }
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </header>

      {presets.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No presets yet. Click <span className="text-foreground">★ Save preset</span> above to bookmark
          a command for later.
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No presets match the filter <span className="text-foreground">#{tagFilter}</span>.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((p) => (
            <li key={p.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground md:ml-0">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{p.prompt}</p>
                {p.lastRun ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                    <span>
                      last run · <span className="text-foreground">{relTime(p.lastRun.at)}</span>
                    </span>
                    <span>
                      pkgs <span className="text-foreground">{p.lastRun.artifacts}</span>
                    </span>
                    <span>
                      Δhealth{" "}
                      <span className={p.lastRun.healthDelta >= 0 ? "text-signal-foreground" : "text-destructive"}>
                        {p.lastRun.healthDelta >= 0 ? "+" : ""}
                        {p.lastRun.healthDelta.toFixed(1)}
                      </span>
                    </span>
                    <span>
                      Δprecision{" "}
                      <span className={p.lastRun.precisionDelta >= 0 ? "text-signal-foreground" : "text-destructive"}>
                        {p.lastRun.precisionDelta >= 0 ? "+" : ""}
                        {p.lastRun.precisionDelta.toFixed(1)}
                      </span>
                    </span>
                    <span>
                      Δlatency{" "}
                      <span className={p.lastRun.latencyDelta >= 0 ? "text-signal-foreground" : "text-destructive"}>
                        {p.lastRun.latencyDelta >= 0 ? "-" : "+"}
                        {Math.abs(p.lastRun.latencyDelta)}ms
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                    not run yet
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => onRun(p)}
                  disabled={running}
                  className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => onLoad(p)}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2 text-xs text-muted-foreground hover:text-destructive"
                  title="Delete preset"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function relTime(t: number): string {
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ---------- lead gate modal ---------- */

interface LeadInput { email: string; domain: string; company: string; role: string }

function LeadGateModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: (lead: LeadInput) => Promise<void> | void }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!company.trim()) return setError("Company is required.");
    if (!role.trim()) return setError("Role is required.");
    const v = isBusinessEmail(email);
    if (!v.ok) return setError(v.reason ?? "Invalid email.");
    setBusy(true);
    try {
      await onUnlock({ email: email.trim().toLowerCase(), domain: v.domain, company: company.trim(), role: role.trim() });
    } catch {
      setError("Could not save your details. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Unlock the Health Score report</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Single-skill reports are free. For multi-skill stacks, share your work email — we&apos;ll unlock the full PDF-grade report.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">×</button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">
            Work email
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255}
              placeholder="you@company.com"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Company
              <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} required
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Role
              <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} required
                placeholder="Head of AI"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-[11px] text-muted-foreground">
            Free providers (gmail, yahoo, outlook, …) aren&apos;t accepted. We use your email only to send product updates — unsubscribe anytime.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">Cancel</button>
            <button type="submit" disabled={busy} className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60">
              {busy ? "Unlocking…" : "Unlock & download"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
