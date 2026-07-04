
create table if not exists public.cloud_skills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  slug        text not null,
  name        text not null,
  description text,
  category    text not null default 'general',
  tags        text[] not null default '{}',
  content     text not null,
  variables   jsonb not null default '{}',
  is_public   boolean not null default false,
  version     integer not null default 1,
  forked_from uuid references public.cloud_skills(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cloud_skills_user_slug_uq unique (user_id, slug)
);
create index if not exists cloud_skills_user_id_idx on public.cloud_skills(user_id);
create index if not exists cloud_skills_category_idx on public.cloud_skills(category);
create index if not exists cloud_skills_is_public_idx on public.cloud_skills(is_public) where is_public = true;
create index if not exists cloud_skills_tags_idx on public.cloud_skills using gin(tags);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_skills TO authenticated;
GRANT SELECT ON public.cloud_skills TO anon;
GRANT ALL ON public.cloud_skills TO service_role;

alter table public.cloud_skills enable row level security;

create table if not exists public.cloud_skill_versions (
  id             uuid primary key default gen_random_uuid(),
  cloud_skill_id uuid not null references public.cloud_skills(id) on delete cascade,
  version        integer not null,
  content        text not null,
  variables      jsonb not null default '{}',
  changelog      text,
  created_at     timestamptz not null default now(),
  constraint cloud_skill_versions_skill_ver_uq unique (cloud_skill_id, version)
);
create index if not exists cloud_skill_versions_skill_idx on public.cloud_skill_versions(cloud_skill_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_skill_versions TO authenticated;
GRANT SELECT ON public.cloud_skill_versions TO anon;
GRANT ALL ON public.cloud_skill_versions TO service_role;

alter table public.cloud_skill_versions enable row level security;

create policy "Users can manage their own cloud skills"
  on public.cloud_skills for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public cloud skills are readable by anyone"
  on public.cloud_skills for select
  using (is_public = true);

create policy "Users can manage versions of their own skills"
  on public.cloud_skill_versions for all
  using (exists (select 1 from public.cloud_skills cs where cs.id = cloud_skill_versions.cloud_skill_id and cs.user_id = auth.uid()));

create policy "Public skill versions are readable"
  on public.cloud_skill_versions for select
  using (exists (select 1 from public.cloud_skills cs where cs.id = cloud_skill_versions.cloud_skill_id and cs.is_public = true));

create or replace function public.has_active_paid_subscription(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = _user_id
      and status in ('active','trialing','past_due')
      and (current_period_end is null or current_period_end > now())
  );
$$;
