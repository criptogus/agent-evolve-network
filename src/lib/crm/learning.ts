/**
 * CRM learning layer — pure logic, no I/O.
 *
 * Three responsibilities:
 *  1. Copy variants (bandit arms) per trigger, with a deterministic rewrite of
 *     the base message so every framing shows the same numbers.
 *  2. Outcome definitions: what "this message worked" means per trigger, and how
 *     long we wait before we judge it.
 *  3. Selection math: Thompson sampling over observed conversion rates, expected
 *     value ranking of eligible triggers, send-window choice and fatigue backoff.
 *
 * All customer-facing copy here is English-only by product rule.
 */
import type { CrmMessage } from "@/lib/crm/copy";
import type { TriggerId } from "@/lib/crm/segments";

/* ------------------------------------------------------------------ variants */

export type Framing = "roi" | "risk" | "capability";

export type VariantDef = {
  variant: string;
  label: string;
  framing: Framing;
};

/** Built-in arms. The tuner may pause arms or add approved ones on top. */
export const VARIANTS: Record<TriggerId, VariantDef[]> = {
  welcome_connect: [
    { variant: "v1", label: "Measured outcome", framing: "roi" },
    { variant: "v2", label: "Capability tour", framing: "capability" },
  ],
  connect_nudge: [
    { variant: "v1", label: "Two-minute setup", framing: "capability" },
    { variant: "v2", label: "Nothing is measured yet", framing: "risk" },
  ],
  first_value_proof: [
    { variant: "v1", label: "Money and hours", framing: "roi" },
    { variant: "v2", label: "What to unlock next", framing: "capability" },
  ],
  value_digest: [
    { variant: "v1", label: "Weekly ROI recap", framing: "roi" },
    { variant: "v2", label: "Headroom left on the table", framing: "risk" },
    { variant: "v3", label: "Next capability", framing: "capability" },
  ],
  opportunity_nudge: [
    { variant: "v1", label: "Unused capability", framing: "capability" },
    { variant: "v2", label: "Cost of not using it", framing: "risk" },
  ],
  pro_upsell: [
    { variant: "v1", label: "Break-even math", framing: "roi" },
    { variant: "v2", label: "Limits you are hitting", framing: "capability" },
  ],
  cloud_library_upsell: [
    { variant: "v1", label: "One library, every tool", framing: "capability" },
    { variant: "v2", label: "Cost of scattered skills", framing: "risk" },
  ],
  at_risk: [
    { variant: "v1", label: "Silent regressions", framing: "risk" },
    { variant: "v2", label: "One-call resume", framing: "capability" },
  ],
  win_back: [
    { variant: "v1", label: "What changed", framing: "capability" },
    { variant: "v2", label: "Benchmark gap", framing: "roi" },
  ],
  pro_value_recap: [
    { variant: "v1", label: "Invoice-ready proof", framing: "roi" },
    { variant: "v2", label: "Unused Pro surface", framing: "capability" },
  ],
};

export type VariantOverride = {
  subject?: string | null;
  heading?: string | null;
  intro?: string | null;
};

/**
 * Re-frames a base message for one arm. Numbers are never changed — only the
 * emphasis of subject, heading and the leading paragraph.
 */
export function applyVariant(
  message: CrmMessage,
  def: VariantDef | undefined,
  override?: VariantOverride,
): CrmMessage {
  let out: CrmMessage = { ...message };

  if (def && def.framing !== "roi") {
    const money = message.metrics.find((m) => m.value.includes("$"));
    if (def.framing === "risk") {
      out = {
        ...out,
        subject: money
          ? `${money.value} of avoidable spend is still in your setup`
          : `What it costs to leave this unmeasured`,
        heading: out.heading,
        intro: [
          money
            ? `Unmeasured instructions are the most expensive kind: ${money.value} of the spend below is avoidable today.`
            : "Instructions nobody measures fail quietly, and the cost shows up as retries and human rescues.",
          ...out.intro,
        ].slice(0, 3),
      };
    } else {
      const step = out.bullets[0];
      out = {
        ...out,
        subject: step ? `Next on your account: ${step.split(" — ")[0]}` : out.subject,
        intro: [
          step
            ? `The highest-value thing you can do next takes minutes: ${step}.`
            : "Here is the highest-value capability you have not used yet.",
          ...out.intro,
        ].slice(0, 3),
      };
    }
  }

  if (override?.subject) out.subject = override.subject;
  if (override?.heading) out.heading = override.heading;
  if (override?.intro) out.intro = [override.intro, ...out.intro].slice(0, 3);
  return out;
}

