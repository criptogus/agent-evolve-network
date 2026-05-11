
-- =========================
-- SKILL EXECUTIONS (telemetry)
-- =========================
create table if not exists public.skill_executions (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.packages(id) on delete cascade,
  package_slug  text not null,
  version       text,
  model         text,
  success       boolean not null,
  latency_ms    integer,
  tokens_in     integer,
  tokens_out    integer,
  error_kind    text,
  agent_fp      text,            -- caller-provided opaque hash, optional
  user_id       uuid,            -- nullable: anonymous reports allowed
  created_at    timestamptz not null default now()
);

create index if not exists skill_executions_pkg_time_idx
  on public.skill_executions (package_id, created_at desc);
create index if not exists skill_executions_pkg_model_idx
  on public.skill_executions (package_id, model);
create index if not exists skill_executions_fp_time_idx
  on public.skill_executions (agent_fp, created_at desc);

alter table public.skill_executions enable row level security;

-- Raw rows: admin only
create policy "skill_executions admin read"
  on public.skill_executions for select
  using (public.has_role(auth.uid(), 'admin'));

-- Inserts go through the SECURITY DEFINER function only; deny direct inserts
-- (no INSERT policy => default deny).

-- =========================
-- ROBUSTNESS FINDINGS (CVE-style)
-- =========================
create table if not exists public.skill_robustness_findings (
  id               uuid primary key default gen_random_uuid(),
  package_id       uuid not null references public.packages(id) on delete cascade,
  package_slug     text not null,
  code             text not null unique,             -- e.g. SAS-2026-0042
  severity         text not null check (severity in ('low','medium','high','critical')),
  category         text not null,                    -- prompt_injection | jailbreak | data_leak | hallucination | unsafe_action | other
  summary          text not null,
  details          text,
  affected_version text,
  fixed_in_version text,
  status           text not null default 'draft' check (status in ('draft','public','withdrawn')),
  source           text not null default 'evaluator', -- evaluator | researcher | community
  evidence         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  published_at     timestamptz,
  updated_at       timestamptz not null default now()
);

create index if not exists robustness_pkg_idx on public.skill_robustness_findings (package_id, severity);
create index if not exists robustness_status_idx on public.skill_robustness_findings (status, published_at desc);

create trigger trg_robustness_touch
  before update on public.skill_robustness_findings
  for each row execute function public.touch_updated_at();

alter table public.skill_robustness_findings enable row level security;

create policy "robustness public read"
  on public.skill_robustness_findings for select
  using (
    status = 'public'
    or exists (select 1 from public.packages p where p.id = package_id and (p.author_id = auth.uid() or public.has_role(auth.uid(),'admin')))
  );

create policy "robustness admin write"
  on public.skill_robustness_findings for all
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- =========================
-- Sequence for SAS codes
-- =========================
create sequence if not exists public.sas_finding_seq start 1;

create or replace function public.next_sas_code()
returns text language sql as $$
  select 'SAS-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.sas_finding_seq')::text, 4, '0')
$$;

