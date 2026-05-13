-- Skill collections — Spotify-like curated playlists. Curators earn a bps
-- cut of every install attributed to their collection.

create table if not exists public.skill_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  curator_user_id uuid not null,
  title text not null,
  description text,
  is_public boolean not null default true,
  cover_emoji text,
  curator_share_bps int not null default 200,    -- 2.00% of installs attributed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists skill_collections_curator_idx
  on public.skill_collections (curator_user_id);

create table if not exists public.skill_collection_items (
  collection_id uuid not null references public.skill_collections(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  position int not null default 0,
  note text,
  added_at timestamptz not null default now(),
  primary key (collection_id, package_id)
);

create index if not exists skill_collection_items_pkg_idx
  on public.skill_collection_items (package_id);

create table if not exists public.skill_collection_followers (
  collection_id uuid not null references public.skill_collections(id) on delete cascade,
  user_id uuid not null,
  followed_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

alter table public.skill_collections enable row level security;
alter table public.skill_collection_items enable row level security;
alter table public.skill_collection_followers enable row level security;

create policy "collections_read_public"
  on public.skill_collections for select to authenticated, anon
  using (is_public = true or curator_user_id = auth.uid());
create policy "collections_write_own"
  on public.skill_collections for all to authenticated
  using (curator_user_id = auth.uid()) with check (curator_user_id = auth.uid());

create policy "collection_items_read_via_collection"
  on public.skill_collection_items for select to authenticated, anon
  using (exists (select 1 from public.skill_collections c
                 where c.id = skill_collection_items.collection_id
                   and (c.is_public or c.curator_user_id = auth.uid())));
create policy "collection_items_write_own"
  on public.skill_collection_items for all to authenticated
  using (exists (select 1 from public.skill_collections c
                 where c.id = skill_collection_items.collection_id
                   and c.curator_user_id = auth.uid()))
  with check (exists (select 1 from public.skill_collections c
                      where c.id = skill_collection_items.collection_id
                        and c.curator_user_id = auth.uid()));

create policy "collection_followers_read_own"
  on public.skill_collection_followers for select to authenticated
  using (user_id = auth.uid());
create policy "collection_followers_write_own"
  on public.skill_collection_followers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
