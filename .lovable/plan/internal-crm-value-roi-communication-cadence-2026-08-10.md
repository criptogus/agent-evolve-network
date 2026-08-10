# Internal CRM + value/ROI communication cadence

Goal: one place where you see every person using SAK, what they actually used, the ROI that usage produced, and what they are leaving on the table — plus an automatic email cadence (always in English) that tells each customer that same story.

## 1. Customer 360 (admin)

New page `/admin/crm` (admin-only, same gate as the other admin pages), with:

- **Segments rail** with live counts: New (signed up, never connected), Connected (MCP linked, no review yet), Activated (≥1 review/diagnosis), Power user (≥10 actions/30d), At risk (was active, silent 14d+), Churn risk paying, Free with Pro-level usage, Paying.
- **Customer table**: name/email, plan, signup date, last seen, connected clients, reviews, uploads, agents built, diagnoses, cloud skills, credits spent, MRR, realized ROI ($/mo), lifecycle stage, last email sent, next scheduled email.
- **Customer drawer**: usage timeline, score-evolution per document (before → after), realized ROI table (the same outcome metrics we publish: task success, injection resistance, hallucination, tokens, latency, cost/1k, PII), **unused-capability list** ("never ran a diagnosis", "no residency", "no agent built") with the projected ROI of each, full email history, and a "Send now" button per template.
- **Cadence health**: emails sent/opened-window per template, failures, suppressions, unsubscribes (deduplicated by `message_id`, as required for email logs).

## 2. ROI engine (reuse what exists)

Realized ROI comes from existing data — no new metric invented:
- `review_history` before/after scores → existing `buildValueProof` (already gives $/month, engineer-hours, rescued runs).
- `get_workspace_roi`, `get_skill_uplift`, `skill_executions`, `package_installs`, `agent_builds`, `agent_diagnoses`, `credit_ledger`, `subscriptions`.
- Opportunity ROI (what they haven't used) comes from `projectImpact` against the capabilities they never touched.

One shared snapshot builder is used by the admin page, the emails, the in-app card and MCP, so all four always show the same numbers.

## 3. Communication cadence (English only)

Automatic, evaluated hourly, cap of **2 emails per week per customer** (transactional/auth emails don't count), suppression + unsubscribe respected.

| Trigger | Email |
| --- | --- |
| Day 0 signup | Welcome + the one command to connect |
| Day 2, not connected | "Your agent is still unprotected" + 3-line install |
| Connected, no review in 48h | "Review your first skill" + what the report shows |
| First review done | Value proof: before → after, $ saved, human report |
| Weekly, if any usage | Weekly ROI digest: what you ran, what it saved, one unused capability |
| 14 days silent after activity | Win-back with their own best realized number |
| Free account with Pro-level usage | Upgrade nudge with their own ROI vs $19/mo |
| Renewal in 7 days (yearly) | Year-in-review ROI recap |

Every email ends with the concrete next action and a one-click unsubscribe. All copy is written in English.

## 4. In-app mirror

- `/home` gets a **"Your value so far"** card: realized ROI, score movement, and the top unused capability with its projected gain, matching the current email.
- MCP `resume_session` gains a `value_summary` block so the piloting agent can state the ROI to the human without a separate call.

## Technical notes

- **Migration**: `crm_lifecycle_state` (user_id, stage, first_seen, last_active_at, last_email_at, emails_sent_7d, unsubscribed_crm) and `crm_message_log` (user_id, template, trigger, message_id, roi_snapshot jsonb, created_at). Both with GRANTs (`service_role` full, `authenticated` select-own where relevant) and RLS; segment/aggregate reads for the admin page go through security-definer SQL functions, never broad `anon` policies.
- **Snapshot builder**: `src/lib/crm/snapshot.server.ts` (usage + realized ROI + opportunities), consumed by `src/lib/crm/crm.functions.ts` (admin, `requireAdmin`) and by the cadence runner.
- **Cadence runner**: `src/routes/api/public/crm/run.ts`, called hourly by `pg_cron` + `pg_net` with the `apikey` header; it selects due customers, enforces the 2/week cap and suppression, then enqueues through the existing `enqueue_email` queue so the current worker, retry and DLQ logic is reused.
- **Templates**: new React Email templates under `src/lib/email-templates/` (`crm-welcome`, `crm-connect-nudge`, `crm-first-review`, `crm-value-proof`, `crm-weekly-roi`, `crm-winback`, `crm-upgrade`, `crm-year-in-review`) registered in `registry.ts` with preview data, using the existing `_brand.ts` styling.
- **Unsubscribe**: reuses `email_unsubscribe_tokens` and the existing `/email/unsubscribe` route, with a CRM-only opt-out that never blocks auth/transactional mail.
- Admin email stats deduplicate `email_send_log` by `message_id` (latest row wins).
