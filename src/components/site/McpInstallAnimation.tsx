import { useEffect, useState } from "react";

const MCP_URL = "https://superagentskill.com/api/public/mcp";

const CLIENTS = [
  { name: "Claude", glyph: "✦" },
  { name: "Hermes", glyph: "◈" },
  { name: "ChatGPT", glyph: "◆" },
  { name: "Cursor", glyph: "▸" },
  { name: "Lovable", glyph: "♥" },
];

/** Axis scores before and after the SAK pipeline (0..100). */
const AXES = [
  { key: "Triggers & scope", before: 18, after: 92 },
  { key: "Steps & exit gates", before: 24, after: 90 },
  { key: "Guardrails", before: 9, after: 95 },
  { key: "Evidence / substance", before: 31, after: 88 },
  { key: "Output contract", before: 22, after: 93 },
];

const FINDINGS = [
  { sev: "critical", text: "No guardrails — 82% of adversarial prompts get through" },
  { sev: "high", text: "Vague triggers: agent loads the skill at the wrong time" },
  { sev: "high", text: "No exit gates — steps loop and burn tokens" },
  { sev: "medium", text: "No output contract, so downstream tools break" },
];

const FIXES = [
  "Rewrote SKILL.md against the reference rubric (8 pillars)",
  "Added 14 explicit triggers + anti-triggers",
  "Inserted step-by-step exit gates and fallback paths",
  "Attached 3 guardrails + 10 adversarial test cases",
  "Added a structured output template with typed fields",
];

const METRICS = [
  { label: "Task success rate", before: "42%", after: "94%", delta: "+124%", good: true },
  { label: "Hallucination rate", before: "31%", after: "1.4%", delta: "−95%", good: true },
  { label: "Cost / 1k runs", before: "$412", after: "$54", delta: "−87%", good: true },
  { label: "p95 latency", before: "38s", after: "6.1s", delta: "−84%", good: true },
];

const STEP_LABELS = [
  "Connect the MCP",
  "Submit your skill",
  "Diagnosis: what's broken",
  "The pipeline rewrites it",
  "Re-scored: F → A",
  "What it does to your metrics",
];

/**
 * 6-step looping animation showing the full SAK loop on the landing page:
 * connect → submit a bad skill → see it graded F → watch the pipeline fix it →
 * re-score to A → see the impact on production metrics.
 * Deliberately slow so a first-time visitor can read every panel.
 */
