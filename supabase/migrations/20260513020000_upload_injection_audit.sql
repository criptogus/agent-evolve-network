-- Audit log of prompt-injection attempts found in user-uploaded packages.

create table if not exists public.upload_injection_audit (
  id bigserial primary key,
  user_id uuid,
  filename text,
  inferred_type text,
  severity text not null check (severity in ('none','low','medium','high','critical')),
  rejected boolean not null,
  findings jsonb not null default '[]'::jsonb,
  content_sample text,                    -- first 1KB only, for triage
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
