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

/* ---------------------------------------------------- segmented A/B testing  */

/**
 * A segment is the personalization context of a message: the agent tool the
 * customer connects with plus their usage pattern. Copy is already tailored per
 * segment, so the experiment has to be measured per segment too — a framing
 * that wins for Cursor authors can lose for Claude Code reviewers.
 */
export type Segment = { toolId: string | null; pattern: string | null };

export const UNKNOWN_SEGMENT_PART = "unknown";

export function segmentKey(seg: Segment): string {
  return `${seg.toolId || UNKNOWN_SEGMENT_PART}|${seg.pattern || UNKNOWN_SEGMENT_PART}`;
}

/** Stats key for one arm inside one segment. */
export const segmentArmKey = (trigger: string, variant: string, seg: Segment) =>
  `${trigger}::${variant}::${segmentKey(seg)}`;

export function addStats(a: ArmStats, b: ArmStats): ArmStats {
  return {
    sent: a.sent + b.sent,
    opened: a.opened + b.opened,
    clicked: a.clicked + b.clicked,
    converted: a.converted + b.converted,
  };
}

/**
 * Hierarchical (partial pooling) posterior for one arm in one segment.
 *
 * Segments are small, so a raw per-segment rate would chase noise. We shrink
 * the segment towards the arm's global rate with `strength` pseudo-observations:
 * with no segment data the arm behaves exactly like the global experiment, and
 * as segment volume grows the segment takes over.
 */
export function blendedPosterior(
  segment: ArmStats,
  global: ArmStats,
  strength = 8,
): { success: number; sent: number; rate: number } {
  const globalRate = estimatedRate(global);
  const segSuccess = successScore(segment);
  const success = segSuccess + globalRate * strength;
  const sent = segment.sent + strength;
  return { success, sent, rate: success / sent };
}

/**
 * Thompson sampling inside one segment: same arms as the global experiment,
 * but the posterior is the segment's own data pooled with the global arm.
 */
export function pickVariantForSegment(
  trigger: TriggerId,
  arms: VariantDef[],
  globalStats: Record<string, ArmStats>,
  segmentStats: Record<string, ArmStats>,
  seg: Segment,
  rand: () => number = Math.random,
  strength = 8,
): VariantDef {
  const pool = arms.length > 0 ? arms : VARIANTS[trigger];
  let best = pool[0]!;
  let bestDraw = -1;
  for (const arm of pool) {
    const g = globalStats[armKey(trigger, arm.variant)] ?? EMPTY_ARM;
    const s = segmentStats[segmentArmKey(trigger, arm.variant, seg)] ?? EMPTY_ARM;
    const { success, sent } = blendedPosterior(s, g, strength);
    const draw = betaSample(1 + success, 1 + Math.max(0, sent - success), rand);
    if (draw > bestDraw) {
      bestDraw = draw;
      best = arm;
    }
  }
  return best;
}

export type SegmentRow = {
  trigger: string;
  variant: string;
  tool_id: string;
  usage_pattern: string;
  stats: ArmStats;
};

