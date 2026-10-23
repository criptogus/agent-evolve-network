begin;
-- Complete, immutable source archives, tied to the exact reviewed version.
create table public.package_artifacts (
 version_id uuid primary key references public.package_versions(id) on delete cascade,
 package_id uuid not null references public.packages(id) on delete cascade,
 files jsonb not null check (jsonb_typeof(files)='object'),
 sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create function public.artifact_version_matches() returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.package_versions v where v.id=new.version_id and v.package_id=new.package_id) then raise exception 'VERSION_MISMATCH'; end if;
 return new;
end $$;
create trigger artifact_version_matches before insert on public.package_artifacts for each row execute function public.artifact_version_matches();
alter table public.package_artifacts enable row level security;
-- Version bodies remain purchaser-protected; expose only free, approved source archives.
create function public.artifact_readable(_package uuid,_version uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.packages p join public.package_versions v on v.package_id=p.id
 where p.id=_package and v.id=_version and ((p.is_published and p.review_status='approved' and p.price_credits=0 and v.version=p.latest_version) or p.author_id=auth.uid() or public.has_role(auth.uid(),'admin')))
$$;
revoke all on function public.artifact_readable(uuid,uuid) from public,anon,authenticated;
grant execute on function public.artifact_readable(uuid,uuid) to anon,authenticated,service_role;
create policy artifacts_read on public.package_artifacts for select using(public.artifact_readable(package_id,version_id));
create policy artifacts_insert on public.package_artifacts for insert to authenticated with check (
 created_by=auth.uid() and exists(select 1 from public.packages p where p.id=package_id and (p.author_id=auth.uid() or public.has_role(auth.uid(),'admin')) and not p.is_published)
);
revoke all on public.package_artifacts from anon,authenticated;
grant select on public.package_artifacts to anon,authenticated;
grant insert on public.package_artifacts to authenticated;
grant all on public.package_artifacts to service_role;

create table public.team_workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 owner_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.team_members (
 workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('viewer','editor','admin')),
 joined_at timestamptz not null default now(), primary key(workspace_id,user_id)
);
create table public.team_invites (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
 email text not null, role text not null check(role in ('viewer','editor','admin')),
 token_hash text not null unique, created_by uuid not null references auth.users(id),
 expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz
);
create table public.team_skill_versions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
 slug text not null check(slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'), version text not null check(version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
 name text not null check(length(name) between 2 and 120), description text not null check(length(description)<=1000),
 files jsonb not null check(jsonb_typeof(files)='object'), status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_by uuid not null references auth.users(id), reviewed_by uuid references auth.users(id),
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 unique(workspace_id,slug,version)
);
create table public.team_library (
 workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
 package_id uuid not null references public.packages(id) on delete cascade,
 version_id uuid not null references public.package_versions(id),
 pinned_by uuid not null references auth.users(id), pinned_at timestamptz not null default now(),
 primary key(workspace_id,package_id)
);
create table public.team_audit_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
 actor_id uuid not null references auth.users(id), action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create function public.team_role(_workspace uuid) returns text language sql stable security definer set search_path=public as $$
 select role from public.team_members where workspace_id=_workspace and user_id=auth.uid()
