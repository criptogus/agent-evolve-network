---
name: validate-sas-release
description: Validate Super Agent Skill changes before publication, using the existing local checks without Lovable generation credits.
---

Run `npm ci` when locked dependencies changed. Run `npm run check:project` from the repository root. This batches tests, types, dependency audit, build, strict lint, content validation and both generated-artifact checks. It writes actual exit codes and logs to `artifacts/validation/`; failures block release.

Use `npm run check:project -- --security` with the existing Supabase publishable environment to include RLS and anonymous-access checks. Never expose credentials or weaken allowlists to pass. With a local dev server running, add `--ui` to test signup at mobile and desktop sizes with intercepted auth; review its screenshots personally.

`npm run lint` and `npm run lint:strict` both block every ESLint error, including every explicit `any`. No baseline exceptions are permitted. Validate the SDK with `npm run check:types:sdk` as well. Use generated database contracts and validated JSON boundaries; never replace removed types with unchecked assertions or inferred `any`.

Check version-specific trust evidence, query-preserving auth redirects and MCP outcome semantics when those flows change. No model evaluations, signup creation, agent requests, provisioning, paid operations or production writes are part of this batch. Inspect and validate any additive SQL separately. Publish only after checks pass and publication is user-authorized; verify that Lovable's commit matches the validated code before using direct deployment. Preserve approval, signature and evidence gates.

After the version bot updates the repository, rerun the code/artifact checks on that commit. The version generator must format TypeScript with the repository Prettier settings; a bot-generated formatting error blocks publication just like a handwritten one.
