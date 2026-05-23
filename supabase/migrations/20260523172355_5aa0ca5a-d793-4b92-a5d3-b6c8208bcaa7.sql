create table if not exists public.package_upload_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  content text not null,
  inferred_type text,
  status text not null default 'queued' check (status in ('queued','processing','done','failed')),
  attempts int not null default 0,
  result jsonb,
  error text,
  package_id uuid,
  slug text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists package_upload_jobs_status_created_idx
  on public.package_upload_jobs (status, created_at)
  where status in ('queued','processing');

create index if not exists package_upload_jobs_user_idx
  on public.package_upload_jobs (user_id, created_at desc);

alter table public.package_upload_jobs enable row level security;

create policy "owners read own upload jobs"
  on public.package_upload_jobs
  for select
  using (auth.uid() = user_id);