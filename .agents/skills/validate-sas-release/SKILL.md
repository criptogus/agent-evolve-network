---
name: validate-sas-release
description: Validate Super Agent Skill changes before publication, using the existing local checks without Lovable generation credits.
---

Run `npm ci` when locked dependencies changed. Run `npm run check:project` from the repository root. This batches tests, types, dependency audit, build, strict lint, content validation and both generated-artifact checks. It writes actual exit codes and logs to `artifacts/validation/`; failures block release.

Use `npm run check:project -- --security` with the existing Supabase publishable environment to include RLS and anonymous-access checks. Never expose credentials or weaken allowlists to pass. With a local dev server running, add `--ui` to test signup at mobile and desktop sizes with intercepted auth; review its screenshots personally.

`npm run lint` and `npm run lint:strict` both block every ESLint error, including every explicit `any`. No baseline exceptions are permitted. Validate the SDK with `npm run check:types:sdk` as well. Use generated database contracts and validated JSON boundaries; never replace removed types with unchecked assertions or inferred `any`.

Check version-specific trust evidence, query-preserving auth redirects and MCP outcome semantics when those flows change. No model evaluations, signup creation, agent requests, provisioning, paid operations or production writes are part of this batch. Inspect and validate any additive SQL separately. Publish only after checks pass and publication is user-authorized; verify that Lovable's commit matches the validated code before using direct deployment. Preserve approval, signature and evidence gates.

After the version bot updates the repository, rerun the code/artifact checks on that commit. The version generator must format TypeScript with the repository Prettier settings; a bot-generated formatting error blocks publication just like a handwritten one.

Business expansion changes must also pass `npm run check:business-skills`: the shared source builder checks the 21 skills and four solution playbooks, and the executable helper batch validates inputs, ranges and actual metric values. `--ui` includes the solutions, evidence and team screens with network interception. No UI fixture may call production mutations. Run `scripts/test-business-rls.sql` through the native database integration inside `BEGIN` / `ROLLBACK` after schema changes; retain the real assertion report. Full source imports use `npm run sync:content -- --slugs ... --sql-output /tmp/import.sql`; review and dry-run the generated transaction before applying it. Existing draft versions require explicit `--new-version`; content and archives are never overwritten, and import cannot approve or publish.

For explicitly requested adversarial evaluation without Lovable generation credits, use the finite local batch in `docs/ADVERSARIAL-BUSINESS-EVALUATION.md` and the existing deterministic scorer. Run only an existing cached model with recorded version/runtime fingerprints; retain real outputs and usage. Jev is advisory; primary trace review and the original approval criteria remain authoritative. Never substitute mocks, input-helper success or truncated/error outputs for a passing model run. Record results against the exact immutable registry version/hash, dry-run insertion SQL in rollback, and publish only qualifying versions through the existing approval gate.
