# Lovable database findings — 2026-11-23

The scanner grouped 21 definer RPCs, four unpinned email RPCs and an unconditional plans policy into three findings. Database catalogue inspection reproduced all three categories before changes.

- 24 internal RPCs (CRM including tracking, email queues, OAuth token operations, idempotency, pack/review projections) now grant execution only to service_role. Their existing callers use the server client. The same restriction covers write counterparts of flagged reads.
- The four pgmq wrappers pin an empty search_path; their pgmq references were already schema-qualified.
- search_packages, get_review_eligibility and agent_onboarding_funnel use SECURITY INVOKER. Their callers retain public catalogue, own-user and admin-only table policies respectively.
- Plans public reads permit only the existing public slugs free/pro/enterprise/unlimited. An authenticated user can still read an assigned internal plan. Admin listing is separately authenticated; public serialization omits provider IDs. New public slugs require deliberate publication in this policy.
- Public review projections exclude hidden reviews and unpublished packages; public pack projections exclude unpublished children.

Four transactional SECURITY DEFINER RPCs intentionally remain authenticated-only:
claim_referral binds the beneficiary to auth.uid(), prevents self/referral reuse and returns only the claim result; purchase_pack and purchase_package bind the buyer to auth.uid(), require an approved published item and perform atomic credit accounting; team_action requires membership/role, checks invite email against auth.jwt(), protects ownership and independent review. Changing these to invoker would require granting clients protected ledger/team writes. Scanner exceptions must be scoped to these exact functions and justified by their guards, not blanket suppression.

Validation: scripts/test-security-boundaries.sql executes anonymous, ordinary-user and service-role probes in a rolled-back transaction. scripts/check-rpc-security.ts runs the read-only five-verdict catalogue check in CI alongside the existing RLS and table-exposure checks. Empty, missing or malformed reports fail with exit 2; regressions exit 1.

No database size, plan, prices, balances or subscription assignments are changed by this migration.
