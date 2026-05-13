-- Shareable run executions: every public /run/<slug>?input=... produces a row
-- that the page renders as a watermarked, social-shareable artifact.

create table if not exists public.shared_runs (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique,         -- short URL-safe token
  package_id uuid not null references public.packages(id) on delete cascade,
  package_slug text not null,
  package_version text,
  prompt text not null,
  output text not null,
  model text,
  duration_ms int,
  redacted boolean not null default true,   -- ran through PII guardrails before persisting
  view_count int not null default 0,
  created_by uuid,                          -- null = anonymous run
  created_at timestamptz not null default now()
);

create index if not exists shared_runs_pkg_idx on public.shared_runs (package_id, created_at desc);
create index if not exists shared_runs_recent_idx on public.shared_runs (created_at desc);

alter table public.shared_runs enable row level security;

-- Public reads (anyone can view a shared run via its token).
create policy "shared_runs_read_any"
  on public.shared_runs for select to authenticated, anon using (true);

-- Insert via service role only (server fn rate-limits + sanitizes).
