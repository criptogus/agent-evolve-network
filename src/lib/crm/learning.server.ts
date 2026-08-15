/**
 * CRM learning layer — server side.
 *
 * Loads arm statistics, picks variants, scores outcomes after the attribution
 * window, and runs the weekly self-tuner (pause losers, draft replacements).
 * Uses the admin client so the cron runner and the admin dashboard agree.
 */
import { supabaseAdmin as _admin } from "@/integrations/supabase/client.server";
import {
  VARIANTS,
  OUTCOMES,
  EMPTY_ARM,
  armKey,
  buildTimingProfile,
  isWithinTimingWindow,
  hoursUntilWindow,
  segmentHourKey,
  estimatedRate,
  fatigueMultiplier,
  pickVariant,
  pickVariantForSegment,
  segmentArmKey,
  shouldPauseArm,
  triggerScore,
  type ArmStats,
  type HourStat,
  type OutcomeKind,
  type Segment,
  type SegmentHourStats,
  type TimingProfile,
  type VariantDef,
  type VariantOverride,
} from "@/lib/crm/learning";
import type { TriggerId } from "@/lib/crm/segments";

const admin = _admin as any;

export type LearningSettings = { enabled: boolean; minSamples: number };

export type LearningState = {
  settings: LearningSettings;
  /** arm key -> stats */
  stats: Record<string, ArmStats>;
  /** trigger::variant::tool|pattern -> stats, for the per-segment experiment */
  segmentStats: Record<string, ArmStats>;
  /** trigger -> active arms (built-ins plus approved additions, minus paused) */
  arms: Record<string, VariantDef[]>;
  /** trigger::variant -> copy overrides */
  overrides: Record<string, VariantOverride>;
  hours: Record<number, HourStat>;
  /** `tool|pattern::hour` -> engagement, for per-segment send timing */
  segmentHours: SegmentHourStats;
};

export async function loadSettings(): Promise<LearningSettings> {
  try {
    const { data } = await admin.from("crm_settings").select("value").eq("key", "learning").maybeSingle();
    const v = (data?.value ?? {}) as { enabled?: boolean; min_samples?: number };
    return { enabled: v.enabled !== false, minSamples: Math.max(5, v.min_samples ?? 20) };
  } catch {
    return { enabled: true, minSamples: 20 };
  }
}

