# Activation and evidence release — 2026-10-23

Publication does not imply evaluation or signing. Homepage and README claims now describe available tooling. The catalog distinguishes no evaluation evidence, insufficient evidence, a measured low score and a verified score. The trust page shows signing metadata and recent adversarial runs for the exact latest version, separately from aggregate usage/score data. Signature metadata is not presented as independent cryptographic verification.

Signup preserves backend weak-password protection, explains it beside the field, permits retry and supports showing/hiding the password. Both login and signup accept only local return paths, preserving OAuth queries. Email signup acceptance is not described as confirmed email activation in the admin report.

MCP v2 emits attempted/succeeded/failed/unknown outcomes. HTTP errors, JSON-RPC errors, isError and existing JSON-encoded application errors do not count as success. Bounded inspection of a cloned JSON/SSE response never consumes the client stream; large, malformed or timed-out output is unknown. Historical mcp_first_call/write rows retain their meaning and are labeled legacy. The additive event constraint migration preserves every existing event and all access policies. Telemetry calls are best-effort and deadline-bound. Quota policy is unchanged.

## Repeatable checks

`npm run check:project` batches the existing tests, TypeScript, build, ESLint regression gate, content schema validation and generated mirrors/plugin checks. Add `--security` with existing publishable Supabase environment variables for the RLS/public-access probes; add `--ui` with a running local dev server for intercepted-auth desktop/mobile checks. Receipts live in ignored `artifacts/validation/`. Empty/incomplete batches fail. See `.agents/skills/validate-sas-release/SKILL.md`.

The old lint had 11,965 errors: formatting dominated, with 612 existing explicit-any uses. Formatting and other blocking rules were repaired. Those 612 type-debt instances are **not fixed**: `lint` reports them against the frozen original per-file counts in `security/lint-legacy-any.json`, blocks increases and blocks every other error. `lint:strict` retains the original ESLint command and still fails on this debt. Do not increase the baseline. React development/export warnings remain advisory. This adds a practical regression gate to CI, which previously ran only tests; it is not a claim that all typing debt is gone.

## Prepublication evidence

- Local automated tests: 190 passed; TypeScript and production build pass.
- Content: 118 local packages and 10 test-case files validate; 23 pre-existing heuristic warnings require human judgment, not automatic exemption.
- Both generated artifact checks pass after regeneration.
- Local browser checks at 390px and 1440px: password toggle, inline rejection, successful mocked retry, OAuth return query preserved and no horizontal overflow. No real signup/email was created.
- Live read-only security probes: 85 tables; RLS coverage and anonymous-read allowlist pass. Five policy-free tables are the existing deliberate deny-all exceptions.
- SQL migration tested on the live schema in a transaction with rollback. Outcome-event constraint remained unchanged after rollback. Apply the additive migration before enabling v2 telemetry.
- Jev advisory review used minimal public copy/implementation summaries. It confirmed the copy distinguishes evidence availability and that legacy lint debt must not be described as fixed. Detailed local receipts retained outside the repository.

No paid Lovable agent, model evaluation, signing operation, provisioning or generated evidence was invoked. Local auth tests do not establish live OAuth provider, email-delivery or paid-checkout success. Public MCP must be checked again after release; a 403 from the audit environment alone does not establish the cause.

## Dependency audit

The first CI audit exposed 8 vulnerable packages (6 critical, 1 high, 1 moderate). Update the patched TanStack Start line without bypassing Vite peer constraints, plus DOMPurify and launch-editor patches in the lockfile. The dependency audit now blocks high/critical vulnerabilities in CI and is included in the repeatable local batch. A clean report is a release prerequisite; do not interpret the former advisory job as approval to publish.

Patched dependency receipts: TanStack Start 1.168.60 (Vite 7 compatible), start-server-core 1.169.39, DOMPurify 3.4.17 and launch-editor 2.14.2. Both npm and Bun lockfiles synchronized; frozen Bun lock validation passed. npm audit reports zero vulnerabilities after these updates. Updated router error handling for unknown errors and the current pending navigation state.
