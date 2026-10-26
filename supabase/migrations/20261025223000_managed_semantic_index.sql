-- Unicode code-point prefix matches embeddingSourceInput, including null/empty fields.
create or replace function public.search_embedding_source(_name text,_description text,_long_description text) returns text
language sql immutable set search_path=pg_catalog as $$
  select left(coalesce(_name,'') || E'\n' || coalesce(_description,'') || E'\n' || coalesce(_long_description,''),2000)
$$;
revoke all on function public.search_embedding_source(text,text,text) from public,anon,authenticated;
grant execute on function public.search_embedding_source(text,text,text) to service_role;
-- A stale write racing an author edit is excluded by its exact source digest.
create or replace function public.search_packages_semantic(_query text,_model text,_limit int default 20,_offset int default 0,_type text default null)
returns table(slug text,name text,type text,score double precision,snippet text,latest_version text)
language sql stable security definer set search_path=public,extensions as $$
  select p.slug,p.name,p.type::text,(1-(e.embedding <=> _query::vector))::double precision,p.description,p.latest_version
    from public.package_embeddings e join public.packages p on p.id=e.package_id
    where p.is_published and p.review_status='approved' and p.latest_version=e.version and e.model=_model
      and e.source_sha256=encode(sha256(convert_to(public.search_embedding_source(p.name,p.description,p.long_description),'UTF8')),'hex')
      and (_type is null or p.type::text=_type)
    order by e.embedding <=> _query::vector,p.slug limit least(greatest(_limit,1),50) offset greatest(_offset,0)
$$;
revoke all on function public.search_packages_semantic(text,text,int,int,text) from public,anon,authenticated;
grant execute on function public.search_packages_semantic(text,text,int,int,text) to service_role;
-- Preserve unresolved paid attempts; no expiry-based or automatic replay.
create table if not exists public.semantic_index_attempts (
  id uuid primary key default gen_random_uuid(), model text not null,
  status text not null check(status in ('active','completed')),
  receipt jsonb, created_at timestamptz not null default now()
);
alter table public.semantic_index_attempts enable row level security;
revoke all on public.semantic_index_attempts from anon,authenticated;
grant all on public.semantic_index_attempts to service_role;
create policy semantic_index_attempts_service on public.semantic_index_attempts for all to service_role using(true) with check(true);
create unique index semantic_index_one_active on public.semantic_index_attempts(model) where status='active';
create or replace function public.reserve_search_embedding_batch(_model text,_attempt uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare attempt uuid;
begin
  if _attempt is null or length(_model) not between 1 and 200 then raise exception 'Invalid model'; end if;
  insert into public.semantic_index_attempts(id,model,status) values(_attempt,_model,'active') on conflict do nothing returning id into attempt;
  return attempt;
end $$;
revoke all on function public.reserve_search_embedding_batch(text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_search_embedding_batch(text,uuid) to service_role;
create or replace function public.complete_search_embedding_batch(_attempt uuid,_entries jsonb,_receipt jsonb) returns int
language plpgsql security definer set search_path=public,extensions as $$
declare profile text; entry jsonb; inserted int:=0;
begin
  select model into profile from public.semantic_index_attempts where id=_attempt and status='active' for update;
  if profile is null or jsonb_typeof(_entries)<>'array' or jsonb_array_length(_entries) not between 1 and 25 then raise exception 'Invalid active batch'; end if;
  for entry in select value from jsonb_array_elements(_entries) loop
    -- Bind the provider result to the exact still-published source, not just its version.
    if exists(select 1 from public.packages p where p.id=(entry->>'package_id')::uuid and p.is_published and p.review_status='approved' and p.latest_version=entry->>'version' and
      encode(sha256(convert_to(public.search_embedding_source(p.name,p.description,p.long_description),'UTF8')),'hex')=entry->>'source_sha256') then
      insert into public.package_embeddings(package_id,version,model,embedding,source_sha256)
      values((entry->>'package_id')::uuid,entry->>'version',profile,(entry->>'embedding')::vector(1536),entry->>'source_sha256')
      on conflict(package_id) do update set version=excluded.version,model=excluded.model,embedding=excluded.embedding,source_sha256=excluded.source_sha256,created_at=now();
      inserted:=inserted+1;
    end if;
  end loop;
  update public.semantic_index_attempts set status='completed',receipt=_receipt || jsonb_build_object('indexed',inserted,'requestId',_attempt::text) where id=_attempt;
  return inserted;
end $$;
revoke all on function public.complete_search_embedding_batch(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.complete_search_embedding_batch(uuid,jsonb,jsonb) to service_role;

create or replace function public.search_embedding_index_status(_model text)
returns table(eligible bigint,indexed bigint,ready boolean,inflight boolean)
language sql stable security definer set search_path=public,extensions as $$
  select count(*),count(e.package_id),count(*)>0 and count(*)=count(e.package_id),exists(select 1 from public.semantic_index_attempts where model=_model and status='active')
  from public.packages p left join public.package_embeddings e on
    e.package_id=p.id and e.version=p.latest_version and e.model=_model and
    e.source_sha256=encode(sha256(convert_to(public.search_embedding_source(p.name,p.description,p.long_description),'UTF8')),'hex')
  where p.is_published and p.review_status='approved'
$$;
revoke all on function public.search_embedding_index_status(text) from public,anon,authenticated;
grant execute on function public.search_embedding_index_status(text) to service_role;

create or replace function public.get_search_embedding_attempt(_attempt uuid)
returns table(status text,receipt jsonb)
language sql stable security definer set search_path=public as $$
 select a.status,a.receipt from public.semantic_index_attempts a where a.id=_attempt
$$;
revoke all on function public.get_search_embedding_attempt(uuid) from public,anon,authenticated;
grant execute on function public.get_search_embedding_attempt(uuid) to service_role;