-- =========================
-- report_skill_execution (anonymous-friendly)
-- =========================
create or replace function public.report_skill_execution(
  _slug text,
  _success boolean,
  _model text default null,
  _version text default null,
  _latency_ms integer default null,
  _tokens_in integer default null,
  _tokens_out integer default null,
  _error_kind text default null,
  _agent_fp text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg_id uuid;
  recent int;
  uid uuid := auth.uid();
  exec_id uuid;
begin
  if _slug is null or length(_slug) = 0 then
    raise exception 'INVALID_SLUG';
  end if;

  select id into pkg_id from public.packages
   where slug = _slug and is_published = true
   limit 1;
  if pkg_id is null then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  -- Rate limit: 60 executions / minute per agent_fp (or per uid)
  if _agent_fp is not null then
    select count(*) into recent from public.skill_executions
      where agent_fp = _agent_fp and created_at > now() - interval '60 seconds';
    if recent >= 60 then raise exception 'RATE_LIMIT'; end if;
  elsif uid is not null then
    select count(*) into recent from public.skill_executions
      where user_id = uid and created_at > now() - interval '60 seconds';
    if recent >= 120 then raise exception 'RATE_LIMIT'; end if;
  end if;

  insert into public.skill_executions
    (package_id, package_slug, version, model, success, latency_ms,
     tokens_in, tokens_out, error_kind, agent_fp, user_id)
  values
    (pkg_id, _slug, _version, _model,
     coalesce(_success,false),
     greatest(coalesce(_latency_ms,0),0),
     greatest(coalesce(_tokens_in,0),0),
     greatest(coalesce(_tokens_out,0),0),
     nullif(_error_kind,''), nullif(_agent_fp,''), uid)
  returning id into exec_id;

  return exec_id;
end $$;

grant execute on function public.report_skill_execution(
  text,boolean,text,text,integer,integer,integer,text,text
) to anon, authenticated;

-- =========================
-- get_skill_trust (public)
-- =========================
create or replace function public.get_skill_trust(_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pkg_id uuid;
  total_30 int;
  ok_30 int;
  total_7 int;
  ok_7 int;
  total_all int;
  ok_all int;
  p50 numeric;
  p95 numeric;
  models jsonb;
  findings_public int;
  findings_critical int;
  trust numeric;
begin
  select id into pkg_id from public.packages where slug = _slug;
  if pkg_id is null then return null; end if;

  select count(*), count(*) filter (where success)
    into total_30, ok_30
    from public.skill_executions
   where package_id = pkg_id and created_at > now() - interval '30 days';

  select count(*), count(*) filter (where success)
    into total_7, ok_7
    from public.skill_executions
   where package_id = pkg_id and created_at > now() - interval '7 days';

  select count(*), count(*) filter (where success)
    into total_all, ok_all
    from public.skill_executions
   where package_id = pkg_id;

  select percentile_cont(0.5) within group (order by latency_ms),
         percentile_cont(0.95) within group (order by latency_ms)
    into p50, p95
    from public.skill_executions
   where package_id = pkg_id and latency_ms is not null
     and created_at > now() - interval '30 days';

  select coalesce(jsonb_agg(jsonb_build_object(
           'model', model,
           'runs', cnt,
           'success_rate', case when cnt>0 then round(ok::numeric/cnt,3) else 0 end
         ) order by cnt desc), '[]'::jsonb)
    into models
    from (
      select model,
             count(*) as cnt,
             count(*) filter (where success) as ok
        from public.skill_executions
       where package_id = pkg_id
         and model is not null
         and created_at > now() - interval '30 days'
       group by model
       order by count(*) desc
       limit 8
    ) m;

  select count(*) filter (where status='public'),
         count(*) filter (where status='public' and severity='critical')
    into findings_public, findings_critical
    from public.skill_robustness_findings
   where package_id = pkg_id;

  -- Composite trust score (0..100): success rate × log(volume) × hardening
  trust := round(
    (case when total_30 > 0 then (ok_30::numeric/total_30) else 0.5 end) * 100
    * least(1.0, ln(greatest(total_30,1)+1) / ln(101))         -- volume confidence
    * (1.0 - least(1.0, findings_critical::numeric * 0.25))    -- penalize critical
  , 1);

  return jsonb_build_object(
    'slug', _slug,
    'lifetime', jsonb_build_object('runs', total_all, 'success_rate', case when total_all>0 then round(ok_all::numeric/total_all,3) else null end),
    'window_30d', jsonb_build_object('runs', total_30, 'success_rate', case when total_30>0 then round(ok_30::numeric/total_30,3) else null end, 'p50_latency_ms', p50, 'p95_latency_ms', p95),
    'window_7d', jsonb_build_object('runs', total_7, 'success_rate', case when total_7>0 then round(ok_7::numeric/total_7,3) else null end),
    'models', models,
    'findings_public', findings_public,
    'findings_critical', findings_critical,
    'trust_score', trust,
    'battle_tested', total_30 >= 1000 and (case when total_30>0 then ok_30::numeric/total_30 else 0 end) >= 0.95
  );
end $$;

grant execute on function public.get_skill_trust(text) to anon, authenticated;

-- =========================
-- seed_robustness_findings_for (admin)
-- =========================
create or replace function public.seed_robustness_findings_for(_package_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg record;
  ev record;
  item jsonb;
  inserted int := 0;
  sev text;
  cat text;
  sum_text text;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select id, slug into pkg from public.packages where id = _package_id;
  if pkg.id is null then raise exception 'PACKAGE_NOT_FOUND'; end if;

  for ev in
    select id, adversarial_results, created_at
      from public.package_evaluations
     where package_id = _package_id
       and adversarial_results is not null
       and jsonb_typeof(adversarial_results) = 'array'
  loop
    for item in select * from jsonb_array_elements(ev.adversarial_results)
    loop
      -- Treat only failed adversarial cases as findings
      if coalesce((item->>'passed')::boolean, true) then continue; end if;

      sev := coalesce(item->>'severity','medium');
      if sev not in ('low','medium','high','critical') then sev := 'medium'; end if;
      cat := coalesce(item->>'category','other');
      sum_text := coalesce(item->>'summary', item->>'name', 'Adversarial failure');

      insert into public.skill_robustness_findings
        (package_id, package_slug, code, severity, category, summary, details, source, evidence)
      values
        (pkg.id, pkg.slug, public.next_sas_code(), sev, cat, sum_text,
         item->>'details', 'evaluator', item)
      on conflict do nothing;
      inserted := inserted + 1;
    end loop;
  end loop;

  return inserted;
end $$;
