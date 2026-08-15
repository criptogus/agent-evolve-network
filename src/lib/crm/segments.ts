/**
 * Internal CRM — pure segmentation + cadence rules.
 *
 * No I/O: safe to import from server functions, the cadence runner, MCP tools
 * and the admin UI, so every surface tells the customer the same story.
 * All customer-facing copy in this file is English-only by product rule.
 */
import { GUARDRAILS } from "@/lib/crm/guardrails";



export type CrmCustomerRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  handle: string | null;
  signed_up_at: string;
  last_sign_in_at: string | null;
  plan_slug: string | null;
  sub_status: string | null;
  price_cents: number | null;
  sub_environment: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  mcp_token_count: number;
  mcp_last_used_at: string | null;
  mcp_call_count: number;
  mcp_last_call_at: string | null;
  review_count: number;
  last_review_at: string | null;
  upload_count: number;
  agent_count: number;
  diagnosis_count: number;
  residency_count: number;
  cloud_skill_count: number;
  install_count: number;
  package_count: number;
  credits_spent: number;
  executions_30d: number;
  last_active_at: string;
  stage: string;
  crm_unsubscribed: boolean;
  last_email_at: string | null;
  emails_sent_7d: number;
};

export type CrmStage =
  | "new"
  | "connected"
  | "activated"
  | "power"
  | "paying"
  | "at_risk"
  | "dormant";

export const STAGE_LABELS: Record<CrmStage, string> = {
  new: "New (not connected)",
  connected: "Connected (no value yet)",
  activated: "Activated",
  power: "Power user",
  paying: "Paying",
  at_risk: "At risk",
  dormant: "Dormant",
};

const DAY = 86_400_000;

export function daysSince(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (Date.now() - t) / DAY;
}

export function isPaying(row: CrmCustomerRow): boolean {
  return row.sub_status === "active" || row.sub_status === "trialing";
}

/** Anything the customer did that produced value on the platform. */
export function valueActionCount(row: CrmCustomerRow): number {
  return (
    row.review_count +
    row.upload_count +
    row.agent_count +
    row.diagnosis_count +
    row.residency_count +
    row.install_count +
    row.package_count
  );
}

export function classifyStage(row: CrmCustomerRow): CrmStage {
  const idle = daysSince(row.last_active_at);
  const actions = valueActionCount(row);
  const connected = row.mcp_token_count > 0 || row.mcp_call_count > 0;

  if (idle >= 30 && actions > 0) return "dormant";
  if (idle >= 14 && actions > 0) return "at_risk";
  if (isPaying(row)) return "paying";
  if (actions >= 10 || row.executions_30d >= 50) return "power";
  if (actions >= 1) return "activated";
  if (connected) return "connected";
  return "new";
}

export type Opportunity = {
  id: string;
  title: string;
  why: string;
  cta: string;
  href: string;
};

