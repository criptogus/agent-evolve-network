# Self-learning CRM: right message, right time, measured effect

Today the CRM decides with fixed rules (stage + cooldown + weekly cap), sends one template, and logs the send. Nothing measures whether a message worked, so the system can't get better. This plan adds three layers on top of the existing engine: **measurement**, **timing intelligence**, and a **learning loop** that reweights triggers, copy variants and send hours automatically.

## 1. Measure every contact

Each CRM email becomes a tracked experiment with a clear success definition.

- Open tracking: 1x1 pixel endpoint `/api/public/crm/o/:token`.
- Click tracking: CTA links go through `/api/public/crm/c/:token` and 302 to the real page.
- Conversion tracking: each trigger declares the **intended outcome** (e.g. `connect_nudge` -> first MCP call; `pro_upsell` -> checkout started/paid; `at_risk` -> any value action; `value_digest` -> a review or install). A scorer runs hourly and marks each message `converted` when the outcome happens inside the trigger's attribution window (72h default, 7d for upsell).
- Negative signals recorded too: unsubscribe, suppression, spam complaint, zero engagement.
- Every message row stores: trigger, copy variant, send hour (customer local), stage at send, ROI snapshot, and the resulting outcome.

## 2. Right time, per customer

- Compute each customer's **active hours profile** from their own event history (MCP calls, executions, sign-ins) and prefer sending in their most active 2-hour window, converted to their inferred timezone.
- Skip windows with historically bad results for that trigger.
- Fatigue guard beyond the fixed cap: if the last 2 messages got zero engagement, back off the cadence for that customer (double the cooldown) until they engage again; restore on any engagement.
- Event-driven sends instead of hourly polling for the moments that matter most (first review finished, first agent build, subscription started, first failed upload) so proof arrives while the customer is still in the tool.

## 3. Learn and evolve

- Each trigger gets 2-3 **copy variants** (different framing: ROI money, risk, capability). Variant selection uses a Thompson-sampling bandit over observed conversion rates, with a floor of exploration so new variants get traffic.
- Trigger priority is no longer a hard-coded list: candidate triggers are scored by `expected value = P(conversion | trigger, stage, variant) x business weight`, and the engine sends the top candidate. The rules stay as constraints (stage eligibility, caps, cooldowns).
- Weekly **self-tuning job**: recomputes per-trigger/per-variant/per-hour statistics, promotes winners, pauses variants that lose with statistical confidence (min sample size before any change), and writes a short changelog entry so every automatic change is auditable and reversible.
- Low-volume safety: while a trigger has too little data, it falls back to today's deterministic order — the system never gets worse than the current behavior.

## 4. New copy generation (optional evolution step)

When a variant is paused as a loser, the tuner asks Lovable AI to draft a replacement variant from the winning variant's structure plus the trigger's outcome definition. Drafts land in the admin CRM as **pending** and only enter the bandit after you approve them — no unreviewed copy is ever sent. All copy stays English-only.

## 5. Visibility at /admin/crm

New "Effectiveness" tab:
- Funnel per trigger: sent -> opened -> clicked -> converted, with revenue/ROI attributed.
- Variant leaderboard with confidence and current bandit weight.
- Best send hours heatmap.
- Auto-tuning changelog (what the system changed and why) plus a pause switch for the whole learning loop.
- Pending AI-drafted variants with approve/reject.

## Technical notes

- New tables: `crm_message_outcomes` (engagement + conversion per message, unique per message id), `crm_variant_stats` (trigger/variant/hour aggregates), `crm_copy_variants` (variant registry with status: active/paused/pending), `crm_tuning_log`. All in `public` with GRANTs, RLS on, admin-only read via `has_role`, writes only through security-definer functions / service role.
- Tracking endpoints live under `src/routes/api/public/crm/` (token-scoped, no PII in URLs, pixel returns a 1x1 GIF, click endpoint validates the destination is an internal path).
- `src/lib/crm/copy.ts` gains a variant map; `segments.ts` keeps the pure constraint logic and gains scoring hooks; new `src/lib/crm/learning.server.ts` holds the bandit, outcome scorer and tuner.
- `src/lib/crm/mailer.server.ts` records the chosen variant, rewrites CTA/pixel URLs, and honors the per-customer send window.
- Two extra pg_cron schedules hitting existing-style public routes: outcome scorer (hourly) and self-tuner (weekly). Existing hourly cadence runner stays.
- Cadence caps stay exactly as agreed: max 2 emails per customer per 7 days, minimum 48h apart.

## Out of scope

- New channels (in-app/SMS/push) — email only for now.
- Changing the ROI math or the Trust Score naming.
