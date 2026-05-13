-- Integration marketplace: per-workspace installations + per-action telemetry.

create table if not exists public.integration_installations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  installed_by uuid not null,
  integration_slug text not null,
  integration_version text not null,
  auth_kind text not null,
  -- Credentials are encrypted at the application layer; raw blob is stored opaquely.
  credentials_cipher bytea,
  granted_scopes text[] not null default '{}',
  is_active boolean not null default true,
  installed_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (workspace_id, integration_slug)
);

create index if not exists integration_installations_ws_idx
  on public.integration_installations (workspace_id, is_active);

create table if not exists public.integration_action_runs (
  id bigserial primary key,
  installation_id uuid references public.integration_installations(id) on delete set null,
  integration_slug text not null,
  action_id text not null,
  side_effect text not null check (side_effect in ('read','write','destructive')),
  status int,
  success boolean not null,
  latency_ms int,
  error_code text,
  workspace_hash text,
  invoked_by_package_slug text,
  invoked_by_package_version text,
  created_at timestamptz not null default now()
);

create index if not exists iar_install_idx
  on public.integration_action_runs (installation_id, created_at desc);
create index if not exists iar_slug_idx
  on public.integration_action_runs (integration_slug, action_id, created_at desc);
create index if not exists iar_pkg_idx
  on public.integration_action_runs (invoked_by_package_slug, created_at desc);

alter table public.integration_installations enable row level security;
alter table public.integration_action_runs enable row level security;

create policy "ii_select_own_workspace"
  on public.integration_installations for select
  to authenticated using (installed_by = auth.uid());

create policy "iar_insert_any"
  on public.integration_action_runs for insert
  to authenticated, anon with check (true);
