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

drop policy if exists "collections_read_public" on public.skill_collections;
create policy "collections_read_public"
  on public.skill_collections for select to authenticated, anon
  using (is_public = true or curator_user_id = auth.uid());
drop policy if exists "collections_write_own" on public.skill_collections;
create policy "collections_write_own"
  on public.skill_collections for all to authenticated
  using (curator_user_id = auth.uid()) with check (curator_user_id = auth.uid());

drop policy if exists "collection_items_read_via_collection" on public.skill_collection_items;
create policy "collection_items_read_via_collection"
  on public.skill_collection_items for select to authenticated, anon
  using (exists (select 1 from public.skill_collections c
                 where c.id = skill_collection_items.collection_id
                   and (c.is_public or c.curator_user_id = auth.uid())));
drop policy if exists "collection_items_write_own" on public.skill_collection_items;
create policy "collection_items_write_own"
  on public.skill_collection_items for all to authenticated
  using (exists (select 1 from public.skill_collections c
                 where c.id = skill_collection_items.collection_id
                   and c.curator_user_id = auth.uid()))
  with check (exists (select 1 from public.skill_collections c
                      where c.id = skill_collection_items.collection_id
                        and c.curator_user_id = auth.uid()));

drop policy if exists "collection_followers_read_own" on public.skill_collection_followers;
create policy "collection_followers_read_own"
  on public.skill_collection_followers for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "collection_followers_write_own" on public.skill_collection_followers;
create policy "collection_followers_write_own"
  on public.skill_collection_followers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.skill_collections,public.skill_collection_items,public.skill_collection_followers from anon;
-- Public reads use the server-gated routes; anon receives no direct table grants.
revoke insert,update,delete on public.skill_collections,public.skill_collection_items,public.skill_collection_followers from authenticated;
grant select on public.skill_collections,public.skill_collection_items,public.skill_collection_followers to authenticated;
grant all on public.skill_collections,public.skill_collection_items,public.skill_collection_followers to service_role;
-- Package identity inside public collections must itself be public and approved.
drop policy if exists "collection_items_read_via_collection" on public.skill_collection_items;
create policy "collection_items_read_via_collection" on public.skill_collection_items for select to anon,authenticated using (
 exists(select 1 from public.skill_collections c where c.id=collection_id and (
 c.curator_user_id=auth.uid() or (c.is_public and exists(select 1 from public.packages p where p.id=package_id and p.is_published and p.review_status='approved')))));

-- All mutation identity comes from auth.uid(); no caller-supplied curator or fee.
create or replace function public.manage_collection(_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid := auth.uid(); action text := _payload->>'action'; cid uuid := (_payload->>'id')::uuid;
  c public.skill_collections; s text; pid uuid; pos integer := 0;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if cid is not null then select * into c from public.skill_collections where id=cid for update; end if;
  if action='follow' then
    if (_payload->>'follow')::boolean is false then
      delete from public.skill_collection_followers where collection_id=cid and user_id=actor;
      return jsonb_build_object('id',cid);
    end if;
    if c.id is null or (not c.is_public and c.curator_user_id<>actor) then raise exception 'Collection unavailable'; end if;
    if (_payload->>'follow')::boolean then
      insert into public.skill_collection_followers(collection_id,user_id) values(cid,actor) on conflict do nothing;
    else delete from public.skill_collection_followers where collection_id=cid and user_id=actor; end if;
    return jsonb_build_object('id',cid);
  end if;
  if cid is not null and (c.id is null or c.curator_user_id<>actor) then raise exception 'Owner required'; end if;
  if action='delete' and cid is not null then
    delete from public.skill_collections where id=cid and curator_user_id=actor;
    return jsonb_build_object('id',cid);
  elsif action<>'save' then raise exception 'Unsupported collection action'; end if;
  if (_payload->>'slug') !~ '^[a-z0-9][a-z0-9-]{1,63}$' or length(trim(_payload->>'title')) not between 2 and 120
    or length(_payload->>'description')>2000 or jsonb_typeof(_payload->'packages')<>'array'
    or jsonb_array_length(_payload->'packages')>50
    or (select count(*)<>count(distinct value) from jsonb_array_elements_text(_payload->'packages')) then raise exception 'Invalid collection'; end if;
  if cid is null then
    insert into public.skill_collections(slug,title,description,is_public,curator_user_id)
      values(_payload->>'slug',_payload->>'title',_payload->>'description',coalesce((_payload->>'is_public')::boolean,false),actor) returning id into cid;
  else
    update public.skill_collections set slug=_payload->>'slug',title=_payload->>'title',description=_payload->>'description',
      is_public=(_payload->>'is_public')::boolean,updated_at=now() where id=cid;
    delete from public.skill_collection_items where collection_id=cid;
  end if;
  for s in select jsonb_array_elements_text(_payload->'packages') loop
    select id into pid from public.packages where slug=s and is_published and review_status='approved';
    if pid is null then raise exception 'Only approved public packages may be collected'; end if;
    insert into public.skill_collection_items(collection_id,package_id,position) values(cid,pid,pos);
    pos:=pos+1;
  end loop;
  return jsonb_build_object('id',cid,'slug',_payload->>'slug');
end $$;
revoke all on function public.manage_collection(jsonb) from public,anon;
grant execute on function public.manage_collection(jsonb) to authenticated;
