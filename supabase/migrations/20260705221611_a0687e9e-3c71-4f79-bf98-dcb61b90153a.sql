
-- External certifications
create table if not exists public.external_certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  type text not null check (type in ('skill', 'playbook', 'soul', 'guardrail')),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  overall_score int not null check (overall_score between 0 and 100),
  grade text not null,
  engine_version text not null,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select on public.external_certifications to anon, authenticated;
grant all on public.external_certifications to service_role;

create index if not exists external_certifications_sha_idx
  on public.external_certifications (content_sha256);
create index if not exists external_certifications_created_idx
  on public.external_certifications (created_at desc);

alter table public.external_certifications enable row level security;

drop policy if exists external_certifications_public_read on public.external_certifications;
create policy external_certifications_public_read
  on public.external_certifications
  for select
  using (true);

-- Package stars
create table if not exists public.package_stars (
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, package_id)
);

grant select, insert, delete on public.package_stars to authenticated;
grant all on public.package_stars to service_role;

create index if not exists package_stars_pkg_idx
  on public.package_stars (package_id, created_at desc);
create index if not exists package_stars_user_idx
  on public.package_stars (user_id, created_at desc);

alter table public.package_stars enable row level security;

drop policy if exists "package_stars_select_own" on public.package_stars;
create policy "package_stars_select_own"
  on public.package_stars for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "package_stars_insert_own" on public.package_stars;
create policy "package_stars_insert_own"
  on public.package_stars for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "package_stars_delete_own" on public.package_stars;
create policy "package_stars_delete_own"
  on public.package_stars for delete to authenticated
  using (user_id = auth.uid());

alter table public.packages
  add column if not exists star_count int not null default 0;

create or replace function public._package_stars_sync_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.packages set star_count = star_count + 1 where id = new.package_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.packages set star_count = greatest(star_count - 1, 0) where id = old.package_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists package_stars_sync_count on public.package_stars;
create trigger package_stars_sync_count
  after insert or delete on public.package_stars
  for each row execute function public._package_stars_sync_count();

-- Package search
alter table public.packages
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(long_description, '')), 'C')
  ) stored;

create index if not exists packages_search_vector_idx
  on public.packages using gin (search_vector);

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
