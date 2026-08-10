/**
 * Server-side CRM mailer + cadence engine.
 *
 * Renders the lifecycle template, respects suppression and the agreed cadence
 * caps (max 2 emails / 7 days, min 48h apart), enqueues through the same
 * `transactional_emails` queue as the rest of the product, and records every
 * send in `crm_message_log` with the ROI snapshot it showed.
 */
import * as React from "react";
import { render } from "@react-email/render";
import { supabaseAdmin as _admin } from "@/integrations/supabase/client.server";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { buildMessage, type CrmMessage } from "@/lib/crm/copy";
import { buildSnapshot, loadCustomerRows } from "@/lib/crm/snapshot.server";
import type { CrmSnapshot } from "@/lib/crm/types";
import {
  classifyStage,
  decideTrigger,
  TRIGGERS,
  type CrmCustomerRow,
  type SentSummary,
  type TriggerId,
} from "@/lib/crm/segments";

const admin = _admin as any;

const SITE_NAME = "SuperAgent Skill";
const SENDER_DOMAIN = "notify.superagentskill.com";
const SITE_URL = "https://superagentskill.com";
const TEMPLATE_NAME = "crm-lifecycle";

function token(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function unsubscribeToken(email: string): Promise<string> {
  const { data } = await admin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", email)
    .maybeSingle();
  if (data?.token && !data.used_at) return data.token as string;
  const fresh = token();
  await admin
    .from("email_unsubscribe_tokens")
    .upsert({ token: fresh, email }, { onConflict: "email", ignoreDuplicates: true });
  const { data: stored } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .maybeSingle();
  return (stored?.token as string) ?? fresh;
}

/** Per-customer history of CRM sends, used for cadence decisions. */
export async function loadSentSummary(userId: string): Promise<SentSummary> {
  const summary: SentSummary = { counts: {}, lastAt: {}, last7d: 0, lastAnyAt: null };
  const { data } = await admin
    .from("crm_message_log")
    .select("trigger, created_at")
    .eq("user_id", userId)
    .eq("channel", "email")
    .order("created_at", { ascending: false })
    .limit(200);
  const cutoff = Date.now() - 7 * 86_400_000;
  for (const row of (data ?? []) as Array<{ trigger: string; created_at: string }>) {
    summary.counts[row.trigger] = (summary.counts[row.trigger] ?? 0) + 1;
    if (!summary.lastAt[row.trigger]) summary.lastAt[row.trigger] = row.created_at;
    if (!summary.lastAnyAt) summary.lastAnyAt = row.created_at;
    if (new Date(row.created_at).getTime() >= cutoff) summary.last7d += 1;
  }
  return summary;
}

export type SendResult =
  | { sent: true; trigger: TriggerId; messageId: string; subject: string }
  | { sent: false; reason: string };

/** Renders + enqueues one CRM email. `force` skips cadence checks (admin "send now"). */
export async function sendCrmEmail(opts: {
  row: CrmCustomerRow;
  trigger: TriggerId;
  snapshot?: CrmSnapshot;
  force?: boolean;
  dryRun?: boolean;
}): Promise<SendResult> {
  const { row, trigger } = opts;
  if (!row.email) return { sent: false, reason: "no email" };
  const email = row.email.toLowerCase();

  const { data: suppressed, error: supErr } = await admin
    .from("suppressed_emails")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (supErr) return { sent: false, reason: "suppression check failed" };
  if (suppressed) return { sent: false, reason: "suppressed" };

  const snapshot = opts.snapshot ?? (await buildSnapshot(row));
  const message: CrmMessage = buildMessage(trigger, snapshot);
  if (opts.dryRun) return { sent: false, reason: `dry-run:${trigger}` };

  const entry = TEMPLATES[TEMPLATE_NAME];
  if (!entry) return { sent: false, reason: "template missing" };

  const templateData = {
    subject: message.subject,
    heading: message.heading,
    preheader: message.preheader,
    intro: message.intro,
    metrics: message.metrics,
    bullets: message.bullets,
    ctaLabel: message.ctaLabel,
    ctaUrl: `${SITE_URL}${message.ctaPath}`,
    footnote: message.footnote,
  };

  const element = React.createElement(entry.component, templateData as any);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  const messageId = `crm-${trigger}-${row.user_id}-${Date.now()}`;
  const unsub = await unsubscribeToken(email);

  await admin.from("email_send_log").insert({
    message_id: messageId,
    template_name: TEMPLATE_NAME,
    recipient_email: email,
    status: "pending",
    metadata: { crm_trigger: trigger, user_id: row.user_id },
  });

  const { error: enqueueError } = await admin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: message.subject,
      html,
      text,
      purpose: "transactional",
      label: `crm-${trigger}`,
      idempotency_key: messageId,
      unsubscribe_token: unsub,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: TEMPLATE_NAME,
      recipient_email: email,
      status: "failed",
      error_message: enqueueError.message,
    });
    return { sent: false, reason: `enqueue failed: ${enqueueError.message}` };
  }

  await admin.from("crm_message_log").insert({
    user_id: row.user_id,
    template: TEMPLATE_NAME,
    trigger,
    channel: "email",
    message_id: messageId,
    recipient_email: email,
    roi_snapshot: {
      stage: snapshot.stage,
      usage: snapshot.usage,
      roi: snapshot.roi,
      subject: message.subject,
    },
  });

  const sent7d = (await loadSentSummary(row.user_id)).last7d;
  await admin.from("crm_lifecycle_state").upsert(
    {
      user_id: row.user_id,
      stage: snapshot.stage,
      last_active_at: row.last_active_at,
      last_email_at: new Date().toISOString(),
      emails_sent_7d: sent7d,
    },
    { onConflict: "user_id" },
  );

  return { sent: true, trigger, messageId, subject: message.subject };
}

export type CadenceRunResult = {
  scanned: number;
  sent: number;
  skipped: number;
  dryRun: boolean;
  details: Array<{ email: string; stage: string; action: string }>;
};

/** Hourly cadence pass over every customer. */
export async function runCadence(opts: {
  dryRun?: boolean;
  limit?: number;
  maxSends?: number;
} = {}): Promise<CadenceRunResult> {
  const dryRun = !!opts.dryRun;
  const maxSends = opts.maxSends ?? 200;
  const rows = await loadCustomerRows(opts.limit ?? 1000, 0);
  const result: CadenceRunResult = { scanned: rows.length, sent: 0, skipped: 0, dryRun, details: [] };

  for (const row of rows) {
    if (result.sent >= maxSends) break;
    const sent = await loadSentSummary(row.user_id);
    const decision = decideTrigger(row, sent);
    const redacted = row.email ? `${row.email[0]}***@${row.email.split("@")[1] ?? ""}` : "***";

    if (!decision.send) {
      result.skipped += 1;
      // Keep the lifecycle stage fresh even when we stay silent.
      await admin.from("crm_lifecycle_state").upsert(
        {
          user_id: row.user_id,
          stage: classifyStage(row),
          last_active_at: row.last_active_at,
          emails_sent_7d: sent.last7d,
        },
        { onConflict: "user_id" },
      );
      continue;
    }

    const snapshot = await buildSnapshot(row);
    const out = await sendCrmEmail({ row, trigger: decision.trigger, snapshot, dryRun });
    if (out.sent) result.sent += 1;
    else result.skipped += 1;
    result.details.push({
      email: redacted,
      stage: snapshot.stage,
      action: out.sent ? `sent ${out.trigger} (${TRIGGERS[out.trigger].label})` : out.reason,
    });
  }
  return result;
}