/** Unused capabilities, ordered by how much value they unlock next. */
export function opportunities(row: CrmCustomerRow): Opportunity[] {
  const out: Opportunity[] = [];
  const connected = row.mcp_token_count > 0 || row.mcp_call_count > 0;

  if (!connected)
    out.push({
      id: "connect",
      title: "Connect your agent to SAK",
      why: "One line of config gives your agent review, diagnosis and install tools.",
      cta: "Connect in 2 minutes",
      href: "/welcome",
    });
  if (row.review_count === 0)
    out.push({
      id: "review",
      title: "Review your first skill",
      why: "Get a Trust Score with format, substance and injection-resistance evidence.",
      cta: "Review a skill",
      href: "/skillforge",
    });
  if (row.diagnosis_count === 0)
    out.push({
      id: "diagnose",
      title: "Diagnose your agent",
      why: "Find the bottleneck that makes runs fail before you rewrite prompts.",
      cta: "Run a diagnosis",
      href: "/diagnose",
    });
  if (row.install_count === 0)
    out.push({
      id: "install",
      title: "Install a verified skill",
      why: "Tested capabilities beat hand-written prompts on success rate and cost.",
      cta: "Browse the marketplace",
      href: "/marketplace",
    });
  if (row.agent_count === 0)
    out.push({
      id: "agent",
      title: "Build a ready-to-run agent",
      why: "Soul + skills + playbooks + guardrails, generated and pre-checked.",
      cta: "Open the Agent Factory",
      href: "/agents/new",
    });
  if (row.residency_count === 0)
    out.push({
      id: "residency",
      title: "Send an agent through residency",
      why: "Adversarial training rounds with a signed credential at the end.",
      cta: "Start residency",
      href: "/curriculum",
    });
  if (row.package_count === 0)
    out.push({
      id: "publish",
      title: "Publish a skill and earn",
      why: "Verified authors get installs, telemetry and revenue share.",
      cta: "Publish a skill",
      href: "/upload",
    });
  if (!isPaying(row) && row.cloud_skill_count === 0 && row.review_count + row.upload_count >= 2)
    out.push({
      id: "cloud_library",
      title: "Store your skills privately and use them everywhere",
      why: "A private cloud library that syncs into Hermes, Claude Code, Codex, Cursor, Lovable and OpenClaw — same skills, every tool.",
      cta: "See the cloud library",
      href: "/account/cloud-skills",
    });
  if (!isPaying(row) && row.review_count >= 3)
    out.push({
      id: "pro",
      title: "Upgrade to Pro",
      why: "Batch reviews, the Agent Store and unlimited residency rounds.",
      cta: "See Pro",
      href: "/pricing",
    });
  return out;
}

export type TriggerId =
  | "welcome_connect"
  | "connect_nudge"
  | "first_value_proof"
  | "value_digest"
  | "opportunity_nudge"
  | "pro_upsell"
  | "cloud_library_upsell"
  | "at_risk"
  | "win_back"
  | "pro_value_recap";

export type TriggerDef = {
  id: TriggerId;
  label: string;
  /** Minimum days between two sends of this same trigger. */
  cooldownDays: number;
  /** Maximum lifetime sends of this trigger per customer. */
  maxSends: number;
  /** Stages this trigger applies to. */
  stages: CrmStage[];
  description: string;
};

export const TRIGGERS: Record<TriggerId, TriggerDef> = {
  welcome_connect: {
    id: "welcome_connect",
    label: "Welcome + connect",
    cooldownDays: 9999,
    maxSends: 1,
    stages: ["new"],
    description: "Sent once, right after signup, with the connect instructions.",
  },
  connect_nudge: {
    id: "connect_nudge",
    label: "Connect nudge",
    cooldownDays: 5,
    maxSends: 2,
    stages: ["new"],
    description: "Signed up 2+ days ago and still has no agent connected.",
  },
  first_value_proof: {
    id: "first_value_proof",
    label: "First value proof",
    cooldownDays: 9999,
    maxSends: 1,
    stages: ["connected", "activated", "power", "paying"],
    description: "First real action happened — show the measured outcome in money and hours.",
  },
  value_digest: {
    id: "value_digest",
    label: "Weekly value digest",
    cooldownDays: 7,
    maxSends: 9999,
    stages: ["activated", "power", "paying"],
    description: "Weekly recap of usage, realized ROI and what to try next.",
  },
  opportunity_nudge: {
    id: "opportunity_nudge",
    label: "Unused capability",
    cooldownDays: 10,
    maxSends: 6,
    stages: ["connected", "activated", "paying"],
    description: "Highlights the highest-value capability the customer has never used.",
  },
  pro_upsell: {
    id: "pro_upsell",
    label: "Pro upsell",
    cooldownDays: 14,
    maxSends: 3,
    stages: ["activated", "power"],
    description: "Enough usage to justify Pro, framed against their own numbers.",
  },
  cloud_library_upsell: {
    id: "cloud_library_upsell",
    label: "Cloud library upsell",
    cooldownDays: 12,
    maxSends: 2,
    stages: ["activated", "power"],
    description:
      "Has skills worth keeping but no paid plan — private cloud library + sync into every agent tool.",
  },
  at_risk: {
    id: "at_risk",
    label: "At risk",
    cooldownDays: 10,
    maxSends: 3,
    stages: ["at_risk"],
    description: "Was active, nothing for 14+ days.",
  },
  win_back: {
    id: "win_back",
    label: "Win-back",
    cooldownDays: 30,
    maxSends: 2,
    stages: ["dormant"],
    description: "Dormant for 30+ days — one concrete reason to come back.",
  },
  pro_value_recap: {
    id: "pro_value_recap",
    label: "Pro value recap",
    cooldownDays: 28,
    maxSends: 9999,
    stages: ["paying"],
    description: "Monthly proof that the subscription paid for itself.",
  },
};

