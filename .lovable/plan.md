
# Admin area for AgentForge

A new `/admin` section, reachable only by users with the `admin` role, with all admin tooling. The proprietary skill-author/evaluator/auto-learn pipeline already exists in `src/lib/skills/`; the admin tools wrap and extend it. Real auth, real DB, real Lovable AI Gateway calls — no mocks.

## Surface map

```text
/admin                          Dashboard (counts: users, packages, runs, leads, plans)
/admin/accounts                 List users, see plan, role, lifetime runs; promote/demote, change plan
/admin/plans                    Manage plan tiers (free / pro / enterprise) and per-plan limits
/admin/packages                 List every package across the registry; publish / unpublish / delete
/admin/packages/new             Wizard: create skill | playbook | soul | guardrail
                                Steps: Type → Industry/Tech/Business area → Brief → AI draft → Review → Publish
/admin/import/github            Paste a public GitHub repo URL; system analyses repo, extracts
                                candidate skills/playbooks/.md/.json/.yaml definitions,
                                runs them through the proprietary author+evaluator pipeline,
                                and stages them for review before publishing
/admin/import/markdown          Drag-and-drop one or many `*.md` (skills.md, playbook.md, soul.md, guardrail.md)
                                files; each is parsed, transformed, categorised and queued for review
/admin/requests                 Queue of "missing primitive" requests coming from clients/agents.
                                Admin can approve "auto-create with web research", monitor progress,
                                review the generated package and publish.
```

Client-facing flow that feeds `/admin/requests`: when discover/generate cannot find a primitive that satisfies a query, the client UI POSTs the missing brief to a server function. The pipeline:
1. uses Lovable AI to draft a research plan,
2. calls a web research server function (Perplexity if `PERPLEXITY_API_KEY` is set, otherwise Lovable AI with grounded prompt) to gather state-of-the-art references,
3. feeds the grounded context into `authorPackage` to generate a real package,
4. runs `evaluatePackage` for a fitness score,
5. writes a row in `package_requests` with status `draft_ready`,
6. notifies the client UI when the package is published.

## Database changes (one migration)

- `app_role`: confirm `admin` exists (it does — keep as is).
- New table `plans` — id, slug (`free`|`pro`|`enterprise`), name, monthly_runs_limit, max_installed_packages, price_cents, features jsonb. Public read, admin write.
- New table `account_plans` — user_id (PK), plan_id, status (`active`|`past_due`|`cancelled`), updated_at. RLS: user can read own row; admin can read/write all.
- New table `package_imports` — id, source_kind (`github`|`markdown`|`request`), source_ref (URL or filename), status (`pending`|`analysing`|`drafted`|`published`|`failed`), created_by, generated_package_id (nullable), notes, raw_input text, created_at, updated_at. RLS: admin only.
- New table `package_requests` — id, requester_id (nullable for anon agent calls via MCP), brief text, kind (skill/playbook/soul/guardrail), industry, status (`new`|`researching`|`drafting`|`evaluating`|`draft_ready`|`published`|`rejected`), research_summary text, evaluation jsonb, generated_package_id, created_at, updated_at. RLS: admin read/write all; authenticated user can insert and read own.
- Extend existing `packages` with `source_kind` (`native`|`github`|`markdown`|`request`) and `source_ref` text — both nullable, default `native`. No data migration needed.
- Trigger to bump `updated_at` on the new tables.

The migration tool runs first, before any code. The user must approve it.

## Server functions (`createServerFn`, all under `src/lib/admin/`)

