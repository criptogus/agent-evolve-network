-- Background queue for SkillForge author normalisation.
--
-- Why: a single Vercel function call has a hard time budget (~60s). The
-- SkillForge author pipeline can spend 10–30s per file (model call +
-- structured-output retry chain). Uploading >1 file in one request
-- routinely blew the budget and the caller saw a 504 / 35s timeout.
--
-- Pattern: `upload_packages` processes the FIRST file inline (so the
-- caller gets immediate feedback for at least one item) and persists the
-- remaining files as `queued` jobs. A cron drains the queue once per
-- minute. The caller can also poll the queue via the response payload's
-- queued job ids.

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

-- Owners can read their own jobs (so /account/packages can show progress).
create policy "owners read own upload jobs"
  on public.package_upload_jobs
  for select
  using (auth.uid() = user_id);

-- Writes are service_role only. Inserts happen from the MCP tool via
-- supabaseAdmin; the drain endpoint also runs with service_role.
-- (No insert/update/delete policy → blocked for anon + authenticated.)
