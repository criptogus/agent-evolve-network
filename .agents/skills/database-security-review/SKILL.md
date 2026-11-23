---
name: database-security-review
description: Investigate Super Agent Skill database security findings, trace RPC callers, validate role boundaries and deploy reviewed fixes.
---

# Database security review

Use repository scripts rather than rebuilding the audit. Read docs/security/20261123-lovable-database-review.md for the current caller boundaries and intentional transactional definers.

- Record exact signatures, live ACLs, search_path and policies behind each scanner finding. A grouped warning is not a count of vulnerable functions.
- Trace service-role versus authenticated callers before revoking grants or changing definer to invoker. Preserve auth.uid() binding in purchases, referrals and team transactions. Never clear findings by weakening RLS.
- Test the migration plus scripts/test-security-boundaries.sql in one rolled-back transaction first. Review SQL before execution; the test creates a temporary transactional fixture and must finish with ROLLBACK.
- Apply only reviewed, authorized migration SQL, then run npm run check:security with backend URL/publishable key from the environment. Reports must be nonempty. Run npm run check:project and PR checks before merge and app deploy.
- Re-run Lovable scans. Classify remaining intentional behavior only with specific guard evidence and tests. Do not ignore a whole group to hide unreviewed functions.
- Verify the exact Git commit in Lovable's tracked branch and confirmed publication plus production health. Do not switch tracked branches, resize the database or change a plan as part of a security fix.
