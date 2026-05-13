-- Trust Score + telemetry: signed release records and anonymized execution events.

create table if not exists public.package_releases (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  version_id uuid not null references public.package_versions(id) on delete cascade,
  version text not null,
  content_hash text not null,            -- sha256 of canonicalized YAML
  signature text not null,               -- base64 ed25519 signature over content_hash
  signing_key_id text not null,          -- pubkey fingerprint
  signed_at timestamptz not null default now(),
  signed_by uuid,
  unique (package_id, version)
);

create index if not exists package_releases_pkg_idx
  on public.package_releases (package_id, signed_at desc);

create table if not exists public.skill_executions (
  id bigserial primary key,
  package_id uuid references public.packages(id) on delete set null,
  package_slug text not null,
  package_version text,
  workspace_hash text,                   -- sha256(workspace_id||salt) — anonymized
  runtime text,                          -- e.g. "claude-code", "cursor", "mcp"
  latency_ms int,
  success boolean not null,
  error_class text,
  guardrail_triggered text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists skill_executions_pkg_idx
  on public.skill_executions (package_id, created_at desc);
create index if not exists skill_executions_slug_idx
  on public.skill_executions (package_slug, created_at desc);

create materialized view if not exists public.skill_performance_daily as
select
  package_id,
  package_slug,
  date_trunc('day', created_at) as day,
  count(*) as runs,
  count(*) filter (where success) as successes,
  (count(*) filter (where success))::numeric / nullif(count(*), 0) as success_rate,
  percentile_cont(0.5) within group (order by latency_ms) as p50_latency_ms,
  percentile_cont(0.95) within group (order by latency_ms) as p95_latency_ms
from public.skill_executions
group by 1, 2, 3;

create unique index if not exists skill_perf_daily_uidx
  on public.skill_performance_daily (package_id, day);

create table if not exists public.package_trust_scores (
  package_id uuid primary key references public.packages(id) on delete cascade,
  score numeric(5,4) not null,           -- 0..1
  schema_valid boolean not null,
  adversarial_pass_rate numeric(5,4),
  adversarial_weighted_score numeric(5,4),
  real_world_success_rate numeric(5,4),
  signed_releases int not null default 0,
  age_days int,
  components jsonb not null default '{}'::jsonb,  -- breakdown for transparency
  computed_at timestamptz not null default now()
);

alter table public.package_releases enable row level security;
alter table public.skill_executions enable row level security;
alter table public.package_trust_scores enable row level security;

create policy "package_releases_read"
  on public.package_releases for select
  to authenticated, anon using (true);

create policy "trust_scores_read"
  on public.package_trust_scores for select
  to authenticated, anon using (true);

-- Executions are write-only from clients (no select); ingestion uses service role.
create policy "skill_executions_insert_any"
  on public.skill_executions for insert
  to authenticated, anon with check (true);
