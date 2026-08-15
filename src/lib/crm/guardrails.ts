/**
 * CRM autonomy guardrails.
 *
 * The CRM runs without human approval. These are the hard limits it may never
 * cross, plus the deterministic checks every self-written copy variant has to
 * pass before it can go live. Anything that fails is quarantined and logged
 * instead of being sent.
 */

export const GUARDRAILS = {
  /** Cadence limits — the learning loop can never widen these. */
  maxEmailsPer7Days: 2,
  minHoursBetweenEmails: 48,
  /** Copy shape limits. */
  maxSubjectChars: 70,
  maxHeadingChars: 60,
  maxIntroChars: 200,
  /** How much the loop may change on its own in a single run. */
  maxAutoPausesPerRun: 3,
  maxAutoActivationsPerRun: 2,
  /** A trigger always keeps at least one and at most this many live variants. */
  minActiveVariantsPerTrigger: 1,
  maxActiveVariantsPerTrigger: 4,
  /** No self-written variant goes live for a trigger with too little evidence. */
  minSentBeforeAutoActivation: 20,
} as const;

/** Plain-language list of what the CRM may and may not do on its own. */
export const AUTONOMY_RULES: Array<{ allowed: boolean; rule: string }> = [
  { allowed: true, rule: "Pick the copy variant and the send hour with the best measured outcome." },
  {
    allowed: true,
    rule:
      "Time messages from each customer's measured activity (product usage and cloud library syncs) and stretch the cooldown up to 3x for segments that engage below average.",
  },
  { allowed: true, rule: "Pause a variant once it is statistically behind the leader." },
  { allowed: true, rule: "Write a replacement variant and publish it when it passes every copy check." },
  { allowed: true, rule: "Rank triggers by measured business value and back off for unengaged customers." },
  { allowed: false, rule: "Send more than 2 emails per customer per 7 days, or closer than 48 hours apart." },
  { allowed: false, rule: "Email a suppressed, unsubscribed or bounced address." },
  { allowed: false, rule: "Publish copy with invented metrics, guarantees, urgency pressure or discounts." },
  { allowed: false, rule: "Publish copy in a language other than English, or with emojis." },
  { allowed: false, rule: "Leave a trigger without a working variant, or run more than 4 live variants." },
  { allowed: false, rule: "Change cadence caps, suppression rules or the unsubscribe footer." },
];

/** Claims and pressure tactics the CRM is not allowed to make on its own. */
const BANNED_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(guarantee[ds]?|guaranteed results|risk[- ]free)\b/i, reason: "promises a guaranteed result" },
  { re: /\b(\d{2,3}\s?%\s?(more|less|faster|cheaper|increase|boost))/i, reason: "invents a performance metric" },
  { re: /\b(\d+x)\s+(faster|better|more|cheaper)\b/i, reason: "invents a multiplier claim" },
  { re: /\b(act now|last chance|final warning|hurry|expires? (today|tonight)|only \d+ (spots|hours) left)\b/i, reason: "uses urgency pressure" },
  { re: /\b(free money|no strings|cash back|\d+\s?% off|discount code|coupon)\b/i, reason: "offers pricing terms the CRM cannot authorise" },
  { re: /\b(refund|chargeback|invoice|credit card|password|api key|token)\b/i, reason: "touches billing or credential topics" },
  { re: /\b(you must|you have to|failure to (act|respond)|legal action)\b/i, reason: "uses coercive language" },
  { re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, reason: "contains emojis" },
  { re: /\b(garantia|clique aqui|voc[êe]|gr[áa]tis|obrigado|aqui est[áa])\b/i, reason: "is not written in English" },
  { re: /\{\{|\}\}|\[insert|TODO|lorem ipsum/i, reason: "contains unfilled placeholders" },
];

export type CopyCandidate = {
  label: string;
  subject: string;
  heading: string;
  intro: string;
};

export type GuardrailVerdict = { ok: boolean; violations: string[] };

/** Deterministic gate for self-written copy. No model in the loop. */
export function checkCopy(candidate: CopyCandidate): GuardrailVerdict {
  const violations: string[] = [];
  const { label, subject, heading, intro } = candidate;

  if (!label.trim() || !subject.trim() || !heading.trim() || !intro.trim())
    violations.push("is missing a label, subject, heading or intro");
  if (subject.length > GUARDRAILS.maxSubjectChars)
    violations.push(`subject is longer than ${GUARDRAILS.maxSubjectChars} characters`);
  if (heading.length > GUARDRAILS.maxHeadingChars)
    violations.push(`heading is longer than ${GUARDRAILS.maxHeadingChars} characters`);
  if (intro.length > GUARDRAILS.maxIntroChars)
    violations.push(`intro is longer than ${GUARDRAILS.maxIntroChars} characters`);
  if (subject === subject.toUpperCase() && subject.replace(/[^A-Z]/g, "").length > 6)
    violations.push("subject shouts in all caps");
  if ((subject.match(/!/g) ?? []).length > 0) violations.push("subject uses exclamation marks");

  const blob = `${label}\n${subject}\n${heading}\n${intro}`;
  for (const { re, reason } of BANNED_PATTERNS) if (re.test(blob)) violations.push(reason);

  // Non-ASCII beyond normal punctuation is a strong signal of another language.
  if (/[À-ÿ]/.test(blob)) violations.push("contains non-English characters");

  return { ok: violations.length === 0, violations };
}

/** Can this trigger accept one more live variant right now? */
export function canActivate(activeCount: number, leaderSent: number): GuardrailVerdict {
  const violations: string[] = [];
  if (activeCount >= GUARDRAILS.maxActiveVariantsPerTrigger)
    violations.push(`trigger already runs ${GUARDRAILS.maxActiveVariantsPerTrigger} live variants`);
  if (leaderSent < GUARDRAILS.minSentBeforeAutoActivation)
    violations.push(
      `only ${leaderSent} sends measured, ${GUARDRAILS.minSentBeforeAutoActivation} required before publishing new copy`,
    );
  return { ok: violations.length === 0, violations };
}

/** Can this variant be paused without leaving the trigger empty or over-churning? */
export function canPause(activeCount: number, pausesThisRun: number): GuardrailVerdict {
  const violations: string[] = [];
  if (activeCount - 1 < GUARDRAILS.minActiveVariantsPerTrigger)
    violations.push("pausing it would leave the trigger without a working variant");
  if (pausesThisRun >= GUARDRAILS.maxAutoPausesPerRun)
    violations.push(`already paused ${GUARDRAILS.maxAutoPausesPerRun} variants in this run`);
  return { ok: violations.length === 0, violations };
}
