# Technical decisions

- `src/integrations/supabase/database.ts` merges hand-written schema contracts (`optional-schema.ts`, `platform-schema.ts`) only for entries missing from the generated `types.ts`; generated entries always win. Why: intersecting duplicate table definitions with different `Relationships` breaks supabase-js embedded-resource type parsing (embedded selects like `packages(slug)` fail to resolve).
