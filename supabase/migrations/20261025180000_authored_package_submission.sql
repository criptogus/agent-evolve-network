-- Atomic, inference-free author upload. Bearer identity is resolved by the server.
create or replace function public.submit_authored_package(_author uuid, _document jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.packages; requested_slug text := _document->>'slug'; requested_version text := _document->>'version';
begin
  if _author is null or requested_slug !~ '^[a-z0-9][a-z0-9-]{1,63}$' or requested_version !~ '^\d+\.\d+\.\d+$'
    or jsonb_array_length(_document->'examples') < 2
    or length(_document->>'system_prompt') < 120 then raise exception 'Invalid authored document'; end if;
  perform pg_advisory_xact_lock(hashtextextended('author:'||requested_slug,0));
  select * into p from public.packages where packages.slug=requested_slug for update;
  if found then
    if p.author_id is distinct from _author or p.is_published or p.review_status<>'draft' or p.type::text <> _document->>'type' then
      raise exception 'Existing public or foreign package cannot be replaced'; end if;
    if exists(select 1 from public.package_versions where package_id=p.id and version=requested_version) then
      raise exception 'Immutable version already exists'; end if;
    update public.packages set name=_document->>'name',description=_document->>'description',
      long_description=_document->>'long_description',license=_document->>'license',latest_version=requested_version,review_status='draft',
      submitted_at=now(),is_published=false where id=p.id;
  else
    insert into public.packages(slug,name,type,description,long_description,author_id,
      author_verified,is_published,review_status,latest_version,source_kind,source_ref,submitted_at,license)
    values(requested_slug,_document->>'name',(_document->>'type')::public.package_type,
      _document->>'description',_document->>'long_description',_author,false,false,'draft',requested_version,
      'markdown','cli:authored-document',now(),_document->>'license') returning * into p;
  end if;
  insert into public.package_versions(package_id,version,status,system_prompt,rules,examples,compatibility,notes)
    values(p.id,requested_version,'beta',_document->>'system_prompt',_document->'rules',_document->'examples',
      '[]'::jsonb,'Submitted via CLI; model compatibility and public release require independent review. Attribution: '||(_document->'authors')::text||'; license: '||(_document->>'license'));
  return jsonb_build_object('id',p.id,'slug',requested_slug,'version',requested_version,'visibility','private_draft','review_status','draft');
end $$;
revoke all on function public.submit_authored_package(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_authored_package(uuid,jsonb) to service_role;