/** Everything the cadence engine needs to make a learned decision. */
export async function loadLearningState(): Promise<LearningState> {
  const settings = await loadSettings();
  const stats: Record<string, ArmStats> = {};
  const segmentStats: Record<string, ArmStats> = {};
  const hours: Record<number, HourStat> = {};
  const segmentHours: SegmentHourStats = {};
  const arms: Record<string, VariantDef[]> = {};
  const overrides: Record<string, VariantOverride> = {};

  try {
    const { data } = await admin.rpc("crm_effectiveness", { _days: 120 });
    for (const r of (data ?? []) as any[]) {
      stats[armKey(r.trigger, r.variant)] = {
        sent: Number(r.sent ?? 0),
        opened: Number(r.opened ?? 0),
        clicked: Number(r.clicked ?? 0),
        converted: Number(r.converted ?? 0),
      };
    }
  } catch {
    /* no history yet */
  }

  try {
    const { data } = await admin.rpc("crm_effectiveness_by_segment", { _days: 120 });
    for (const r of (data ?? []) as any[]) {
      const seg: Segment = { toolId: r.tool_id ?? null, pattern: r.usage_pattern ?? null };
      segmentStats[segmentArmKey(r.trigger, r.variant, seg)] = {
        sent: Number(r.sent ?? 0),
        opened: Number(r.opened ?? 0),
        clicked: Number(r.clicked ?? 0),
        converted: Number(r.converted ?? 0),
      };
    }
  } catch {
    /* segmented history is optional */
  }

  try {
    const { data } = await admin.rpc("crm_send_hour_stats", { _days: 120 });
    for (const r of (data ?? []) as any[]) {
      hours[Number(r.send_hour)] = {
        sent: Number(r.sent ?? 0),
        engaged: Number(r.engaged ?? 0),
        converted: Number(r.converted ?? 0),
      };
    }
  } catch {
    /* ignore */
  }

  try {
    const { data } = await admin.rpc("crm_segment_send_hour_stats", { _days: 120 });
    for (const r of (data ?? []) as any[]) {
      const seg: Segment = { toolId: r.tool_id ?? null, pattern: r.usage_pattern ?? null };
      segmentHours[segmentHourKey(seg, Number(r.send_hour))] = {
        sent: Number(r.sent ?? 0),
        engaged: Number(r.engaged ?? 0),
        converted: Number(r.converted ?? 0),
      };
    }
  } catch {
    /* per-segment timing history is optional */
  }

  // Start from the built-in arms, then apply the registry (paused / approved).
  for (const [trigger, defs] of Object.entries(VARIANTS)) arms[trigger] = [...defs];
  try {
    const { data } = await admin
      .from("crm_copy_variants")
      .select("trigger, variant, label, framing, status, subject_override, heading_override, intro_override");
    for (const row of (data ?? []) as any[]) {
      const list = arms[row.trigger] ?? [];
      if (row.status !== "active") {
        arms[row.trigger] = list.filter((a) => a.variant !== row.variant);
        continue;
      }
      if (!list.some((a) => a.variant === row.variant))
        list.push({ variant: row.variant, label: row.label, framing: row.framing });
      arms[row.trigger] = list;
      overrides[armKey(row.trigger, row.variant)] = {
        subject: row.subject_override,
        heading: row.heading_override,
        intro: row.intro_override,
      };
    }
  } catch {
    /* registry optional */
  }

  // Never leave a trigger without an arm.
  for (const [trigger, defs] of Object.entries(VARIANTS))
    if ((arms[trigger] ?? []).length === 0) arms[trigger] = [defs[0]!];

  return { settings, stats, segmentStats, arms, overrides, hours, segmentHours };
}

/**
 * Pick the arm for one send. When the caller knows the personalization segment
 * (agent tool + usage pattern) the draw uses that segment's own posterior pooled
 * with the global arm, so the experiment runs per audience without splitting the
 * data into unusable slices.
 */
export function chooseVariant(
  state: LearningState,
  trigger: TriggerId,
  segment?: Segment,
): { def: VariantDef; override?: VariantOverride; segment: Segment | null } {
  const arms = state.arms[trigger] ?? VARIANTS[trigger];
  const def = !state.settings.enabled
    ? (arms[0] ?? VARIANTS[trigger][0]!)
    : segment
      ? pickVariantForSegment(trigger, arms, state.stats, state.segmentStats ?? {}, segment)
      : pickVariant(trigger, arms, state.stats);
  return { def, override: state.overrides[armKey(trigger, def.variant)], segment: segment ?? null };
}

