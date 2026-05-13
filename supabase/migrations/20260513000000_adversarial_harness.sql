-- Adversarial harness: proprietary case catalog + run history.
-- Cases are seeded from content/adversarial/<vertical>/<id>.yaml via sync script.

create table if not exists public.adversarial_cases (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique,
  vertical text not null check (vertical in ('security','fintech','healthcare','devops','general')),
  category text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  target_package_type text not null check (target_package_type in ('skill','playbook','soul','guardrail')),
  target_package_slugs text[] not null default '{}',
  target_tags text[] not null default '{}',
  input text not null,
  context text,
  expectations jsonb not null,
  references_ text[] not null default '{}',
  tags text[] not null default '{}',
  authors text[] not null default '{}',
  license text not null default 'Proprietary',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists adversarial_cases_vertical_idx on public.adversarial_cases (vertical);
create index if not exists adversarial_cases_category_idx on public.adversarial_cases (category);
create index if not exists adversarial_cases_severity_idx on public.adversarial_cases (severity);
create index if not exists adversarial_cases_target_type_idx on public.adversarial_cases (target_package_type);

create table if not exists public.adversarial_runs (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete cascade,
  version_id uuid references public.package_versions(id) on delete set null,
  triggered_by uuid,
  trigger_kind text not null default 'manual' check (trigger_kind in ('manual','scheduled','ci','forge')),
  total int not null,
  passed int not null,
  failed int not null,
  pass_rate numeric(5,4) not null,
  severity_weighted_score numeric(5,4) not null,
  by_category jsonb not null default '{}'::jsonb,
  by_severity jsonb not null default '{}'::jsonb,
  outcomes jsonb not null default '[]'::jsonb,
  vertical_filter text,
  duration_ms int,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists adversarial_runs_pkg_idx on public.adversarial_runs (package_id, created_at desc);
create index if not exists adversarial_runs_version_idx on public.adversarial_runs (version_id);

alter table public.adversarial_cases enable row level security;
alter table public.adversarial_runs enable row level security;

-- Cases readable by anyone authenticated; mutations restricted to service role.
create policy "adversarial_cases_read"
  on public.adversarial_cases for select
  to authenticated, anon
  using (is_active = true);

-- Runs readable by package owner; service role manages writes.
create policy "adversarial_runs_read_owner"
  on public.adversarial_runs for select
  to authenticated
  using (
    exists (
      select 1 from public.packages p
      where p.id = adversarial_runs.package_id and p.owner_id = auth.uid()
    )
  );
