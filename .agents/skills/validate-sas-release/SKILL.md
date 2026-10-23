---
name: validate-sas-release
description: Validate Super Agent Skill changes before publication, using the existing local checks without Lovable generation credits.
---

Run `npm ci` when locked dependencies changed. Run `npm run check:project` from the repository root. This batches tests, types, build, lint regression checking, content validation and both generated-artifact checks. It writes actual exit codes and logs to `artifacts/validation/`; failures block release.

Use `npm run check:project -- --security` with the existing Supabase publishable environment to include RLS and anonymous-access checks. Never expose credentials or weaken allowlists to pass. With a local dev server running, add `--ui` to test signup at mobile and desktop sizes with intercepted auth; review its screenshots personally.

`npm run lint:strict` retains all ESLint errors. The normal lint command permits only the recorded pre-existing explicit-any debt per file; it blocks increases and all other errors. Never increase that baseline to make a change pass. Report outstanding debt explicitly.

Check version-specific trust evidence, query-preserving auth redirects and MCP outcome semantics when those flows change. No model evaluations, signup creation, agent requests, provisioning, paid operations or production writes are part of this batch. Inspect and validate any additive SQL separately. Publish only after checks pass and publication is user-authorized; verify that Lovable's commit matches the validated code before using direct deployment. Preserve approval, signature and evidence gates.