/** Rank eligible triggers by learned expected value (ties keep rule order). */
export function rankTriggers(state: LearningState, eligible: TriggerId[]): TriggerId[] {
  if (!state.settings.enabled || eligible.length < 2) return eligible;
  return [...eligible]
    .map((t, i) => ({ t, i, s: triggerScore(t, state.stats, state.settings.minSamples) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.t);
}

/** Recent engagement for one customer, used for the fatigue backoff. */
export async function loadFatigue(userId: string): Promise<number> {
  try {
    const { data } = await admin
      .from("crm_message_log")
      .select("id, created_at, crm_message_outcomes(opened_at, clicked_at, converted_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);
    const rows = (data ?? []) as any[];
    let engaged = 0;
    for (const r of rows) {
      const o = Array.isArray(r.crm_message_outcomes) ? r.crm_message_outcomes[0] : r.crm_message_outcomes;
      if (o && (o.opened_at || o.clicked_at || o.converted_at)) engaged += 1;
    }
    return fatigueMultiplier({ messages: rows.length, engaged });
  } catch {
    return 1;
  }
}

/** Measured activity clock for one customer: product usage plus cloud sync work. */
export async function loadActivityHours(
  userId: string,
): Promise<Array<{ hour: number; events: number; usageEvents: number; syncEvents: number }>> {
  try {
    const { data } = await admin.rpc("crm_activity_hours", { _user_id: userId, _days: 90 });
    return ((data ?? []) as any[]).map((r) => ({
      hour: Number(r.hour),
      events: Number(r.events ?? 0),
      usageEvents: Number(r.usage_events ?? 0),
      syncEvents: Number(r.sync_events ?? 0),
    }));
  } catch {
    // Older deployments only have the usage-only clock.
    try {
      const { data } = await admin.rpc("crm_active_hours", { _user_id: userId });
      return ((data ?? []) as any[]).map((r) => ({
        hour: Number(r.hour),
        events: Number(r.events ?? 0),
        usageEvents: Number(r.events ?? 0),
        syncEvents: 0,
      }));
    } catch {
      return [];
    }
  }
}

const NEUTRAL_TIMING: TimingProfile = {
  ranked: [],
  window: [],
  confidence: "none",
  cooldownMultiplier: 1,
  signals: {
    usageEvents: 0,
    syncEvents: 0,
    segmentSends: 0,
    globalSends: 0,
    segmentEngagementRate: 0,
    globalEngagementRate: 0,
  },
  reason: "learning disabled — no timing adjustment",
};

/**
 * Timing decision for one customer: which UTC hours to use and how much to
 * stretch the cooldown, from their own activity (usage + sync) and how their
 * segment engages by hour.
 */
export async function loadTimingProfile(
  userId: string,
  state: LearningState,
  segment?: Segment,
): Promise<TimingProfile> {
  if (!state.settings.enabled) return NEUTRAL_TIMING;
  return buildTimingProfile({
    activity: await loadActivityHours(userId),
    globalHours: state.hours,
    segmentHours: state.segmentHours,
    segment,
    minSamples: state.settings.minSamples,
  });
}

/** Is now inside the customer's learned send window? */
export function isSendHourNow(profile: TimingProfile): boolean {
  return isWithinTimingWindow(new Date().getUTCHours(), profile);
}

/** How many hours until the next allowed send hour. */
export function hoursUntilSendWindow(profile: TimingProfile): number {
  return hoursUntilWindow(new Date().getUTCHours(), profile);
}

/** Legacy entry point kept for callers that do not know the segment. */
export async function isGoodSendHour(userId: string, state: LearningState): Promise<boolean> {
  if (!state.settings.enabled) return true;
  return isSendHourNow(await loadTimingProfile(userId, state));
}

/* ---------------------------------------------------------- outcome scoring  */

const TABLES: Record<OutcomeKind, Array<{ table: string; col: string }>> = {
  connected: [{ table: "mcp_call_log", col: "user_id" }],
  review: [{ table: "package_evaluations", col: "triggered_by" }],
  install_or_review: [
    { table: "package_evaluations", col: "triggered_by" },
    { table: "package_installs", col: "user_id" },
  ],
  subscription: [],
  residency_or_agent: [
    { table: "agent_residencies", col: "user_id" },
    { table: "agent_builds", col: "user_id" },
  ],
  any_value_action: [
    { table: "mcp_call_log", col: "user_id" },
    { table: "package_evaluations", col: "triggered_by" },
    { table: "package_installs", col: "user_id" },
    { table: "agent_builds", col: "user_id" },
    { table: "agent_diagnoses", col: "user_id" },
    { table: "agent_residencies", col: "user_id" },
    { table: "skill_executions", col: "user_id" },
  ],
};

async function happened(
  kind: OutcomeKind,
  userId: string,
  fromIso: string,
  toIso: string,
): Promise<boolean> {
  if (kind === "subscription") {
    const { data } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .limit(1);
    return (data ?? []).length > 0;
  }
  for (const { table, col } of TABLES[kind]) {
    try {
      const { data } = await admin
        .from(table)
        .select("id")
        .eq(col, userId)
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .limit(1);
      if ((data ?? []).length > 0) return true;
    } catch {
      /* table may not carry created_at in some environments */
    }
  }
  return false;
}

export type ScoreRunResult = { checked: number; converted: number; closed: number };

/**
 * Hourly scorer: for every message whose attribution window has passed, decide
 * whether the intended outcome happened and close the row.
 */
export async function scoreOutcomes(limit = 500): Promise<ScoreRunResult> {
  const out: ScoreRunResult = { checked: 0, converted: 0, closed: 0 };
  const { data } = await admin
    .from("crm_message_log")
    .select("id, user_id, trigger, variant, send_hour, created_at")
    .gte("created_at", new Date(Date.now() - 45 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as any[];
  if (rows.length === 0) return out;

  const { data: existing } = await admin
    .from("crm_message_outcomes")
    .select("message_log_id, window_closed")
    .in(
      "message_log_id",
      rows.map((r) => r.id),
    );
  const closed = new Set(
    ((existing ?? []) as any[]).filter((o) => o.window_closed).map((o) => o.message_log_id),
  );

  for (const row of rows) {
    if (closed.has(row.id)) continue;
    const def = OUTCOMES[row.trigger as TriggerId];
    if (!def) continue;
    const sentAt = new Date(row.created_at).getTime();
    const windowEnd = sentAt + def.windowHours * 3_600_000;
    const done = Date.now() >= windowEnd;
    out.checked += 1;

    const converted = await happened(
      def.kind,
      row.user_id,
      new Date(sentAt).toISOString(),
      new Date(Math.min(windowEnd, Date.now())).toISOString(),
    );

    const patch: Record<string, unknown> = {
      message_log_id: row.id,
      user_id: row.user_id,
      trigger: row.trigger,
      variant: row.variant ?? "v1",
      send_hour: row.send_hour ?? null,
      scored_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (converted) {
      patch["converted_at"] = new Date().toISOString();
      patch["conversion_kind"] = def.kind;
      out.converted += 1;
    }
    if (done || converted) {
      patch["window_closed"] = true;
      out.closed += 1;
    }
    await admin.from("crm_message_outcomes").upsert(patch, { onConflict: "message_log_id" });
  }
  return out;
}

/* ------------------------------------------------------------------- tuner   */

export type TuneResult = {
  paused: Array<{ trigger: string; variant: string; reason: string }>;
  drafted: Array<{ trigger: string; variant: string }>;
  activated: Array<{ trigger: string; variant: string }>;
  blocked: Array<{ trigger: string; variant: string; reason: string }>;
  leaders: Array<{ trigger: string; variant: string; rate: number; sent: number }>;
};


async function draftReplacement(
  trigger: string,
  leader: { variant: string; label: string },
  reason: string,
): Promise<{ variant: string; label: string; subject: string; heading: string; intro: string } | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  const outcome = OUTCOMES[trigger as TriggerId];
  try {
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway");
    const { generateText, Output } = await import("ai");
    const { z } = await import("zod");
    const gateway = createLovableAiGatewayProvider(key);
    const { output } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      output: Output.object({
        schema: z.object({ label: z.string(), subject: z.string(), heading: z.string(), intro: z.string() }),
      }),
      prompt: [
        "You write B2B lifecycle email copy for SuperAgent Skill, a platform that measures whether agent skills work and reports the result in dollars and engineer-hours.",
        `Trigger: ${trigger}. Intended outcome: ${outcome?.label ?? "customer takes the next action"}.`,
        `The current best-performing framing is "${leader.label}". A previous variant was paused because it ${reason}.`,
        "Write ONE new alternative framing. English only. No emojis, no invented metrics, no promises of guaranteed results.",
        "Keep subject under 70 characters, heading under 60 characters, intro one sentence under 200 characters.",
      ].join("\n"),
    });
    if (!output) return null;
    return {
      variant: `ai-${Date.now().toString(36)}`,
      label: String(output.label).slice(0, 60),
      subject: String(output.subject).slice(0, 120),
      heading: String(output.heading).slice(0, 100),
      intro: String(output.intro).slice(0, 300),
    };
  } catch {
    return null;
  }
}

/**
 * Autonomous self-tuner: recompute stats, pause statistically losing arms and
 * publish self-written replacements — no human approval. Every change has to
 * pass the guardrails in `@/lib/crm/guardrails`; whatever fails is quarantined
 * and logged instead of going live.
 */
export async function runTuner(opts: { dryRun?: boolean } = {}): Promise<TuneResult> {
  const state = await loadLearningState();
  const result: TuneResult = { paused: [], drafted: [], activated: [], blocked: [], leaders: [] };
  if (!state.settings.enabled) return result;

  const { GUARDRAILS, canActivate, canPause, checkCopy } = await import("@/lib/crm/guardrails");
  let activations = 0;

  for (const [trigger, defs] of Object.entries(state.arms)) {
    if (defs.length < 2) continue;
    let activeCount = defs.length;
    let pausesThisRun = 0;
    const scored = defs.map((d) => ({
      def: d,
      stats: state.stats[armKey(trigger, d.variant)] ?? EMPTY_ARM,
    }));
    const leader = scored.reduce((a, b) => (estimatedRate(b.stats) > estimatedRate(a.stats) ? b : a));
    result.leaders.push({
      trigger,
      variant: leader.def.variant,
      rate: Number(estimatedRate(leader.stats).toFixed(4)),
      sent: leader.stats.sent,
    });

    for (const arm of scored) {
      if (arm.def.variant === leader.def.variant) continue;
      const verdict = shouldPauseArm(arm.stats, leader.stats, state.settings.minSamples);
      if (!verdict.pause) continue;

      const pauseGate = canPause(activeCount, pausesThisRun);
      if (!pauseGate.ok) {
        result.blocked.push({ trigger, variant: arm.def.variant, reason: pauseGate.violations.join("; ") });
        if (!opts.dryRun)
          await admin.from("crm_tuning_log").insert({
            action: "guardrail_blocked_pause",
            trigger,
            variant: arm.def.variant,
            reason: pauseGate.violations.join("; "),
            stats: {},
          });
        continue;
      }

      result.paused.push({ trigger, variant: arm.def.variant, reason: verdict.reason });
      if (opts.dryRun) continue;
      pausesThisRun += 1;
      activeCount -= 1;

      await admin.from("crm_copy_variants").upsert(
        {
          trigger,
          variant: arm.def.variant,
          label: arm.def.label,
          framing: arm.def.framing,
          status: "paused",
          origin: "builtin",
          notes: verdict.reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trigger,variant" },
      );
      await admin.from("crm_tuning_log").insert({
        action: "pause_variant",
        trigger,
        variant: arm.def.variant,
        reason: verdict.reason,
        stats: { arm: arm.stats, leader: leader.stats },
      });

      const draft = await draftReplacement(trigger, leader.def, verdict.reason);
      if (!draft) continue;
      result.drafted.push({ trigger, variant: draft.variant });

      const copyGate = checkCopy(draft);
      const slotGate = canActivate(activeCount, leader.stats.sent);
      const overRun = activations >= GUARDRAILS.maxAutoActivationsPerRun;
      const violations = [
        ...copyGate.violations,
        ...slotGate.violations,
        ...(overRun ? [`already published ${GUARDRAILS.maxAutoActivationsPerRun} new variants in this run`] : []),
      ];
      const live = violations.length === 0;

      await admin.from("crm_copy_variants").insert({
        trigger,
        variant: draft.variant,
        label: draft.label,
        framing: "capability",
        status: live ? "active" : "quarantined",
        subject_override: draft.subject,
        heading_override: draft.heading,
        intro_override: draft.intro,
        origin: "ai",
        notes: live
          ? `Published automatically to replace ${arm.def.variant}`
          : `Quarantined by guardrails: ${violations.join("; ")}`,
      });

      if (live) {
        activations += 1;
        activeCount += 1;
        result.activated.push({ trigger, variant: draft.variant });
        await admin.from("crm_tuning_log").insert({
          action: "activate_variant",
          trigger,
          variant: draft.variant,
          reason: `Passed all guardrails and replaced ${arm.def.variant}`,
          stats: {},
        });
      } else {
        result.blocked.push({ trigger, variant: draft.variant, reason: violations.join("; ") });
        await admin.from("crm_tuning_log").insert({
          action: "guardrail_quarantined_variant",
          trigger,
          variant: draft.variant,
          reason: violations.join("; "),
          stats: {},
        });
      }
    }
  }
  return result;

}
