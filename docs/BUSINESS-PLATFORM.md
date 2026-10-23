# Business skill expansion

The expansion provides 21 original candidate skills in six categories: Brazilian operations, agent security, procurement, industrial operations, corporate knowledge and game development. Four dependency-ordered solutions cover month close, supplier selection, secure agent launch and Brazilian reconciliation. Nine additional project profiles rank relevant business packages before unrelated popularity, while preserving trust filters.

## User-facing entry points

- `/solutions`: inputs, dependency order, definition of done, explicit context budget and complete ZIPs locked to approved package versions. Missing approvals or insufficient context budget block download. Execution stays manual.
- `/evidence`: measured task completion, sample counts, Wilson 95% intervals, latency and reported tokens, separated by exact version, model and experiment. Missing outcomes do not become failures or successes. Observational, self-reported telemetry does not establish causation, adversarial certification or monetary cost.
- `/account/teams`: reader/editor/administrator roles, seven-day email-bound single-use invitation links, immutable private skill versions, independent administrator review, approved public package pins and audit events. Invitation links are copied explicitly; no email is sent automatically. Team approval is distinct from public model certification.
- `/admin/curation`: conservative lexical overlap candidates, author/license differences and a downloadable report. Behavioral and licensing review remains human-owned; no automatic merging or deletion.
- MCP `list_solutions` and `compare_task_evidence`: read-only workflow and experiment discovery without generation calls.

## Full source archives

Plugin imports retain every accepted UTF-8 text file: secondary skills, scripts, contracts, examples and reference/template files. Binary files, links, unsafe paths, oversized content and secrets remain rejected by conformance. Archives are immutable, bound to an exact package version, hashed over a deterministic canonical file representation and verified again when downloaded. Original manifest versions are retained. Conformance never substitutes for adversarial evaluation or publishes an imported package.

Seven additive tables and narrowly scoped database functions support this feature. Team mutation authorization lives in PostgreSQL rather than relying on hidden buttons. Invitations store only token hashes. Audit metadata uses an explicit allowlist, omitting email, tokens and file contents. Anonymous archive reads are restricted to free, public, approved current versions; existing version-body access rules are not opened. Switching the live version of a published package requires adversarial evidence for that exact version.

## Repeatable validation and content import

`npm run build:business-skills` rebuilds all 21 YAML definitions and four playbooks from `content/expansion/skills.json` and the solution catalog. Run `npm run build:skills-mirror` and `npm run build:agent-plugin` after content or platform version changes. `npm run check:business-skills` rejects stale content and runs 46 actual helper fixtures, including metric values and invalid ranges. These fixtures validate local inputs/calculations, not model behavior.

`npm run check:project -- --ui --security` batches the project checks. Supply only the existing public Supabase configuration for the security probes and keep a local dev server running for UI tests. UI requests use isolated browser contexts and intercepted auth/server calls; they do not mutate production. Personally review screenshots under `artifacts/validation/`.

Run `scripts/test-business-rls.sql` in a native database transaction surrounded by `BEGIN` and `ROLLBACK`. It uses existing identity IDs for temporary fixtures and leaves no team, invitation, package or user changes. It does not create users, send messages or invoke a model. The 35 assertions exercise actual database permissions, tenants, invitations, review independence, archive visibility and version gates.

`npm run sync:content -- --slugs slug-a,slug-b --sql-output /tmp/import.sql` produces a nonempty, explicit, atomic SQL import and aggregate plan. Validate the generated archive report, execute the transaction with rollback first, then apply through the native database integration. It never calls a model, sets trust scores or publishes content. Collisions fail without overwriting anything. Use explicit `--new-version` only for original, unpublished platform-owned drafts; an existing version remains immutable. Original versions stay available in history.

## Deployment record

The native migration `20261023160000_skills_business_platform.sql` and 25 draft packages were applied on 2026-10-23. The 21 skills subsequently received immutable version `0.1.1` with stricter helper input-type validation; the four solution playbooks retain `0.1.0`. All remain unpublished drafts pending genuine model-specific adversarial evaluation and administrator approval. No model scores, executions or certifications were fabricated. No Lovable agent/generation calls were made. Deterministic helper results do not unlock the public approval gate.
