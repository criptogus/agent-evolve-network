-- Cloud Skill Manager: user-owned skills stored in the cloud for reuse across
-- projects, CLIs, and devices. Premium-only feature (Agent Pass / Enterprise).

create table if not exists cloud_skills (
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
  forked_from uuid references cloud_skills(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint cloud_skills_user_slug_uq unique (user_id, slug)
);

create index if not exists cloud_skills_user_id_idx on cloud_skills(user_id);
create index if not exists cloud_skills_category_idx on cloud_skills(category);
create index if not exists cloud_skills_is_public_idx on cloud_skills(is_public) where is_public = true;
create index if not exists cloud_skills_tags_idx on cloud_skills using gin(tags);

comment on table cloud_skills is 'User-owned skill files saved to the cloud. Premium feature.';
comment on column cloud_skills.variables is 'Template variables as JSON: {"var_name": {"type": "string", "default": "value", "description": "..."}}';
comment on column cloud_skills.content is 'The full skill content (Markdown with optional YAML frontmatter)';

-- Version history for cloud skills
create table if not exists cloud_skill_versions (
  id            uuid primary key default gen_random_uuid(),
  cloud_skill_id uuid not null references cloud_skills(id) on delete cascade,
  version       integer not null,
  content       text not null,
  variables     jsonb not null default '{}',
  changelog     text,
  created_at    timestamptz not null default now(),

  constraint cloud_skill_versions_skill_ver_uq unique (cloud_skill_id, version)
);

create index if not exists cloud_skill_versions_skill_idx on cloud_skill_versions(cloud_skill_id);

-- RLS policies
alter table cloud_skills enable row level security;
alter table cloud_skill_versions enable row level security;

create policy "Users can manage their own cloud skills"
  on cloud_skills for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public cloud skills are readable by anyone"
  on cloud_skills for select
  using (is_public = true);

create policy "Users can manage versions of their own skills"
  on cloud_skill_versions for all
  using (
    exists (
      select 1 from cloud_skills cs
      where cs.id = cloud_skill_versions.cloud_skill_id
      and cs.user_id = auth.uid()
    )
  );

create policy "Public skill versions are readable"
  on cloud_skill_versions for select
  using (
    exists (
      select 1 from cloud_skills cs
      where cs.id = cloud_skill_versions.cloud_skill_id
      and cs.is_public = true
    )
  );

-- Helper: check if user has an active paid subscription
create or replace function has_active_paid_subscription(_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from subscriptions
    where user_id = _user_id
    and status in ('active', 'trialing', 'past_due')
    and (current_period_end is null or current_period_end > now())
  );
$$;
