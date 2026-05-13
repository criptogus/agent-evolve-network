-- Adversarial harness: proprietary case catalog + run history.
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

create policy "adversarial_cases_read"
  on public.adversarial_cases for select
  to authenticated, anon
  using (is_active = true);

create policy "adversarial_runs_read_owner"
  on public.adversarial_runs for select
  to authenticated
  using (
    exists (
      select 1 from public.packages p
      where p.id = adversarial_runs.package_id and p.author_id = auth.uid()
    )
  );

-- Audit log of prompt-injection attempts found in user-uploaded packages.
create table if not exists public.upload_injection_audit (
  id bigserial primary key,
  user_id uuid,
  filename text,
  inferred_type text,
  severity text not null check (severity in ('none','low','medium','high','critical')),
  rejected boolean not null,
  findings jsonb not null default '[]'::jsonb,
  content_sample text,
  created_at timestamptz not null default now()
);

create index if not exists upload_injection_audit_user_idx
  on public.upload_injection_audit (user_id, created_at desc);
create index if not exists upload_injection_audit_sev_idx
  on public.upload_injection_audit (severity, created_at desc);

alter table public.upload_injection_audit enable row level security;

create policy "upload_injection_audit_self_read"
  on public.upload_injection_audit for select
  to authenticated using (user_id = auth.uid());