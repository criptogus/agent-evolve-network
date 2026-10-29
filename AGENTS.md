# Technical decisions

- Pro entitlements use explicit price lookup keys and all matching subscriptions in the current payments environment through `subscription-entitlements.ts` and `auth/pro-subscription.server.ts`; standalone Agent Pass is separate. Why: a paid seat or newest subscription must not grant or hide Pro access.

- `src/integrations/supabase/database.ts` merges hand-written schema contracts (`optional-schema.ts`, `platform-schema.ts`) only for entries missing from the generated `types.ts`; generated entries always win. Why: intersecting duplicate table definitions with different `Relationships` breaks supabase-js embedded-resource type parsing (embedded selects like `packages(slug)` fail to resolve).
