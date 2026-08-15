/**
 * CRM copy — turns a snapshot + trigger into English-only, value-first message
 * content. Pure module: the email template, the admin preview and the in-app
 * mirror all render the same words and the same numbers.
 */
import type { CrmSnapshot } from "@/lib/crm/types";
import type { TriggerId } from "@/lib/crm/segments";
import { PATTERN_LABELS, patternHook, personalizedBullets } from "@/lib/crm/tool-profile";

export type CrmMetric = { label: string; value: string; note?: string };

export type CrmMessage = {
  trigger: TriggerId;
  subject: string;
  preheader: string;
  heading: string;
  intro: string[];
  metrics: CrmMetric[];
  bullets: string[];
  ctaLabel: string;
  ctaPath: string;
  footnote?: string;
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const num = (n: number) => Math.round(n).toLocaleString("en-US");

function roiMetrics(s: CrmSnapshot): CrmMetric[] {
  const m: CrmMetric[] = [];
  if (s.roi.improved_docs > 0) {
    m.push({
      label: "Avoidable spend removed",
      value: `${usd(s.roi.monthly_usd_saved)}/month`,
      note: `${usd(s.roi.annual_usd_saved)}/year at 10,000 runs per month`,
    });
    m.push({
      label: "Runs that no longer need a human",
      value: `${num(s.roi.rescued_runs_per_month)}/month`,
      note: `about ${num(s.roi.engineer_hours_saved_per_month)} engineer-hours`,
    });
    m.push({ label: "Trust Score points gained", value: `+${num(s.roi.points_gained)}` });
  }
  if (s.roi.headroom_monthly_usd > 0)
    m.push({
      label: "Still on the table",
      value: `${usd(s.roi.headroom_monthly_usd)}/month`,
      note: "if every reviewed document reached grade A",
    });
  return m;
}

function usageMetrics(s: CrmSnapshot): CrmMetric[] {
  const u = s.usage;
  const out: CrmMetric[] = [];
  if (u.reviews) out.push({ label: "Skill reviews", value: num(u.reviews) });
  if (u.diagnoses) out.push({ label: "Agent diagnoses", value: num(u.diagnoses) });
  if (u.agents) out.push({ label: "Agents built", value: num(u.agents) });
  if (u.installs) out.push({ label: "Skills installed", value: num(u.installs) });
  if (u.residencies) out.push({ label: "Residencies", value: num(u.residencies) });
  if (u.published) out.push({ label: "Skills published", value: num(u.published) });
  if (u.executions_30d)
    out.push({ label: "Executions (30 days)", value: num(u.executions_30d) });
  return out;
}

function nextSteps(s: CrmSnapshot, max = 3): string[] {
  return s.opportunities.slice(0, max).map((o) => `${o.title} — ${o.why}`);
}

export function buildMessage(trigger: TriggerId, s: CrmSnapshot): CrmMessage {
  const toolSuffix = s.tool.id ? ` in ${s.tool.label}` : "";
  const first = s.opportunities[0];
  const best = s.roi.best;

  switch (trigger) {
    case "welcome_connect":
      return {
        trigger,
        subject: "Connect your agent to SuperAgent Skill (2 minutes)",
        preheader: "One line of config unlocks review, diagnosis and verified installs.",
        heading: `Welcome, ${s.name}`,
        intro: [
          "SuperAgent Skill measures whether your agent's instructions actually work — then tells you, in dollars and engineer-hours, what fixing them is worth.",
          "Everything starts with connecting your agent. It takes about two minutes and works with Claude Code, Cursor, VS Code, Codex and any MCP client.",
        ],
        metrics: [
          { label: "Typical DIY skill", value: "46% task success" },
          { label: "Grade-A verified skill", value: "93% task success" },
        ],
        bullets: [
          "Review any skill, playbook or soul and get a Trust Score with evidence",
          "Diagnose your agent to find the real bottleneck before rewriting prompts",
          "Install verified capabilities instead of hand-writing prompts",
        ],
        ctaLabel: "Connect my agent",
        ctaPath: "/welcome",
      };

    case "connect_nudge":
      return {
        trigger,
        subject: "Your SAK account is idle — one line of config fixes that",
        preheader: "Paste one config block and your agent gets review and diagnosis tools.",
        heading: "You are one config block away",
        intro: [
          `You created your account ${Math.round(s.usage.days_since_signup)} days ago but no agent is connected yet, so nothing is being measured.`,
          "The setup page gives you a copy-paste block per client and validates the connection live.",
        ],
        metrics: [{ label: "Setup time", value: "about 2 minutes" }],
        bullets: [
          "Copy the config for your client",
          "Ask your agent to call whoami to confirm the connection",
          "Ask it to review your main skill file — you get a Trust Score in seconds",
        ],
        ctaLabel: "Open setup",
        ctaPath: "/welcome",
      };

    case "first_value_proof":
      return {
        trigger,
        subject: best
          ? `Your first measured win: ${best.grade_before} → ${best.grade_after}`
          : "Your first measured result on SuperAgent Skill",
        preheader: "Here is what your first run is worth in money and engineer-hours.",
        heading: "Proof, not vibes",
        intro: [
          best
            ? `${best.name} moved from grade ${best.grade_before} (${best.before}) to ${best.grade_after} (${best.after}).`
            : "You ran your first measured action on SAK. Here is the value it produced.",
          "These numbers are projected from the public SAK benchmark using your own scores, at 10,000 runs per month.",
        ],
        metrics: [...roiMetrics(s), ...usageMetrics(s)].slice(0, 5),
        bullets: nextSteps(s),
        ctaLabel: "See my dashboard",
        ctaPath: "/home",
        footnote: "Projection based on your measured scores, not a guarantee.",
      };

    case "value_digest":
      return {
        trigger,
        subject: s.roi.monthly_usd_saved
          ? `Your week on SAK: ${usd(s.roi.monthly_usd_saved)}/month of avoidable spend removed`
          : "Your week on SuperAgent Skill",
        preheader: "Usage, realized ROI and the highest-value thing to do next.",
        heading: `Weekly recap for ${s.name}`,
        intro: [
          "Here is what your agents did on SAK and what it was worth.",
          ...(s.roi.headroom_monthly_usd
            ? [
                `There is still about ${usd(s.roi.headroom_monthly_usd)}/month of headroom if every reviewed document reached grade A.`,
              ]
            : []),
        ],
        metrics: [...usageMetrics(s), ...roiMetrics(s)].slice(0, 6),
        bullets: nextSteps(s),
        ctaLabel: "Open my dashboard",
        ctaPath: "/home",
        footnote: "Projections use the public SAK benchmark at 10,000 runs per month.",
      };

    case "opportunity_nudge":
      return {
        trigger,
        subject: first ? `Unused on your account: ${first.title}` : "One capability you have not used yet",
        preheader: first?.why ?? "There is value sitting unused in your account.",
        heading: first?.title ?? "One thing worth 10 minutes",
        intro: [
          first?.why ?? "You have capabilities on your plan you have never used.",
          "Most customers see the biggest jump on the second capability they try, not the first.",
        ],
        metrics: roiMetrics(s).slice(0, 3),
        bullets: nextSteps(s),
        ctaLabel: first?.cta ?? "Explore SAK",
        ctaPath: first?.href ?? "/home",
      };

    case "pro_upsell":
      return {
        trigger,
        subject: s.roi.headroom_monthly_usd
          ? `Pro pays for itself ${Math.max(1, Math.round(s.roi.headroom_monthly_usd / 19))}x on your current usage`
          : "Pro, priced against your own numbers",
        preheader: "Batch reviews, the Agent Store and unlimited residency rounds.",
        heading: "You are already past the break-even point",
        intro: [
          `You have run ${num(s.usage.reviews)} reviews. Pro is $19/month (or $140/year) and removes the limits you are hitting.`,
          ...(s.roi.headroom_monthly_usd
            ? [
                `Your own numbers show about ${usd(s.roi.headroom_monthly_usd)}/month of avoidable spend still in your skills.`,
              ]
            : []),
        ],
        metrics: [
          { label: "Pro monthly", value: "$19/month" },
          { label: "Pro yearly", value: "$140/year", note: "auto-renews at the same discounted rate" },
          ...roiMetrics(s).slice(0, 2),
        ],
        bullets: [
          "Batch review a whole repository of skills in one call",
          "Agent Store: ready-to-run agents with soul, skills, playbooks and guardrails",
          "Unlimited residency rounds and signed credentials",
        ],
        ctaLabel: "See Pro",
        ctaPath: "/pricing",
      };

    case "cloud_library_upsell": {
      const tool = s.tool;
      const others = s.tools.filter((t) => t.id !== tool.id).map((t) => t.label);
      return {
        trigger,
        subject: tool.id
          ? `Your skills do not follow you into ${tool.label} yet`
          : "Your skills only live in one repo — that is the expensive part",
        preheader: tool.id
          ? `A private library that syncs straight into ${tool.label}.`
          : "A private library that syncs into every agent tool you use.",
        heading: tool.id ? `One library, and ${tool.label} reads it` : "One library, every agent tool",
        intro: [
          patternHook(s.pattern, tool),
          tool.pain,
          others.length
            ? `You also connect from ${others.join(" and ")} — the same library lands there in the same call.`
            : "The Cloud Skill Manager keeps them in a library that is private to your account and writes them wherever your agent runs.",
        ],
        metrics: [
          ...(tool.id
            ? [{ label: `Where they land in ${tool.label}`, value: tool.path }]
            : [{ label: "Agent tools supported", value: "15" }]),
          { label: "How you use SAK", value: PATTERN_LABELS[s.pattern] },
          { label: "Pro", value: "$19/month", note: "or $140/year" },
          ...roiMetrics(s).slice(0, 1),
        ],
        bullets: personalizedBullets(s.pattern, tool),
        ctaLabel: tool.id ? `Sync my library into ${tool.label}` : "See the cloud library",
        ctaPath: "/account/cloud-skills",
      };
    }

    case "at_risk":
      return {
        trigger,
        subject: "Your agents stopped reporting to SAK",
        preheader: "Two weeks without a measured run — here is the fastest way back.",
        heading: "Nothing measured in two weeks",
        intro: [
          `Your last activity was about ${Math.round(s.usage.days_idle)} days ago. When runs stop reporting, drift goes unnoticed and regressions ship silently.`,
          ...(best
            ? [`Your best result so far: ${best.name} at grade ${best.grade_after} (${best.after}).`]
            : []),
        ],
        metrics: roiMetrics(s).slice(0, 3),
        bullets: [
          "Ask your agent to call resume_session — it returns your workspace and next actions",
          "Re-review your main skill to check for drift against the current judge",
          ...nextSteps(s, 1),
        ],
        ctaLabel: "Resume where I left off",
        ctaPath: "/home",
      };

    case "win_back":
      return {
        trigger,
        subject: "What changed on SAK since you left",
        preheader: "New verified skills, cheaper reviews and one-call session resume.",
        heading: `One concrete reason to come back, ${s.name}`,
        intro: [
          "The registry, the judge and the Agent Factory all moved since your last run.",
          "If you reconnect, resume_session rebuilds your context in one call — nothing to set up again.",
        ],
        metrics: [
          { label: "Grade-A skill success rate", value: "93%" },
          { label: "Typical DIY skill", value: "46%" },
        ],
        bullets: [
          "Verified skills with published Trust Scores and injection resistance",
          "Agent Factory: a ready-to-run agent in one prompt",
          "Residency: adversarial training with a signed credential",
        ],
        ctaLabel: "Reconnect my agent",
        ctaPath: "/welcome",
      };

    case "pro_value_recap":
      return {
        trigger,
        subject: s.roi.monthly_usd_saved
          ? `Your Pro month: ${usd(s.roi.monthly_usd_saved)}/month removed from avoidable spend`
          : "Your Pro month on SuperAgent Skill",
        preheader: "What your subscription produced this month, in money and hours.",
        heading: "Your subscription, in numbers",
        intro: [
          "This is the monthly proof you can forward to whoever approves the invoice.",
          ...(s.roi.improved_docs
            ? [`${num(s.roi.improved_docs)} document(s) improved and re-measured this period.`]
            : ["No measured improvement this period — the fastest fix is one review run."]),
        ],
        metrics: [...roiMetrics(s), ...usageMetrics(s)].slice(0, 6),
        bullets: nextSteps(s),
        ctaLabel: "Open my dashboard",
        ctaPath: "/home",
        footnote: "Projections use the public SAK benchmark at 10,000 runs per month.",
      };
  }
}
