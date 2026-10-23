# Type safety release validation

The 612 explicit `any` violations recorded by the prior release have been removed. `scripts/lint.mjs` now blocks every ESLint error and writes an aggregate receipt. The per-file allowance file was deleted; ESLint rules remain unchanged. TypeScript now enables `noImplicitAny` as well as `strict`. The generated TanStack router file retains its existing generator-owned exclusions and is unchanged.

Database clients use the generated database contract. `optional-schema.ts` describes the optional feature tables from the committed migrations named in that file; these types do not provision those tables. Read-only inspection through the native Lovable database integration confirmed the corrected live column names: `packages.author_id`, `package_upload_jobs.finished_at`, `mcp_oauth_tokens.token_hash`, and `skill_executions.version` / `error_kind` / required `package_id`.

The exposed contract mismatches were corrected, including package search-vector serialization, version tags coming from the package, comparison runs from `package_metrics_daily`, and tip/fork ownership. Telemetry now uses one authoritative, rate-limited `report_skill_execution` RPC instead of an invalid direct insert followed by a second write.

JSON boundaries validate persisted agent content, email queue messages, auth email fields, and MCP envelopes. Reauthentication requires its token without requiring an unused confirmation URL. Stripe keeps the existing gateway API version; a mocked transport test verifies its version and authentication headers without making a network call. Signature tests cover invalid signatures, stale or nonnumeric timestamps, and malformed envelopes.

Run the reusable batch from the repository root:

```sh
npm run check:project -- --ui --security
```

The security checks use the existing Supabase publishable environment. The UI check requires a local dev server on port 8080 and intercepts auth requests. No real signup, email, charge, model generation, or Lovable agent request is part of validation.

Actual local evidence:

- 198 tests pass, including eight new boundary/regression tests.
- Application and SDK TypeScript checks pass.
- Strict ESLint reports zero errors and zero explicit-any violations across 636 files; existing development warnings remain advisory.
- Production build and dependency audit pass.
- Content, skills mirror, and Agent Plugin artifact checks pass.
- RLS and anonymous-access probes pass across 85 public tables, preserving existing allowlists.
- Signup checks pass at 390px and 1440px; screenshots were visually reviewed.

The batch writes logs, exact exit codes and aggregate results to `artifacts/validation/`. Jev's advisory review is retained there separately; deterministic checks and code inspection decide release readiness. Publication must use the validated Git commit after CI passes and source synchronization is confirmed.
