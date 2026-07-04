-- External certifications: "trust badge as a service".
-- POST /api/public/certify runs the review engine on a skill file that may
-- live anywhere (not necessarily on the registry), records the verdict keyed
-- by content SHA-256, and issues a permanent badge + verification URL.

create table if not exists public.external_certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  type text not null check (type in ('skill', 'playbook', 'soul', 'guardrail')),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  overall_score int not null check (overall_score between 0 and 100),
  grade text not null,
  engine_version text not null,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists external_certifications_sha_idx
  on public.external_certifications (content_sha256);
create index if not exists external_certifications_created_idx
  on public.external_certifications (created_at desc);

alter table public.external_certifications enable row level security;

-- Certifications are public by design: the whole point is third-party
-- verification. Writes only happen through the service role (the API route).
drop policy if exists external_certifications_public_read on public.external_certifications;
create policy external_certifications_public_read
  on public.external_certifications
  for select
  using (true);
