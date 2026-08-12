# Strategic plan: turn skill creators into the growth engine

## Goal
Move the platform from a "tool subscription" model to a **creator-owned marketplace economy**. The primary lever is retention & activation of skill creators, with the hardest drop-off being users who see value but do not pay. The long-term bet is that creators who earn money from their skills will supply higher-quality capabilities, which attracts more end users, which drives more Pro conversions, which pays creators more.

## Current state (verified)
- Creators can author, evaluate and publish skills via `/forge` and get a Trust Score.
- The marketplace ranks by popularity first, Trust Score second, with a niche-penalty for stack-specific skills.
- The CRM already segments creators by lifecycle stage and can nudge them toward publishing and Pro.
- Value-proof reports translate score improvements into dollars and engineer-hours for end users.
- Pro is priced at `$19/mo` or `$140/yr` and unlocks batch reviews, the Agent Store and SAK University.
- There is no visible revenue-share or creator-payout mechanism tying creator earnings to platform usage.

## Strategic initiatives

### 1. Creator monetization (revenue share)
Introduce a transparent creator economy so publishing skills becomes a revenue activity, not just a distribution activity.

- **Pro attribution**: when a user upgrades to Pro within 30 days of installing or reviewing a creator's skill, attribute a share of that subscription to the creator.
- **Pack purchases**: existing `pack_purchases` and `package_purchases` tables can be extended with a `creator_royalty_cents` column and a monthly payout accrual.
- **Payout ledger**: new `creator_earnings` table tracking per-skill accrued earnings, paid/unpaid status, and Stripe Connect / manual payout records.
- **Minimum thresholds**: e.g. `$25` minimum payout, 30-day holding period to reduce refunds/chargebacks.

### 2. Creator analytics dashboard
Build a `/creator/dashboard` (or `/creator`) route that shows each publisher:

- Installs, reviews, executions and Trust Score evolution per skill.
- Estimated revenue, attributed Pro conversions, and pack sales.
- Which skills drive the most value (outcome proof) for end users.
- Benchmarks against top creators in the same vertical.

This addresses activation by making the value creators generate visible in money and distribution, not just abstract scores.

### 3. Outcome-based marketplace ranking
Evolve the marketplace from "most installed" to "most value delivered".

- Add an `outcome_score` derived from real execution outcomes, review deltas, and value-proof reports.
- Blend `outcome_score` with popularity and Trust Score so high-quality, high-impact skills surface even if they are niche.
- Show "verified outcome" badges on skill cards (e.g. "saved avg $X/month for teams").

This helps end users find skills that actually work, which increases installs and Pro conversion.

### 4. Creator success program (SAK University for publishers)
Turn the existing residency/university infrastructure toward creator education.

- Tracks: "Build your first skill", "Get to Trust Score A", "Monetize your expertise", "Build an agent team".
- Credentials: verified creator badges and "Top earner" status.
- Office hours / async feedback: the existing feedback-request system can be expanded into a mentor queue.

### 5. Team/collaboration for creators
Allow creators to collaborate on skills, agents and playbooks.

- Organizations / teams with shared revenue splits.
- Co-authoring on packages.
- Private team registries (enterprise bridge).

This expands the addressable audience from individual creators to agencies and internal platform teams.

## What we will NOT do in this phase
- Add new social features (follows, comments) — low activation impact.
- Lower Pro price — the drop-off is value perception, not price.
- Build a custom payment processor — use Stripe Connect for payouts.

## Success metrics
- **Creator activation**: % of published creators who return within 14 days.
- **Creator monetization**: number of creators with >$0 accrued earnings; median monthly creator earnings.
- **Pro conversion attributed to skills**: % of Pro upgrades with a skill install/review in the previous 30 days.
- **Marketplace quality**: average Trust Score of top 50 skills; % of installs from skills with outcome badges.

## Suggested first implementation slice
1. Schema: `creator_earnings` table and `creator_payouts` table with RLS/grants.
2. Server function: `attributeProConversion` to record earnings when a Pro subscription starts.
3. Route: `/creator/dashboard` with earnings, installs and Trust Score charts.
4. Marketplace: add outcome badge to `PackageCard` and an `outcome_score` column to ranking.
5. CRM trigger: `creator_first_earning` to notify creators when they have accrued their first dollar.

## Technical notes
- Use `createServerFn` for attribution logic; keep payout reads under `requireSupabaseAuth`.
- Use Stripe Connect for payouts; do not store bank details in the database.
- Ensure all new public tables follow the GRANT/RLS/policy pattern.
- Keep all user-facing copy English-only per project rule.
