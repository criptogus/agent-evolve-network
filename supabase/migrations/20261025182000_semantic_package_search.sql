create extension if not exists vector with schema extensions;
create table if not exists public.package_embeddings (
  package_id uuid primary key references public.packages(id) on delete cascade,
  version text not null,
  model text not null,
  embedding extensions.vector(1536) not null,
  source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.package_embeddings enable row level security;
revoke all on public.package_embeddings from anon,authenticated;
grant all on public.package_embeddings to service_role;
create policy package_embeddings_service on public.package_embeddings for all to service_role using(true) with check(true);
create index if not exists package_embeddings_cosine on public.package_embeddings using hnsw(embedding extensions.vector_cosine_ops);
create table if not exists public.semantic_query_budget (
  actor uuid not null, day date not null default current_date, queries int not null check(queries between 1 and 20), primary key(actor,day)
);
alter table public.semantic_query_budget enable row level security;
revoke all on public.semantic_query_budget from anon,authenticated;
grant all on public.semantic_query_budget to service_role;
create policy semantic_budget_service on public.semantic_query_budget for all to service_role using(true) with check(true);
create or replace function public.reserve_semantic_query(_actor uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare used int;
begin
  if _actor is null then return false; end if;
  insert into public.semantic_query_budget(actor,day,queries) values(_actor,current_date,1)
    on conflict(actor,day) do update set queries=semantic_query_budget.queries+1 where semantic_query_budget.queries<20 returning queries into used;
  return used is not null;
end $$;
revoke all on function public.reserve_semantic_query(uuid) from public,anon,authenticated;
grant execute on function public.reserve_semantic_query(uuid) to service_role;
create or replace function public.search_packages_semantic(_query text,_model text,_limit int default 20,_offset int default 0,_type text default null)
returns table(slug text,name text,type text,score double precision,snippet text,latest_version text)
language sql stable security definer set search_path=public,extensions as $$
  select p.slug,p.name,p.type::text,(1-(e.embedding <=> _query::vector))::double precision,p.description,p.latest_version
    from public.package_embeddings e join public.packages p on p.id=e.package_id
    where p.is_published and p.review_status='approved' and p.latest_version=e.version and e.model=_model
      and (_type is null or p.type::text=_type)
    order by e.embedding <=> _query::vector,p.slug limit least(greatest(_limit,1),50) offset greatest(_offset,0)
$$;
revoke all on function public.search_packages_semantic(text,text,int,int,text) from public,anon,authenticated;
grant execute on function public.search_packages_semantic(text,text,int,int,text) to service_role;
create or replace function public.invalidate_package_embedding() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (old.name,old.description,old.long_description,old.latest_version,old.is_published,old.review_status)
    is distinct from (new.name,new.description,new.long_description,new.latest_version,new.is_published,new.review_status)
    then delete from public.package_embeddings where package_id=new.id; end if;
  return new;
end $$;
create trigger invalidate_package_embedding after update on public.packages for each row execute function public.invalidate_package_embedding();