export type SegmentBreakdown = {
  /** "tool" | "pattern" | "tool+pattern" */
  dimension: "tool" | "pattern" | "tool_pattern";
  key: string;
  tool_id: string | null;
  usage_pattern: string | null;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  conversion_rate: number;
  open_rate: number;
  click_rate: number;
  /** Best-performing variant in this segment, once it has any volume. */
  leader: { trigger: string; variant: string; sent: number; converted: number; rate: number } | null;
  /** Per-variant detail so the admin can compare arms inside the segment. */
  variants: Array<{
    trigger: string;
    variant: string;
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    conversion_rate: number;
  }>;
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/**
 * Roll raw per-(trigger, variant, tool, pattern) rows up into one dimension so
 * the dashboard can answer "which copy converts best for Cursor?" and
 * "which converts best for authors?" from the same data.
 */
export function summarizeSegments(
  rows: SegmentRow[],
  dimension: "tool" | "pattern" | "tool_pattern",
): SegmentBreakdown[] {
  const groups = new Map<string, SegmentBreakdown>();

  for (const r of rows) {
    const key =
      dimension === "tool" ? r.tool_id : dimension === "pattern" ? r.usage_pattern : `${r.tool_id}|${r.usage_pattern}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        dimension,
        key,
        tool_id: dimension === "pattern" ? null : r.tool_id,
        usage_pattern: dimension === "tool" ? null : r.usage_pattern,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        conversion_rate: 0,
        open_rate: 0,
        click_rate: 0,
        leader: null,
        variants: [],
      };
      groups.set(key, g);
    }
    g.sent += r.stats.sent;
    g.opened += r.stats.opened;
    g.clicked += r.stats.clicked;
    g.converted += r.stats.converted;

    const existing = g.variants.find((v) => v.trigger === r.trigger && v.variant === r.variant);
    const target =
      existing ??
      (g.variants.push({
        trigger: r.trigger,
        variant: r.variant,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        conversion_rate: 0,
      }),
      g.variants[g.variants.length - 1]!);
    target.sent += r.stats.sent;
    target.opened += r.stats.opened;
    target.clicked += r.stats.clicked;
    target.converted += r.stats.converted;
  }

  for (const g of groups.values()) {
    g.conversion_rate = pct(g.converted, g.sent);
    g.open_rate = pct(g.opened, g.sent);
    g.click_rate = pct(g.clicked, g.sent);
    for (const v of g.variants) v.conversion_rate = pct(v.converted, v.sent);
    g.variants.sort(
      (a, b) => b.conversion_rate - a.conversion_rate || b.sent - a.sent || a.variant.localeCompare(b.variant),
    );
    const best = g.variants.filter((v) => v.sent > 0)[0];
    g.leader = best
      ? {
          trigger: best.trigger,
          variant: best.variant,
          sent: best.sent,
          converted: best.converted,
          rate: best.conversion_rate,
        }
      : null;
  }

  return [...groups.values()].sort((a, b) => b.sent - a.sent || a.key.localeCompare(b.key));
}

/**
 * Two-proportion z-test between the two best arms of a segment. Used to label a
 * segment result as significant instead of implying certainty from small counts.
 */
export function segmentSignificance(
  g: SegmentBreakdown,
  minSamples = 20,
): { significant: boolean; z: number; label: string } {
  const [a, b] = g.variants.filter((v) => v.sent > 0);
  if (!a || !b) return { significant: false, z: 0, label: "needs a second variant" };
  if (a.sent < minSamples || b.sent < minSamples)
    return { significant: false, z: 0, label: `needs ${minSamples}+ sends per variant` };
  const pa = a.converted / a.sent;
  const pb = b.converted / b.sent;
  const se = Math.sqrt((pa * (1 - pa)) / a.sent + (pb * (1 - pb)) / b.sent) || 1e-6;
  const z = (pa - pb) / se;
  return {
    significant: Math.abs(z) >= 1.96,
    z: Math.round(z * 100) / 100,
    label:
      Math.abs(z) >= 1.96
        ? `${a.variant} wins here (z=${z.toFixed(2)})`
        : `no clear winner yet (z=${z.toFixed(2)})`,
  };
}

/* ------------------------------------------- adaptive per-segment send timing */

/**
 * One hour of measured customer activity. `usageEvents` counts product work
 * (tool calls, skill runs, evaluations); `syncEvents` counts cloud-library sync
 * activity (syncs, conflict resolutions). Sync activity is the stronger signal
 * that the customer is at their machine with an agent open, so it weighs more.
 */
export type ActivityHour = { hour: number; events: number; usageEvents?: number; syncEvents?: number };

/** Engagement by send hour inside one segment. Key: `segmentKey::hour`. */
export type SegmentHourStats = Record<string, HourStat>;

export const segmentHourKey = (seg: Segment, hour: number) => `${segmentKey(seg)}::${hour}`;

const USAGE_WEIGHT = 1;
const SYNC_WEIGHT = 1.6;

export type TimingConfidence = "none" | "low" | "medium" | "high";

export type TimingProfile = {
  /** Hours (UTC) ranked best-first. */
  ranked: number[];
  /** Hours we are willing to send in right now. */
  window: number[];
  confidence: TimingConfidence;
  /** Multiplier applied on top of each trigger's base cooldown. Never below 1. */
  cooldownMultiplier: number;
  signals: {
    usageEvents: number;
    syncEvents: number;
    segmentSends: number;
    globalSends: number;
    segmentEngagementRate: number;
    globalEngagementRate: number;
  };
  reason: string;
};

function hourRate(s: HourStat): number {
  return (s.converted + s.engaged * 0.4 + 1) / (s.sent + 2);
}

function totalStat(list: HourStat[]): HourStat {
  return list.reduce(
    (a, b) => ({ sent: a.sent + b.sent, engaged: a.engaged + b.engaged, converted: a.converted + b.converted }),
    { sent: 0, engaged: 0, converted: 0 },
  );
}

function engagementRate(s: HourStat): number {
  return (s.converted + s.engaged * 0.4 + 1) / (s.sent + 2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Builds the send-timing decision for one customer from three measured sources,
 * in decreasing order of specificity:
 *
 *  1. that customer's own activity clock (usage + cloud sync), which says when
 *     they are actually working;
 *  2. engagement by send hour inside their segment (tool + usage pattern), which
 *     says when this kind of customer replies;
 *  3. global engagement by send hour, as the fallback when the segment is thin.
 *
 * The same evidence sets the cooldown multiplier: audiences that engage below
 * the global rate get spaced out further, so a poorly-performing segment is
 * contacted less rather than at a worse hour.
 */
export function buildTimingProfile(input: {
  activity: ActivityHour[];
  globalHours: Record<number, HourStat>;
  segmentHours?: SegmentHourStats;
  segment?: Segment;
  minSamples?: number;
}): TimingProfile {
  const minSamples = Math.max(5, input.minSamples ?? 20);
  const segment = input.segment ?? { toolId: null, pattern: null };
  const segmentHours = input.segmentHours ?? {};

  const score = new Map<number, number>();
  const bump = (hour: number, value: number) => score.set(hour, (score.get(hour) ?? 0) + value);

  // 1. Own activity clock.
  let usageEvents = 0;
  let syncEvents = 0;
  const weighted: Array<{ hour: number; weight: number }> = [];
  for (const a of input.activity) {
    const usage = a.usageEvents ?? Math.max(0, a.events - (a.syncEvents ?? 0));
    const sync = a.syncEvents ?? 0;
    usageEvents += usage;
    syncEvents += sync;
    weighted.push({ hour: a.hour, weight: usage * USAGE_WEIGHT + sync * SYNC_WEIGHT });
  }
  const weightTotal = weighted.reduce((n, w) => n + w.weight, 0);
  if (weightTotal > 0) for (const w of weighted) bump(w.hour, (w.weight / weightTotal) * 3);

  // 2. Segment engagement by hour.
  const segEntries: Array<{ hour: number; stat: HourStat }> = [];
  for (let hour = 0; hour < 24; hour++) {
    const stat = segmentHours[segmentHourKey(segment, hour)];
    if (stat) segEntries.push({ hour, stat });
  }
  const segTotal = totalStat(segEntries.map((e) => e.stat));
  for (const e of segEntries) {
    if (e.stat.sent < 3) continue;
    bump(e.hour, hourRate(e.stat) * 2);
  }

  // 3. Global engagement by hour.
  const globalEntries = Object.entries(input.globalHours).map(([h, stat]) => ({ hour: Number(h), stat }));
  const globalTotal = totalStat(globalEntries.map((e) => e.stat));
  for (const e of globalEntries) {
    if (e.stat.sent < 5) continue;
    bump(e.hour, hourRate(e.stat));
  }

  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);

  const activityStrength = usageEvents + syncEvents;
  const confidence: TimingConfidence =
    ranked.length === 0
      ? "none"
      : segTotal.sent >= minSamples && activityStrength >= 20
        ? "high"
        : activityStrength >= 10 || segTotal.sent >= Math.ceil(minSamples / 2)
          ? "medium"
          : "low";

  // Tighter window the more we know; with nothing measured, every hour is fine.
  const width = confidence === "high" ? 3 : confidence === "medium" ? 4 : confidence === "low" ? 6 : 24;
  const top = ranked.slice(0, width);
  const window =
    confidence === "none"
      ? Array.from({ length: 24 }, (_, i) => i)
      : [...new Set(top.flatMap((h) => [h, (h + 1) % 24, (h + 23) % 24]))].sort((a, b) => a - b);

  const segmentEngagementRate = engagementRate(segTotal);
  const globalEngagementRate = engagementRate(globalTotal);

  let cooldownMultiplier = 1;
  const reasons: string[] = [];
  if (segTotal.sent >= minSamples && globalTotal.sent >= minSamples) {
    const ratio = segmentEngagementRate / (globalEngagementRate || 1);
    if (ratio < 1) {
      cooldownMultiplier = Math.min(3, 1 / Math.max(0.34, ratio));
      reasons.push("segment engages below average — spacing messages out");
    } else {
      reasons.push("segment engages at or above average — standard spacing");
    }
  }
  if (activityStrength > 0 && activityStrength < 5) {
    cooldownMultiplier = Math.max(cooldownMultiplier, 1.5);
    reasons.push("little measured activity yet");
  }
  cooldownMultiplier = round2(Math.max(1, Math.min(3, cooldownMultiplier)));

  if (syncEvents > 0) reasons.unshift(`${syncEvents} sync events in the activity clock`);
  if (confidence === "none") reasons.unshift("no timing data — any hour allowed");

  return {
    ranked,
    window,
    confidence,
    cooldownMultiplier,
    signals: {
      usageEvents,
      syncEvents,
      segmentSends: segTotal.sent,
      globalSends: globalTotal.sent,
      segmentEngagementRate: round2(segmentEngagementRate),
      globalEngagementRate: round2(globalEngagementRate),
    },
    reason: reasons.join("; ") || "using the customer's activity clock",
  };
}

/** Is `hour` (UTC) inside the profile's allowed window? */
export function isWithinTimingWindow(hour: number, profile: TimingProfile): boolean {
  return profile.window.length === 0 || profile.window.includes(hour);
}

/** Hours until the next allowed send hour, from `hour`. */
export function hoursUntilWindow(hour: number, profile: TimingProfile): number {
  if (isWithinTimingWindow(hour, profile)) return 0;
  for (let d = 1; d <= 24; d++) if (profile.window.includes((hour + d) % 24)) return d;
  return 0;
}
