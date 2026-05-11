create table if not exists public.skill_compatibility (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  package_slug text not null,
  version text,
  model text not null,
  pass_rate numeric not null,
  total_cases int not null default 0,
  passed_cases int not null default 0,
  judge_score numeric,
  status text not null,
  notes text,
  sample jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz not null default now(),
  unique(package_id, model)
);
create index if not exists skill_compat_pkg_idx on public.skill_compatibility(package_id);
create index if not exists skill_compat_slug_idx on public.skill_compatibility(package_slug);

alter table public.skill_compatibility enable row level security;
create policy "compat public read" on public.skill_compatibility for select using (
  exists (select 1 from public.packages p where p.id = package_id and p.is_published)
  or exists (select 1 from public.packages p where p.id = package_id and (p.author_id = auth.uid() or has_role(auth.uid(),'admin')))
);
create policy "compat admin write" on public.skill_compatibility for all
  using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create table if not exists public.skill_drift_alerts (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  package_slug text not null,
  detected_at timestamptz not null default now(),
  window_days int not null default 7,
  baseline_runs int not null,
  recent_runs int not null,
  baseline_rate numeric not null,
  recent_rate numeric not null,
  delta numeric not null,
  severity text not null,
  status text not null default 'open',
  suggested_patch text,
  rationale text,
  triggered_by_model text,
  updated_at timestamptz not null default now()
);
create index if not exists drift_pkg_idx on public.skill_drift_alerts(package_id);
create index if not exists drift_status_idx on public.skill_drift_alerts(status);

alter table public.skill_drift_alerts enable row level security;
create policy "drift author read" on public.skill_drift_alerts for select using (
  exists (select 1 from public.packages p where p.id = package_id
          and (p.author_id = auth.uid() or has_role(auth.uid(),'admin')))
);
create policy "drift admin write" on public.skill_drift_alerts for all
  using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));
create policy "drift author update" on public.skill_drift_alerts for update using (
  exists (select 1 from public.packages p where p.id = package_id and p.author_id = auth.uid())
) with check (
  exists (select 1 from public.packages p where p.id = package_id and p.author_id = auth.uid())
);

create or replace function public.compute_skill_drift(_package_id uuid, _window_days int default 7)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  recent_total int; recent_ok int;
  base_total int; base_ok int;
  recent_rate numeric; base_rate numeric;
begin
  select count(*), count(*) filter (where success) into recent_total, recent_ok
    from public.skill_executions
   where package_id = _package_id
     and created_at > now() - make_interval(days => _window_days);

  select count(*), count(*) filter (where success) into base_total, base_ok
    from public.skill_executions
   where package_id = _package_id
     and created_at <= now() - make_interval(days => _window_days)
     and created_at > now() - make_interval(days => _window_days * 5);

  recent_rate := case when recent_total > 0 then recent_ok::numeric/recent_total else null end;
  base_rate   := case when base_total   > 0 then base_ok::numeric/base_total else null end;

  return jsonb_build_object(
    'recent_runs', recent_total, 'recent_rate', recent_rate,
    'baseline_runs', base_total, 'baseline_rate', base_rate,
    'delta', case when recent_rate is not null and base_rate is not null then recent_rate - base_rate else null end,
    'window_days', _window_days
  );
end $$;