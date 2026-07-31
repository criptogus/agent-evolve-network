import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { autoCreateMissing } from "@/lib/skills/forge-loop.functions";
import type { Artifact, Governance, Kind, Preset, StreamLine } from "@/lib/generate/types";
import {
  GOVERNANCE,
  KIND_LABELS,
  clamp,
  labelOf,
  round,
  truncate,
  wait,
} from "@/lib/generate/types";
import { SAMPLES, planFromPrompt } from "@/lib/generate/plan";
import { loadPresets, savePresets } from "@/lib/generate/presets";
import { implicitGuardrails } from "@/lib/generate/guardrails";
import { downloadHealthReport, downloadHealthReportPDF } from "@/lib/generate/health-report";
import { Bar, HealthBreakdownPanel, Metric } from "@/components/generate/HealthBreakdownPanel";
import { ShareButton } from "@/components/generate/ShareButton";
import { KindBadge } from "@/components/generate/KindBadge";
import { GuardrailExplain } from "@/components/generate/GuardrailExplain";
import { PresetsPanel } from "@/components/generate/PresetsPanel";
import { LeadGateModal } from "@/components/generate/LeadGateModal";

export const Route = createFileRoute("/generate")({
  component: GeneratePage,
  validateSearch: (search: Record<string, unknown>): { prompt?: string } => ({
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Live Generation · Super Agent Skill" },
      {
        name: "description",
        content:
          "Type a command in plain English and watch Super Agent Skill generate skills, playbooks and souls in real time, with a live Trust Score summary.",
      },
    ],
  }),
});

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

  const [realRunning, setRealRunning] = useState(false);
  const [realResult, setRealResult] = useState<{
    package: { slug: string; name: string; type: string; description?: string | null };
    research_used: boolean;
    evaluation: {
      overall_score: number;
      precision: number;
      safety: number;
      verdict: string;
      strengths?: string[];
      weaknesses?: string[];
    } | null;
    stages: { name: string; ms: number; ok: boolean; notes?: string }[];
  } | null>(null);
  const [realError, setRealError] = useState<string | null>(null);
  const realForge = useServerFn(autoCreateMissing);

  function detectKind(p: string): Kind {
    const s = p.toLowerCase();
    if (/(guardrail|never|don'?t|prevent|block|comply|complian|hipaa|gdpr|pii)/.test(s))
      return "guardrail";
    if (/(soul|tone|voice|personality|talks like|speaks like|persona)/.test(s)) return "soul";
    if (
      /(playbook|process|step.?by.?step|workflow|pipeline|triage|sequence|qualify|book demos)/.test(
        s,
      )
    )
      return "playbook";
    return "skill";
  }

  async function runRealForge() {
    if (!input.trim() || realRunning) return;
    setRealError(null);
    setRealResult(null);
    setRealRunning(true);
    try {
      const kind = detectKind(input);
      const res = await realForge({ data: { brief: input.trim(), type: kind } });
      setRealResult(res as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Unauthorized|401/i.test(msg)) {
        setRealError(
          "Sign in to run the live Forge Loop — it creates a real package in your account.",
        );
      } else if (/402|credits?/i.test(msg)) {
        setRealError(
          "AI credits exhausted. Add credits in workspace settings to run the live Forge.",
        );
      } else {
        setRealError(msg);
      }
    } finally {
      setRealRunning(false);
    }
  }
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
    pushLine(
      `Strategy: enrich ${plan.enrich.length} package${plan.enrich.length === 1 ? "" : "s"} from registry, generate ${plan.generate.length} custom from your context.`,
      "muted",
    );
    await wait(450);

    setPhase("enrich");
    for (const a of plan.enrich) {
      pushLine(
        `◆ Pulling ${labelOf(a.kind)} ${a.name}@${a.version} — state-of-the-art for ${plan.industry}`,
        "info",
      );
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
            Type what you want your agent to be. Watch Super Agent Skill enrich it with
            state-of-the-art packages and generate custom skills, playbooks and souls — with the
            Trust Score moving in real time.
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
                onClick={runRealForge}
                disabled={realRunning || !input.trim()}
                title="Run the real Forge Loop: web research → multi-stage author → adversarial eval → publish to your account"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-foreground hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {realRunning ? (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                    Researching + forging live…
                  </>
                ) : (
                  <>⚡ Forge for real (live AI)</>
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

          {/* Trust Score panel */}
          <div className="rounded-2xl border border-border bg-surface/60 p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Trust Score
              </span>
              <span
                className={
                  "font-mono text-[11px] " +
                  (delta.health >= 0 ? "text-signal-foreground" : "text-destructive")
                }
              >
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
              <Metric
                label="Precision"
                value={score.precision}
                unit="%"
                delta={delta.precision}
                good="up"
              />
              <Metric label="Safety" value={score.safety} unit="%" delta={delta.safety} good="up" />
              <Metric
                label="Latency"
                value={score.latency}
                unit="ms"
                delta={delta.latency}
                good="up"
                rawIsLatency
              />
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

        {(realRunning || realResult || realError) && (
          <section className="mt-8 animate-fade-in rounded-2xl border border-primary/30 bg-surface/50 p-6">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Live Forge Loop
                </span>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">
                  {realRunning
                    ? "Researching the web → drafting → judging → adversarial → evaluating…"
                    : realError
                      ? "Live forge couldn't complete"
                      : "Live agent forged & published"}
                </h2>
              </div>
              {realRunning && <span className="size-2 animate-pulse rounded-full bg-primary" />}
            </div>

            {realError && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">
                {realError}{" "}
                {/Sign in/.test(realError) && (
                  <Link to="/login" className="ml-1 underline">
                    Sign in →
                  </Link>
                )}
              </div>
            )}

            {realResult && (
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <KindBadge kind={realResult.package.type as Kind} />
                    <span className="font-mono text-[13px]">{realResult.package.name}</span>
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                      live
                    </span>
                  </div>
                  {realResult.package.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {realResult.package.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to="/marketplace/$packageId"
                      params={{ packageId: realResult.package.slug }}
                      className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-95"
                    >
                      Open package →
                    </Link>
                    <span className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 font-mono text-[11px] text-muted-foreground">
                      {realResult.research_used
                        ? "✓ web research grounded"
                        : "research skipped (fallback)"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Adversarial evaluation
                  </span>
                  {realResult.evaluation ? (
                    <>
                      <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-3xl font-semibold tabular-nums">
                          {realResult.evaluation.overall_score.toFixed(0)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 100 overall</span>
                        <span className="ml-auto rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                          {realResult.evaluation.verdict}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          Precision:{" "}
                          <span className="text-foreground">
                            {realResult.evaluation.precision.toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          Safety:{" "}
                          <span className="text-foreground">
                            {realResult.evaluation.safety.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {realResult.evaluation.strengths &&
                        realResult.evaluation.strengths.length > 0 && (
                          <ul className="mt-3 space-y-1 text-[12px] text-muted-foreground">
                            {realResult.evaluation.strengths.slice(0, 3).map((s, i) => (
                              <li key={i}>+ {s}</li>
                            ))}
                          </ul>
                        )}
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No evaluation returned.</p>
                  )}
                  {realResult.stages?.length > 0 && (
                    <div className="mt-3 border-t border-border pt-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Pipeline stages
                      </span>
                      <ul className="mt-1.5 space-y-0.5 font-mono text-[11px]">
                        {realResult.stages.map((st, i) => (
                          <li key={i} className={st.ok ? "text-foreground" : "text-destructive"}>
                            {st.ok ? "✓" : "✗"} {st.name}{" "}
                            <span className="text-muted-foreground">· {st.ms}ms</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {done && (
          <section className="mt-8 animate-fade-in rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Agent forged.</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Trust Score moved{" "}
                  <strong className="text-foreground">
                    {baseline.health.toFixed(1)} → {score.health.toFixed(1)}
                  </strong>{" "}
                  ({delta.health >= 0 ? "+" : ""}
                  {delta.health.toFixed(1)}).{" "}
                  {artifacts.filter((a) => a.source === "enriched").length} enriched and{" "}
                  {artifacts.filter((a) => a.source === "generated").length} generated from your
                  context.
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
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/15 text-primary"}`}
                        >
                          {isFree ? "FREE" : "Unlock"}
                        </span>
                      </button>
                      <button
                        onClick={handleClickPDF}
                        title={
                          isFree
                            ? "Free PDF download — command + Trust Score"
                            : "Free for qualified leads"
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
                      >
                        ↓ Export PDF
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/15 text-primary"}`}
                        >
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
                  href="/skillforge"
                  className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95"
                >
                  Open SkillForge →
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