/* ------------------------------------------------------------------ outcomes */

export type OutcomeKind =
  | "connected"
  | "any_value_action"
  | "review"
  | "install_or_review"
  | "subscription"
  | "residency_or_agent";

export type OutcomeDef = {
  kind: OutcomeKind;
  /** Hours after send in which the action counts as caused by the message. */
  windowHours: number;
  /** Business weight used to rank candidate triggers (relative, not money). */
  weight: number;
  label: string;
};

export const OUTCOMES: Record<TriggerId, OutcomeDef> = {
  welcome_connect: { kind: "connected", windowHours: 168, weight: 1.6, label: "Agent connected" },
  connect_nudge: { kind: "connected", windowHours: 168, weight: 1.5, label: "Agent connected" },
  first_value_proof: {
    kind: "any_value_action",
    windowHours: 72,
    weight: 1.2,
    label: "Another measured action",
  },
  value_digest: { kind: "install_or_review", windowHours: 72, weight: 1.0, label: "Review or install" },
  opportunity_nudge: {
    kind: "any_value_action",
    windowHours: 72,
    weight: 1.0,
    label: "Used a new capability",
  },
  pro_upsell: { kind: "subscription", windowHours: 168, weight: 3.0, label: "Started paying" },
  cloud_library_upsell: {
    kind: "subscription",
    windowHours: 168,
    weight: 2.8,
    label: "Started paying",
  },
  at_risk: { kind: "any_value_action", windowHours: 168, weight: 2.0, label: "Came back" },
  win_back: { kind: "any_value_action", windowHours: 336, weight: 2.2, label: "Came back" },
  pro_value_recap: {
    kind: "any_value_action",
    windowHours: 168,
    weight: 1.4,
    label: "Kept using Pro",
  },
};

/* ------------------------------------------------------------------- bandit  */

export type ArmStats = { sent: number; opened: number; clicked: number; converted: number };

export const EMPTY_ARM: ArmStats = { sent: 0, opened: 0, clicked: 0, converted: 0 };

/** Key used in the stats maps. */
export const armKey = (trigger: string, variant: string) => `${trigger}::${variant}`;

/**
 * Beta(1 + conversions, 1 + failures) sample. Uses two gamma draws built from
 * a simple Marsaglia-Tsang sampler so we stay dependency-free and deterministic
 * enough for tests when `rand` is injected.
 */