/**
 * Global cadence caps. Single source of truth lives in the autonomy guardrails —
 * the learning loop is not allowed to widen them.
 */
export const CADENCE = {
  maxEmailsPer7Days: GUARDRAILS.maxEmailsPer7Days,
  minHoursBetweenEmails: GUARDRAILS.minHoursBetweenEmails,
};


export type SentSummary = {
  /** lifetime count per trigger */
  counts: Record<string, number>;
  /** last sent ISO per trigger */
  lastAt: Record<string, string>;
  /** emails sent in the last 7 days (any trigger) */
  last7d: number;
  /** most recent email of any trigger */
  lastAnyAt: string | null;
};

export type TriggerDecision =
  | { send: true; trigger: TriggerId }
  | { send: false; reason: string };

/**
 * Every trigger that passes the hard constraints right now, in deterministic
 * rule order. `cooldownMultiplier` comes from the fatigue backoff (1 = normal).
 */
export function eligibleTriggers(
  row: CrmCustomerRow,
  sent: SentSummary,
  cooldownMultiplier = 1,
): { blocked?: string; triggers: TriggerId[] } {
  if (row.crm_unsubscribed) return { blocked: "unsubscribed", triggers: [] };
  if (!row.email) return { blocked: "no email", triggers: [] };
  if (sent.last7d >= CADENCE.maxEmailsPer7Days) return { blocked: "weekly cap", triggers: [] };
  if (sent.lastAnyAt && daysSince(sent.lastAnyAt) * 24 < CADENCE.minHoursBetweenEmails)
    return { blocked: "min gap", triggers: [] };

  const stage = classifyStage(row);
  const age = daysSince(row.signed_up_at);
  const connected = row.mcp_token_count > 0 || row.mcp_call_count > 0;
  const actions = valueActionCount(row);

  const eligible = (id: TriggerId, extra: boolean): boolean => {
    const def = TRIGGERS[id];
    if (!def.stages.includes(stage)) return false;
    if ((sent.counts[id] ?? 0) >= def.maxSends) return false;
    const last = sent.lastAt[id];
    if (last && daysSince(last) < def.cooldownDays * cooldownMultiplier) return false;
    return extra;
  };

  // Ordered by urgency: onboarding first, then proof, then expansion.
  const order: Array<[TriggerId, boolean]> = [
    ["welcome_connect", !connected && age >= 0.02],
    ["connect_nudge", !connected && age >= 2],
    ["first_value_proof", actions >= 1],
    ["at_risk", true],
    ["win_back", true],
    ["pro_value_recap", isPaying(row)],
    ["pro_upsell", !isPaying(row) && row.review_count >= 3],
    [
      "cloud_library_upsell",
      !isPaying(row) &&
        row.cloud_skill_count === 0 &&
        row.review_count + row.upload_count >= 2 &&
        (row.mcp_token_count > 0 || row.mcp_call_count > 0),
    ],
    ["value_digest", actions >= 1],
    ["opportunity_nudge", opportunities(row).length > 0],
  ];

  return { triggers: order.filter(([id, extra]) => eligible(id, extra)).map(([id]) => id) };
}

/** Deterministic cadence decision for one customer. */
export function decideTrigger(
  row: CrmCustomerRow,
  sent: SentSummary,
  cooldownMultiplier = 1,
): TriggerDecision {
  const { blocked, triggers } = eligibleTriggers(row, sent, cooldownMultiplier);
  if (blocked) return { send: false, reason: blocked };
  const first = triggers[0];
  if (!first) return { send: false, reason: "nothing due" };
  return { send: true, trigger: first };
}
