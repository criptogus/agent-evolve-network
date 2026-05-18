
-- Function to audit RLS coverage across all public tables
-- Returns one row per table that is missing RLS or has RLS without any policies
CREATE OR REPLACE FUNCTION public.check_rls_coverage()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count integer,
  issue text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.relname::text AS table_name,
    c.relrowsecurity AS rls_enabled,
    COALESCE((SELECT count(*)::int FROM pg_policies p
              WHERE p.schemaname = 'public' AND p.tablename = c.relname), 0) AS policy_count,
    CASE
      WHEN NOT c.relrowsecurity THEN 'RLS_DISABLED'
      WHEN COALESCE((SELECT count(*) FROM pg_policies p
                     WHERE p.schemaname = 'public' AND p.tablename = c.relname), 0) = 0
        THEN 'NO_POLICIES'
      ELSE 'OK'
    END AS issue
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
  ORDER BY c.relname;
$$;

-- Allow anyone (anon + authenticated) to call this read-only audit function.
-- It returns only schema metadata, no row data.
GRANT EXECUTE ON FUNCTION public.check_rls_coverage() TO anon, authenticated;