function gammaSample(shape: number, rand: () => number): number {
  if (shape < 1) {
    const u = Math.max(rand(), 1e-9);
    return gammaSample(shape + 1, rand) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (let i = 0; i < 200; i += 1) {
    let x = 0;
    let v = 0;
    do {
      // Box-Muller normal
      const u1 = Math.max(rand(), 1e-9);
      const u2 = rand();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.max(rand(), 1e-9);
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
  return d;
}

export function betaSample(alpha: number, beta: number, rand: () => number = Math.random): number {
  const a = gammaSample(Math.max(alpha, 0.01), rand);
  const b = gammaSample(Math.max(beta, 0.01), rand);
  return a / (a + b || 1);
}

/** Engagement-weighted success count: a click counts more than an open. */
export function successScore(s: ArmStats): number {
  return s.converted * 1 + s.clicked * 0.35 + s.opened * 0.1;
}

/** Posterior mean conversion rate with a weak prior, safe at zero volume. */
export function estimatedRate(s: ArmStats): number {
  const success = successScore(s);
  return (success + 1) / (s.sent + 2);
}

/** Thompson sampling: pick the arm with the best sampled rate. */
export function pickVariant(
  trigger: TriggerId,
  arms: VariantDef[],
  stats: Record<string, ArmStats>,
  rand: () => number = Math.random,
): VariantDef {
  const pool = arms.length > 0 ? arms : VARIANTS[trigger];
  let best = pool[0]!;
  let bestDraw = -1;
  for (const arm of pool) {
    const s = stats[armKey(trigger, arm.variant)] ?? EMPTY_ARM;
    const success = successScore(s);
    const draw = betaSample(1 + success, 1 + Math.max(0, s.sent - success), rand);
    if (draw > bestDraw) {
      bestDraw = draw;
      best = arm;
    }
  }
  return best;
}

/** Expected value of sending this trigger now: learned rate x business weight. */
export function triggerScore(
  trigger: TriggerId,
  stats: Record<string, ArmStats>,
  minSamples: number,
): number {
  const arms = VARIANTS[trigger] ?? [];
  let sent = 0;
  let success = 0;
  for (const arm of arms) {
    const s = stats[armKey(trigger, arm.variant)] ?? EMPTY_ARM;
    sent += s.sent;
    success += successScore(s);
  }
  const weight = OUTCOMES[trigger]?.weight ?? 1;
  // Below the confidence threshold we fall back to the business weight only,
  // so the engine can never behave worse than the deterministic rules.
  if (sent < minSamples) return weight;
  return ((success + 1) / (sent + 2)) * weight * 4;
}

/* -------------------------------------------------------------- send timing  */

export type HourStat = { sent: number; engaged: number; converted: number };

/**
 * Best UTC hour to reach this customer: their own activity profile, with the
 * global engagement-by-hour table as a tie-breaker.
 */
export function preferredHours(
  activeHours: Array<{ hour: number; events: number }>,
  globalHours: Record<number, HourStat>,
): number[] {
  const score = new Map<number, number>();
  const totalEvents = activeHours.reduce((n, h) => n + h.events, 0) || 1;
  for (const h of activeHours) score.set(h.hour, (h.events / totalEvents) * 2);
  for (const [hourRaw, s] of Object.entries(globalHours)) {
    const hour = Number(hourRaw);
    if (s.sent < 5) continue;
    const rate = (s.converted + s.engaged * 0.4 + 1) / (s.sent + 2);
    score.set(hour, (score.get(hour) ?? 0) + rate);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
}

/** True when `hour` is inside the customer's best window (or we have no data). */
export function isGoodHour(hour: number, ranked: number[]): boolean {
  if (ranked.length === 0) return true;
  const top = ranked.slice(0, 4);
  return top.includes(hour) || top.includes((hour + 1) % 24) || top.includes((hour + 23) % 24);
}

/* ------------------------------------------------------------------ fatigue  */

export type RecentEngagement = { messages: number; engaged: number };

/**
 * Fatigue multiplier applied on top of the fixed cadence caps. Two consecutive
 * ignored messages double the cooldown; three or more triple it. Any engagement
 * resets it to 1.
 */
export function fatigueMultiplier(recent: RecentEngagement): number {
  if (recent.engaged > 0) return 1;
  if (recent.messages >= 3) return 3;
  if (recent.messages >= 2) return 2;
  return 1;
}

/** Statistical guard before the tuner is allowed to pause an arm. */
export function shouldPauseArm(
  arm: ArmStats,
  best: ArmStats,
  minSamples: number,
): { pause: boolean; reason: string } {
  if (arm.sent < minSamples) return { pause: false, reason: "not enough data" };
  if (best.sent < minSamples) return { pause: false, reason: "no confident winner" };
  const a = estimatedRate(arm);
  const b = estimatedRate(best);
  const se = Math.sqrt((a * (1 - a)) / arm.sent + (b * (1 - b)) / best.sent) || 1e-6;
  const z = (b - a) / se;
  if (z >= 1.96 && b > a * 1.2)
    return {
      pause: true,
      reason: `loses to the leading variant (${(a * 100).toFixed(1)}% vs ${(b * 100).toFixed(1)}%, z=${z.toFixed(2)})`,
    };
  return { pause: false, reason: "difference not significant" };
}
