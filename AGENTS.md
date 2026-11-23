# Technical decisions

- Pro entitlements use explicit price lookup keys and all matching subscriptions in the current payments environment through `subscription-entitlements.ts` and `auth/pro-subscription.server.ts`; standalone Agent Pass is separate. Why: a paid seat or newest subscription must not grant or hide Pro access.

- `src/integrations/supabase/database.ts` merges hand-written schema contracts (`optional-schema.ts`, `platform-schema.ts`) only for entries missing from the generated `types.ts`; generated entries always win. Why: intersecting duplicate table definitions with different `Relationships` breaks supabase-js embedded-resource type parsing (embedded selects like `packages(slug)` fail to resolve).

- Scheduled callbacks under `/api/public/*` authenticate with the managed cron secret via `authenticateCronRequest` (`integrations/supabase/cron-auth.ts`), never with publishable/anon keys. Why: the publishable key ships to every browser.
- Public catalog surfaces read classification from `packages.vertical` (DB-synced from the latest version's rules) and never select `package_versions` content for non-owners. Why: version rules/prompts are author/purchaser-only data.
