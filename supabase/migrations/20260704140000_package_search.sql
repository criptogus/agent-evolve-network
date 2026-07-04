-- Server-side full-text search for the public package registry.
-- Adds a generated tsvector column + GIN index on packages, and an RPC
-- `search_packages` that returns ranked, published-only results so clients
-- no longer need to fetch the whole registry to search it.

-- Weighted document: name (A) > description (B) > long_description (C).
alter table public.packages
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(long_description, '')), 'C')
  ) stored;

create index if not exists packages_search_vector_idx
  on public.packages using gin (search_vector);

-- Ranked search over published + approved packages only.
-- SECURITY DEFINER so anon callers get consistent results without relying on
-- their RLS context; the published/approved filter is enforced in the body.
create or replace function public.search_packages(
  query text,
  package_type text default null,
  limit_count int default 50,
  offset_count int default 0
)
returns table (
  slug text,
  name text,
  type text,
  description text,
  latest_version text,
  install_count int,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.slug,
    p.name,
    p.type::text,
    p.description,
    p.latest_version,
    p.install_count,
    (ts_rank(p.search_vector, tsq) * (1 + ln(1 + greatest(p.install_count, 0))))::real as rank
  from public.packages p,
       websearch_to_tsquery('english', coalesce(query, '')) tsq
  where p.is_published
    and p.review_status = 'approved'
    and p.search_vector @@ tsq
    and (package_type is null or p.type::text = package_type)
  order by rank desc, p.install_count desc
  limit least(greatest(coalesce(limit_count, 50), 1), 100)
  offset greatest(coalesce(offset_count, 0), 0)
$$;

revoke all on function public.search_packages(text, text, int, int) from public;
grant execute on function public.search_packages(text, text, int, int)
  to anon, authenticated, service_role;
