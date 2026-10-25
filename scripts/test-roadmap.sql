-- Run after the three roadmap migrations, inside BEGIN / ROLLBACK only.
do $$
declare actor uuid := gen_random_uuid(); other uuid := gen_random_uuid(); c jsonb; pslug text; failed boolean;
begin
  if has_table_privilege('anon','public.package_embeddings','SELECT') or has_table_privilege('anon','public.semantic_query_budget','SELECT')
    or has_function_privilege('anon','public.manage_collection(jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.submit_authored_package(uuid,jsonb)','EXECUTE') then raise exception 'Roadmap privilege leak'; end if;
  if has_table_privilege('anon','public.skill_collections','SELECT') or has_table_privilege('anon','public.skill_collection_items','SELECT') then raise exception 'Collections must use public server gates'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  c:=public.manage_collection(jsonb_build_object('action','save','slug','roadmap-test-'||substr(actor::text,1,8),'title','Test collection','description','Fixture only','is_public',false,'packages','[]'::jsonb));
  if (select is_public from public.skill_collections where id=(c->>'id')::uuid) then raise exception 'New fixture was public'; end if;
  perform set_config('request.jwt.claim.sub',other::text,true);
  failed:=false;
  begin perform public.manage_collection(jsonb_build_object('action','delete','id',c->>'id')); exception when others then failed:=true; end;
  if not failed then raise exception 'Cross-owner delete accepted'; end if;
  failed:=false;
  begin perform public.manage_collection(jsonb_build_object('action','follow','id',c->>'id','follow',true)); exception when others then failed:=true; end;
  if not failed then raise exception 'Private collection follow accepted'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  failed:=false;
  begin perform public.manage_collection(jsonb_build_object('action','save','id',c->>'id','slug','roadmap-test-'||substr(actor::text,1,8),'title','Test collection','description','','is_public',true,'packages',jsonb_build_array('no-such-package-'||other::text))); exception when others then failed:=true; end;
  if not failed or not exists(select 1 from public.skill_collections where id=(c->>'id')::uuid and not is_public) then raise exception 'Failed update was not atomic'; end if;
  for i in 1..20 loop if not public.reserve_semantic_query(actor) then raise exception 'Budget ended too early'; end if; end loop;
  if public.reserve_semantic_query(actor) then raise exception '21st semantic query accepted'; end if;
  if not exists(select 1 from public.semantic_query_budget where semantic_query_budget.actor=(select auth.uid()) and queries=20) then raise exception 'Budget did not remain bounded'; end if;
  perform public.manage_collection(jsonb_build_object('action','delete','id',c->>'id'));
end $$;
do $$
declare uid uuid; d jsonb; result jsonb; denied boolean := false;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'A real existing owner is required for rollback-only submission verification'; end if;
  d:=jsonb_build_object('slug','roadmap-author-'||substr(gen_random_uuid()::text,1,8),'name','Roadmap author fixture','type','skill','version','0.1.0',
    'description','A native rollback-only authored package test.','long_description',repeat('Fixture source only. ',8),'system_prompt',repeat('Summarize the supplied source facts. ',8),
    'rules',jsonb_build_object('must',jsonb_build_array('Use the source'),'must_not',jsonb_build_array('Invent facts')),
    'examples',jsonb_build_array(jsonb_build_object('title','First','input','A','expected_output','A'),jsonb_build_object('title','Second','input','B','expected_output','B')),
    'license','CC-BY-SA-4.0','authors',jsonb_build_array('Fixture'),'compatibility','[]'::jsonb);
  result:=public.submit_authored_package(uid,d);
  if not exists(select 1 from public.packages where id=(result->>'id')::uuid and not is_published and not author_verified and review_status='draft')
    or not exists(select 1 from public.package_versions where package_id=(result->>'id')::uuid and version='0.1.0' and compatibility='[]'::jsonb)
    then raise exception 'Submission escalated publication or compatibility'; end if;
  begin perform public.submit_authored_package(uid,d); exception when others then denied:=true; end;
  if not denied then raise exception 'Immutable authored version overwritten'; end if;
end $$;

do $$
declare pub public.packages; draft_id uuid; vector_text text := '['||array_to_string(array_fill(0.5::float8,array[1536]),',')||']';
begin
 select * into pub from public.packages where is_published and review_status='approved' order by slug limit 1;
 select id into draft_id from public.packages where slug like 'roadmap-author-%' order by created_at desc limit 1;
 if pub.id is null or draft_id is null then raise exception 'Semantic rollback fixtures are missing'; end if;
 insert into public.package_embeddings(package_id,version,model,embedding,source_sha256) values
   (pub.id,pub.latest_version,'fixture-1536',vector_text::extensions.vector,repeat('1',64)),
   (draft_id,'0.1.0','fixture-1536',vector_text::extensions.vector,repeat('1',64))
   on conflict(package_id) do update set version=excluded.version,model=excluded.model,embedding=excluded.embedding;
 if (select count(*) from public.search_packages_semantic(vector_text,'fixture-1536',50,0,null))<>1
    or exists(select 1 from public.search_packages_semantic(vector_text,'fixture-1536',50,0,null) where slug like 'roadmap-author-%') then raise exception 'Semantic search leaked a draft'; end if;
 update public.package_embeddings set version='0.0.0-stale' where package_id=pub.id;
 if exists(select 1 from public.search_packages_semantic(vector_text,'fixture-1536',50,0,null)) then raise exception 'Semantic search returned a stale version'; end if;
 if exists(select 1 from public.search_packages_semantic(vector_text,'wrong-profile',50,0,null)) then raise exception 'Semantic search returned another profile'; end if;
end $$;
select jsonb_build_object('privileges','passed','collection_ownership','passed','private_follow','passed','atomic_failure','passed','authored_draft','passed','immutable_version','passed','daily_budget','passed','semantic_visibility','passed','semantic_version_binding','passed','semantic_profile_binding','passed','provider_calls',0) as semantic_validation;