- `requireAdmin` middleware: extends `requireSupabaseAuth`; calls `has_role(uid, 'admin')`; throws 403 otherwise.
- `listAccounts` — paginated users with plan + role, search by email/handle.
- `setUserRole` — promote/demote (admin only).
- `setUserPlan` — change a user's `account_plans` row.
- `listPlans` / `upsertPlan` / `deletePlan`.
- `listAllPackages` / `setPackagePublished` / `deletePackage`.
- `importFromGithub({ repoUrl })` — fetches repo via GitHub REST (`https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1`), filters `*.md`, `skills/**`, `playbooks/**`, `prompts/**`, `*.prompt.*`, `*.json` schema files, downloads each via `https://raw.githubusercontent.com/...`, then for each candidate calls `authorPackage` to refine and `evaluatePackage` to score. Writes a `package_imports` row + a draft `packages`/`package_versions` row not yet published. Returns the staged list.
- `importMarkdown({ files: [{ name, content }] })` — same idea but skipping the GitHub fetch; the admin uploads files in the browser, content is sent to the server fn.
- `enrichPackage(pkgId)` — re-runs the proprietary pipeline (author → evaluator → autolearn) on a draft to upgrade it before publishing.
- `publishStagedPackage(pkgId)` — flips `is_published = true`.
- `requestMissingPrimitive({ brief, kind, industry })` — public-facing fn called from `/discover` and `/generate` when a search returns nothing; inserts a `package_requests` row with status `new`.
- `processRequest(reqId)` — admin-triggered; runs research → author → evaluate, populates `research_summary`, `evaluation`, `generated_package_id`, sets status to `draft_ready`.
- `webResearch({ topic })` — server-only helper. Uses Perplexity if `PERPLEXITY_API_KEY` is configured (asked via `add_secret` only after the admin chooses to enable it); otherwise falls back to Lovable AI `google/gemini-3-flash-preview` with an explicit "cite sources you know to exist" prompt. Returns `{ summary, sources[] }`.

All server fns chain `.middleware([requireSupabaseAuth, requireAdmin])` (except `requestMissingPrimitive`, which only needs auth, and the public read fns).

## UI structure

- `src/routes/_admin.tsx` — pathless guard. `beforeLoad` checks the session via the browser client and the user's role via `listMyRoles` server fn; redirects to `/login` or `/` accordingly.
- All admin pages live under `src/routes/_admin/admin.*.tsx`.
- Reuses existing design tokens (power red / signal lime), Nav, Footer; adds an `<AdminSidebar>` for navigation between the admin sub-pages.
- The wizard (`/admin/packages/new`) is a 5-step controlled component with the same visual language as `/onboarding`.
- The GitHub importer shows a live progress list (one row per candidate file, status: queued → analysing → drafted → failed).
- The Requests queue auto-refreshes via TanStack Query polling every 5s while a request is `researching|drafting|evaluating`.

## Lovable AI usage

All AI calls go through the existing `createLovableAiGatewayProvider` in `src/lib/ai-gateway.ts` with model `google/gemini-3-flash-preview` (default) and `openai/gpt-5.2` for the harder evaluator step. `LOVABLE_API_KEY` is already provisioned.

## Web research — secrets

Web research runs by default with Lovable AI grounding only. If the admin clicks "Enable Perplexity for higher-fidelity research" in `/admin/import/github` or `/admin/requests`, ask the user to add `PERPLEXITY_API_KEY` via the secret tool before proceeding — no premature secret prompts.

## Out of scope for this pass

- Real billing/Stripe integration for plans (UI + DB only).
- Email notifications when a request is fulfilled (queued for a follow-up).
- Org-level multi-tenant accounts (single-user accounts only for now).
- Public MCP endpoint for `requestMissingPrimitive` from external agents (will be a follow-up `/api/public/mcp/request-primitive` route).

## Order of work

1. Run migration (new tables + columns) and wait for approval.
2. Add `requireAdmin` middleware and admin-only server fns.
3. Build `/admin` shell with sidebar + dashboard + accounts + plans + packages list.
4. Build wizard `/admin/packages/new`.
5. Build GitHub importer + Markdown importer.
6. Wire `requestMissingPrimitive` into `/discover` and `/generate` empty-state CTAs.
7. Build `/admin/requests` queue with the research+author+evaluator pipeline.
8. Add a "Make me admin" one-time bootstrap for the project owner if no admin exists yet.

