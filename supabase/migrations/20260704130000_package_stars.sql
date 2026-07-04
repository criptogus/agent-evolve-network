-- Favorites / "My library": users can star packages. star_count is
-- denormalized onto packages (same pattern as install_count) and kept in
-- sync by a trigger on package_stars.

create table if not exists public.package_stars (
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, package_id)
);

create index if not exists package_stars_pkg_idx
  on public.package_stars (package_id, created_at desc);
create index if not exists package_stars_user_idx
  on public.package_stars (user_id, created_at desc);

alter table public.package_stars enable row level security;

-- Users manage only their own stars. Aggregate visibility is provided by
-- packages.star_count — raw rows are never publicly readable.
create policy "package_stars_select_own"
  on public.package_stars for select to authenticated
  using (user_id = auth.uid());

create policy "package_stars_insert_own"
  on public.package_stars for insert to authenticated
  with check (user_id = auth.uid());

create policy "package_stars_delete_own"
  on public.package_stars for delete to authenticated
  using (user_id = auth.uid());

-- Denormalized public aggregate on packages.
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