export function McpInstallAnimation() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activeClient, setActiveClient] = useState(0);
  const [reveal, setReveal] = useState(0); // generic per-step reveal counter
  const [grade, setGrade] = useState<"F" | "A">("F");
  const [axisPhase, setAxisPhase] = useState<"before" | "after">("before");
  const [score, setScore] = useState(27);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      while (!cancelled) {
        // ---- reset
        setStep(0);
        setTyped(0);
        setCopied(false);
        setReveal(0);
        setGrade("F");
        setAxisPhase("before");
        setScore(27);
        setActiveClient((c) => (c + 1) % CLIENTS.length);

        // ---- step 1: connect
        await sleep(900);
        if (cancelled) return;
        for (let i = 1; i <= MCP_URL.length; i++) {
          if (cancelled) return;
          setTyped(i);
          await sleep(26);
        }
        await sleep(700);
        if (cancelled) return;
        setCopied(true);
        await sleep(2200);
        if (cancelled) return;

        // ---- step 2: submit skill
        setStep(1);
        setReveal(0);
        for (let i = 1; i <= 3; i++) {
          if (cancelled) return;
          await sleep(900);
          setReveal(i);
        }
        await sleep(2600);
        if (cancelled) return;

        // ---- step 3: diagnosis (grade F + findings)
        setStep(2);
        setReveal(0);
        await sleep(800);
        for (let i = 1; i <= FINDINGS.length; i++) {
          if (cancelled) return;
          setReveal(i);
          await sleep(950);
        }
        await sleep(3000);
        if (cancelled) return;

        // ---- step 4: fixes delivered
        setStep(3);
        setReveal(0);
        for (let i = 1; i <= FIXES.length; i++) {
          if (cancelled) return;
          setReveal(i);
          await sleep(1000);
        }
        await sleep(2800);
        if (cancelled) return;

        // ---- step 5: re-score F → A
        setStep(4);
        setAxisPhase("before");
        setScore(27);
        setGrade("F");
        await sleep(1400);
        if (cancelled) return;
        setAxisPhase("after");
        // count the score up
        for (let s = 27; s <= 91; s += 2) {
          if (cancelled) return;
          setScore(s);
          await sleep(45);
        }
        setScore(91);
        setGrade("A");
        await sleep(3600);
        if (cancelled) return;

        // ---- step 6: metric impact
        setStep(5);
        setReveal(0);
        for (let i = 1; i <= METRICS.length; i++) {
          if (cancelled) return;
          setReveal(i);
          await sleep(1000);
        }
        await sleep(4200);
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
          <span className="ml-2 font-mono text-xs text-white/50 sm:ml-3">skill.upgrade</span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-white/40">F → A in one pass</span>
      </div>

      <div className="min-h-[420px] p-4 font-mono leading-relaxed text-white/90 sm:p-5">
        {/* Step indicator */}
        <div className="mb-4 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
          {STEP_LABELS.map((_, i) => (
            <span
              key={i}
              className={
                "h-1 flex-1 rounded-full transition-all duration-700 " +
                (step > i ? "bg-signal/70" : step === i ? "bg-primary" : "bg-white/10")
              }
            />
          ))}
        </div>
        <div className="mb-5 flex items-center gap-2 text-[11px]">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-primary/50 bg-primary/15 px-1.5 text-[10px] text-primary">
            {step + 1}/6
          </span>
          <span className="min-w-0 flex-1 text-pretty text-white/60">{STEP_LABELS[step]}</span>
        </div>

        {/* ---------- Step 1 — connect ---------- */}
        {step === 0 && (
          <div className="animate-fade-in">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Your MCP endpoint · works in {client.name}
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
              One URL — no SDK, no keys, no DevOps. Then just ask your agent to review a skill.
            </div>
          </div>
        )}

        {/* ---------- Step 2 — submit the skill ---------- */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="rounded-md border border-white/10 bg-black/30 p-3">
              <div className="text-white/70">
                <span className="text-primary">you →</span> review my skill{" "}
                <span className="text-white">sales-outreach.md</span>
              </div>
              {reveal >= 1 && (
                <div className="mt-2 animate-fade-in text-white/50">
                  <span className="text-signal">agent →</span> calling{" "}
                  <span className="text-white/80">review_skill</span> …
                </div>
              )}
              {reveal >= 2 && (
                <div className="mt-1 animate-fade-in text-white/50">
                  parsing 1 file · 2.4k tokens · language: pt-BR detected
                </div>
              )}
              {reveal >= 3 && (
                <div className="mt-1 animate-fade-in text-white/50">
                  running engine v5 · format axes + LLM substance judge + 10 adversarial cases
                </div>
              )}
            </div>
            <div className="mt-4 text-pretty text-white/50">
              Any file, any language. The same rubric that grades the marketplace grades yours.
            </div>
          </div>
        )}

        {/* ---------- Step 3 — diagnosis ---------- */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[oklch(0.55_0.21_28)]/50 bg-[oklch(0.55_0.21_28)]/15 text-lg font-bold text-[oklch(0.7_0.2_28)]">
                F
              </span>
              <div className="min-w-0">
                <div className="text-white">27 / 100 · not certifiable</div>
                <div className="text-[11px] text-white/50">
                  4 blocking findings, each mapped to a rubric pillar
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-1.5">
              {FINDINGS.map((f, i) => (
                <div
                  key={f.text}
                  className={
                    "flex items-start gap-2 rounded border border-white/5 bg-black/25 px-2.5 py-1.5 transition-all duration-500 " +
                    (i < reveal ? "opacity-100" : "opacity-0")
                  }
                  style={{ transform: i < reveal ? "translateX(0)" : "translateX(-6px)" }}
                >
                  <span
                    className={
                      "shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider " +
                      (f.sev === "critical"
                        ? "bg-[oklch(0.55_0.21_28)]/20 text-[oklch(0.75_0.2_28)]"
                        : f.sev === "high"
                          ? "bg-[oklch(0.78_0.16_85)]/15 text-[oklch(0.85_0.16_85)]"
                          : "bg-white/10 text-white/60")
                    }
                  >
                    {f.sev}
                  </span>
                  <span className="min-w-0 text-pretty text-white/75">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------- Step 4 — fixes delivered ---------- */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              What the pipeline hands back
            </div>
            <div className="mt-3 grid gap-1.5">
              {FIXES.map((f, i) => (
                <div
                  key={f}
                  className={
                    "flex items-start gap-2 transition-all duration-500 " +
                    (i < reveal ? "opacity-100" : "opacity-0")
                  }
                  style={{ transform: i < reveal ? "translateY(0)" : "translateY(4px)" }}
                >
                  <span className="mt-0.5 shrink-0 text-signal">✓</span>
                  <span className="min-w-0 text-pretty text-white/80">{f}</span>
                </div>
              ))}
            </div>
            {reveal >= FIXES.length && (
              <div className="mt-4 animate-fade-in rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-pretty text-primary">
                You get the rewritten SKILL.md as a diff — every change cites the rubric line and the
                evidence in your own text.
              </div>
            )}
          </div>
        )}

        {/* ---------- Step 5 — re-score ---------- */}
        {step === 4 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3">
              <span
                className={
                  "flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-bold transition-all duration-700 " +
                  (grade === "A"
                    ? "border-signal/50 bg-signal/15 text-signal"
                    : "border-[oklch(0.55_0.21_28)]/50 bg-[oklch(0.55_0.21_28)]/15 text-[oklch(0.7_0.2_28)]")
                }
              >
                {grade}
              </span>
              <div className="min-w-0">
                <div className="text-white">
                  {score} / 100{" "}
                  <span className="text-white/40">
                    {grade === "A" ? "· certifiable, signed release" : "· re-running rubric…"}
                  </span>
                </div>
                <div className="text-[11px] text-white/50">Same task, same model — better skill</div>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {AXES.map((a) => {
                const v = axisPhase === "after" ? a.after : a.before;
                return (
                  <div key={a.key} className="min-w-0">
                    <div className="flex items-center justify-between text-[11px] text-white/55">
                      <span className="truncate">{a.key}</span>
                      <span className={axisPhase === "after" ? "text-signal" : "text-white/40"}>
                        {v}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={
                          "h-full rounded-full transition-all duration-[1400ms] ease-out " +
                          (axisPhase === "after" ? "bg-signal" : "bg-[oklch(0.55_0.21_28)]")
                        }
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------- Step 6 — metric impact ---------- */}
        {step === 5 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-signal">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
              Measured on the same task, 90-day window
            </div>
            <div className="mt-3 grid gap-1.5">
              {METRICS.map((m, i) => (
                <div
                  key={m.label}
                  className={
                    "flex min-w-0 items-center gap-2 rounded border border-white/5 bg-black/25 px-2.5 py-2 transition-all duration-500 " +
                    (i < reveal ? "opacity-100" : "opacity-0")
                  }
                  style={{ transform: i < reveal ? "translateY(0)" : "translateY(4px)" }}
                >
                  <span className="min-w-0 flex-1 truncate text-white/70">{m.label}</span>
                  <span className="shrink-0 text-white/40 line-through">{m.before}</span>
                  <span className="shrink-0 text-white/30">→</span>
                  <span className="shrink-0 text-white">{m.after}</span>
                  <span className="shrink-0 rounded bg-signal/15 px-1.5 py-0.5 text-[10px] text-signal">
                    {m.delta}
                  </span>
                </div>
              ))}
            </div>
            {reveal >= METRICS.length && (
              <div className="mt-4 animate-fade-in rounded-md border border-signal/30 bg-signal/10 px-3 py-2 text-signal">
                ● Skill certified A · published with an Ed25519-signed trust attestation
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