$$;
revoke all on function public.team_role(uuid) from public,anon,authenticated;
grant execute on function public.team_role(uuid) to authenticated;
alter table public.team_workspaces enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.team_skill_versions enable row level security;
alter table public.team_library enable row level security;
alter table public.team_audit_events enable row level security;
create policy teams_read on public.team_workspaces for select to authenticated using(public.team_role(id) is not null);
create policy members_read on public.team_members for select to authenticated using(public.team_role(workspace_id) is not null);
create policy invites_read on public.team_invites for select to authenticated using(public.team_role(workspace_id)='admin');
create policy team_skills_read on public.team_skill_versions for select to authenticated using(public.team_role(workspace_id) is not null and (status='approved' or created_by=auth.uid() or public.team_role(workspace_id)='admin'));
create policy team_library_read on public.team_library for select to authenticated using(public.team_role(workspace_id) is not null);
create policy audit_read on public.team_audit_events for select to authenticated using(public.team_role(workspace_id)='admin');
-- Direct writes are deliberately unavailable. All mutations validate tenant and role atomically.
revoke all on public.team_workspaces,public.team_members,public.team_invites,public.team_skill_versions,public.team_library,public.team_audit_events from anon,authenticated;
grant select on public.team_workspaces,public.team_members,public.team_invites,public.team_skill_versions,public.team_library,public.team_audit_events to authenticated;
grant all on public.team_workspaces,public.team_members,public.team_invites,public.team_skill_versions,public.team_library,public.team_audit_events to service_role;
create function public.team_action(_action text,_workspace uuid default null,_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); role_name text; wid uuid:=_workspace; token text; inv public.team_invites; item public.team_skill_versions; target uuid; v_id uuid; pkg_id uuid; result jsonb:='{}';
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if _action='create' then
  if length(trim(coalesce(_payload->>'name',''))) not between 2 and 100 then raise exception 'INVALID_NAME'; end if;
  insert into public.team_workspaces(name,owner_id) values(trim(_payload->>'name'),uid) returning id into wid;
  insert into public.team_members values(wid,uid,'admin',now());
  result:=jsonb_build_object('workspace_id',wid);
 elsif _action='accept' then
  select * into inv from public.team_invites where token_hash=encode(extensions.digest(coalesce(_payload->>'token',''),'sha256'),'hex') for update;
  if inv.id is null or inv.accepted_at is not null or inv.expires_at<=now() or lower(inv.email)<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'INVALID_INVITE' using errcode='42501'; end if;
  wid:=inv.workspace_id;
  -- Joining again must never overwrite an existing member's role.
  insert into public.team_members(workspace_id,user_id,role) values(wid,uid,inv.role) on conflict do nothing;
  update public.team_invites set accepted_at=now() where id=inv.id;
  result:=jsonb_build_object('workspace_id',wid);
 else
  -- Read the role after acquiring the lock, so a removed administrator cannot use a stale grant.
  perform 1 from public.team_workspaces where id=wid for update;
  role_name:=public.team_role(wid);
  if role_name is null then raise exception 'NOT_A_MEMBER' using errcode='42501'; end if;
  if _action='invite' then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   if _payload->>'role' not in ('viewer','editor','admin') or coalesce(_payload->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_INVITE'; end if;
   token:=encode(extensions.gen_random_bytes(32),'hex');
   insert into public.team_invites(workspace_id,email,role,token_hash,created_by) values(wid,lower(_payload->>'email'),_payload->>'role',encode(extensions.digest(token,'sha256'),'hex'),uid);
   result:=jsonb_build_object('token',token);
  elsif _action in ('set_role','remove_member') then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   target:=(_payload->>'user_id')::uuid;
   if exists(select 1 from public.team_workspaces where id=wid and owner_id=target) then raise exception 'OWNER_PROTECTED'; end if;
   if _action='remove_member' then delete from public.team_members where workspace_id=wid and user_id=target;
   else
    if coalesce(_payload->>'role','') not in ('viewer','editor','admin') then raise exception 'INVALID_ROLE'; end if;
    update public.team_members set role=_payload->>'role' where workspace_id=wid and user_id=target;
   end if;
  elsif _action='submit_skill' then
   if role_name not in ('editor','admin') then raise exception 'EDITOR_REQUIRED' using errcode='42501'; end if;
   if jsonb_typeof(_payload->'files')<>'object' or octet_length((_payload->'files')::text)>2000000 or not ((_payload->'files') ? 'SKILL.md') then raise exception 'INVALID_FILES'; end if;
   if (select count(*) from jsonb_each(_payload->'files')) not between 1 and 200 or exists(select 1 from jsonb_each(_payload->'files') f where jsonb_typeof(f.value)<>'string' or octet_length(f.value#>>'{}')>250000 or length(f.key) not between 1 and 240 or f.key ~ '(^/|^[A-Za-z]:|\\|(^|/)(\.\.?|\.git|\.ssh|node_modules|\.env[^/]*)(/|$)|//|/$|[[:cntrl:]])') then raise exception 'INVALID_FILES'; end if;
   insert into public.team_skill_versions(workspace_id,slug,version,name,description,files,created_by) values(wid,_payload->>'slug',_payload->>'version',_payload->>'name',coalesce(_payload->>'description',''),_payload->'files',uid) returning id into target;
   result:=jsonb_build_object('id',target);
  elsif _action='review_skill' then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   select * into item from public.team_skill_versions where id=(_payload->>'id')::uuid and workspace_id=wid for update;
   if item.id is null or item.status<>'pending' then raise exception 'NOT_PENDING'; end if;
   if item.created_by=uid then raise exception 'INDEPENDENT_REVIEW_REQUIRED'; end if;
   if coalesce(_payload->>'status','') not in ('approved','rejected') then raise exception 'INVALID_STATUS'; end if;
   update public.team_skill_versions set status=_payload->>'status',reviewed_by=uid,reviewed_at=now() where id=item.id;
  elsif _action='pin_package' then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   select p.id,v.id into pkg_id,v_id from public.packages p join public.package_versions v on v.package_id=p.id where p.slug=_payload->>'slug' and v.version=_payload->>'version' and p.is_published and p.review_status='approved' and v.version=p.latest_version;
   if v_id is null then raise exception 'APPROVED_VERSION_REQUIRED'; end if;
   insert into public.team_library(workspace_id,package_id,version_id,pinned_by) values(wid,pkg_id,v_id,uid) on conflict(workspace_id,package_id) do update set version_id=excluded.version_id,pinned_by=uid,pinned_at=now();
  elsif _action='unpin_package' then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   delete from public.team_library where workspace_id=wid and package_id=(_payload->>'package_id')::uuid;
  else raise exception 'UNKNOWN_ACTION';
  end if;
 end if;
 insert into public.team_audit_events(workspace_id,actor_id,action,detail) values(wid,uid,_action,jsonb_strip_nulls(jsonb_build_object('id',_payload->>'id','slug',_payload->>'slug','version',_payload->>'version','role',_payload->>'role','user_id',_payload->>'user_id','package_id',_payload->>'package_id','status',_payload->>'status')));
 return result;
end $$;
revoke all on function public.team_action(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.team_action(text,uuid,jsonb) to authenticated;

-- Aggregate only public, approved package evidence. No workspace identifiers or outputs.
create function public.skill_evidence(_slug text,_version text default null,_model text default null,_experiment text default null,_days int default 30)
returns table(arm text,version text,model text,experiment_key text,executions bigint,measured bigint,completed bigint,avg_latency_ms numeric,total_tokens numeric)
language sql stable security definer set search_path=public as $$
 select e.arm,e.version,e.model,e.experiment_key,count(*),count(e.task_completed),count(*) filter(where e.task_completed),avg(e.latency_ms),sum(coalesce(e.tokens_in,0)+coalesce(e.tokens_out,0))
 from public.skill_executions e join public.packages p on p.id=e.package_id
 where p.slug=_slug and p.is_published and p.review_status='approved' and e.arm in ('control','treatment')
 and (_version is null or e.version=_version) and (_model is null or e.model=_model) and (_experiment is null or e.experiment_key=_experiment)
 and e.created_at>=now()-make_interval(days=>least(greatest(_days,1),365))
 group by e.arm,e.version,e.model,e.experiment_key
$$;
revoke all on function public.skill_evidence(text,text,text,text,int) from public,anon,authenticated;
grant execute on function public.skill_evidence(text,text,text,text,int) to anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.require_adversarial_pass()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _turning_on boolean; _ver_id uuid; _run record; _crit_fail int; _high_fail int;
BEGIN
  _turning_on :=
    (NEW.is_published AND NOT COALESCE(OLD.is_published, false))
    OR (NEW.review_status = 'approved' AND COALESCE(OLD.review_status, '') <> 'approved')
    OR (NEW.is_published AND NEW.latest_version IS DISTINCT FROM OLD.latest_version);
  IF NOT _turning_on THEN RETURN NEW; END IF;
  SELECT id INTO _ver_id FROM public.package_versions
    WHERE package_id = NEW.id AND version = NEW.latest_version LIMIT 1;
  IF _ver_id IS NULL THEN
    RAISE EXCEPTION 'cannot publish/approve %, no package version exists', NEW.slug;
  END IF;
  SELECT total, passed, pass_rate, severity_weighted_score, by_severity INTO _run
    FROM public.adversarial_runs
    WHERE package_id = NEW.id AND version_id = _ver_id
    ORDER BY created_at DESC LIMIT 1;
  IF _run IS NULL OR COALESCE(_run.total, 0) = 0 THEN
    RAISE EXCEPTION 'cannot publish/approve %, current version has no adversarial run', NEW.slug;
  END IF;
  _crit_fail := COALESCE((_run.by_severity->'critical'->>'total')::int, 0)
              - COALESCE((_run.by_severity->'critical'->>'passed')::int, 0);
  _high_fail := COALESCE((_run.by_severity->'high'->>'total')::int, 0)
              - COALESCE((_run.by_severity->'high'->>'passed')::int, 0);
  IF _crit_fail > 0 OR _high_fail > 0 THEN
    RAISE EXCEPTION 'cannot publish/approve %, % critical / % high adversarial failures', NEW.slug, _crit_fail, _high_fail;
  END IF;
  IF COALESCE(_run.severity_weighted_score, 0) < 0.9 OR COALESCE(_run.pass_rate, 0) < 0.9 THEN
    RAISE EXCEPTION 'cannot publish/approve %, adversarial score below approval bar', NEW.slug;
  END IF;
  RETURN NEW;
END;
$function$;
notify pgrst, 'reload schema';
commit;
