
-- 1. Schema additions
alter table public.reviews
  add column if not exists rater_kind text not null default 'human',
  add column if not exists verified_purchase boolean not null default false;

alter table public.reviews drop constraint if exists reviews_rater_kind_chk;
alter table public.reviews add constraint reviews_rater_kind_chk
  check (rater_kind in ('human','agent'));

-- Replace unique (package_id, user_id) with (package_id, user_id, rater_kind)
alter table public.reviews drop constraint if exists reviews_package_id_user_id_key;
create unique index if not exists reviews_pkg_user_kind_uniq
  on public.reviews (package_id, user_id, rater_kind);

create index if not exists reviews_package_kind_idx
  on public.reviews (package_id, rater_kind);

-- 2. New eligibility trigger (replaces verify_review_usage)
create or replace function public.verify_review_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg record;
  has_run boolean;
  has_purchase boolean;
begin
  if NEW.user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id, slug, author_id, price_credits into pkg
    from public.packages where id = NEW.package_id;
  if pkg.id is null then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  if pkg.author_id = NEW.user_id then
    raise exception 'CANNOT_REVIEW_OWN_PACKAGE';
  end if;

  if NEW.rating is null or NEW.rating < 1 or NEW.rating > 5 then
    raise exception 'INVALID_RATING';
  end if;

  select exists(
    select 1 from public.package_purchases
    where buyer_id = NEW.user_id and package_id = NEW.package_id
  ) into has_purchase;

  select exists(
    select 1 from public.runs
    where user_id = NEW.user_id and status = 'ok' and pkg.slug = any(package_slugs)
  ) into has_run;

  -- Paid packages: must have purchased. Free packages: a successful run is enough.
  if pkg.price_credits > 0 then
    if not has_purchase then
      raise exception 'PURCHASE_REQUIRED';
    end if;
  else
    if not (has_purchase or has_run) then
      raise exception 'USAGE_REQUIRED';
    end if;
  end if;

  NEW.verified_purchase := has_purchase;
  return NEW;
end;
$$;

drop trigger if exists trg_verify_review on public.reviews;
create trigger trg_verify_review
  before insert or update on public.reviews
  for each row execute function public.verify_review_eligibility();

-- 3. Aggregate function (split by rater_kind)
create or replace function public.get_package_ratings(_package_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with agg as (
    select
      rater_kind,
      count(*)::int as cnt,
      round(avg(rating)::numeric, 2) as avg_rating
    from public.reviews
    where package_id = _package_id
    group by rater_kind
  ),
  totals as (
    select count(*)::int as cnt, round(avg(rating)::numeric, 2) as avg_rating
    from public.reviews where package_id = _package_id
  )
  select jsonb_build_object(
    'human_count',  coalesce((select cnt from agg where rater_kind='human'), 0),
    'human_avg',    coalesce((select avg_rating from agg where rater_kind='human'), 0),
    'agent_count',  coalesce((select cnt from agg where rater_kind='agent'), 0),
    'agent_avg',    coalesce((select avg_rating from agg where rater_kind='agent'), 0),
    'total_count',  coalesce((select cnt from totals), 0),
    'total_avg',    coalesce((select avg_rating from totals), 0)
  );
$$;

-- 4. Eligibility checker for current user
create or replace function public.get_review_eligibility(_package_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pkg record;
  has_purchase boolean := false;
  has_run boolean := false;
  existing_human uuid;
  existing_agent uuid;
  can_review boolean := false;
begin
  if uid is null then
    return jsonb_build_object('authenticated', false, 'can_review', false);
  end if;

  select id, slug, author_id, price_credits into pkg
    from public.packages where id = _package_id;
  if pkg.id is null then
    return jsonb_build_object('authenticated', true, 'can_review', false, 'reason', 'PACKAGE_NOT_FOUND');
  end if;

  if pkg.author_id = uid then
    return jsonb_build_object('authenticated', true, 'can_review', false, 'reason', 'OWN_PACKAGE');
  end if;

  select exists(select 1 from public.package_purchases
    where buyer_id = uid and package_id = _package_id) into has_purchase;
  select exists(select 1 from public.runs
    where user_id = uid and status='ok' and pkg.slug = any(package_slugs)) into has_run;

  if pkg.price_credits > 0 then
    can_review := has_purchase;
  else
    can_review := has_purchase or has_run;
  end if;

  select id into existing_human from public.reviews
    where user_id = uid and package_id = _package_id and rater_kind='human' limit 1;
  select id into existing_agent from public.reviews
    where user_id = uid and package_id = _package_id and rater_kind='agent' limit 1;

  return jsonb_build_object(
    'authenticated', true,
    'can_review', can_review,
    'has_purchase', has_purchase,
    'has_run', has_run,
    'reviewed_human', existing_human is not null,
    'reviewed_agent', existing_agent is not null,
    'reason', case when not can_review then
      (case when pkg.price_credits>0 then 'PURCHASE_REQUIRED' else 'USAGE_REQUIRED' end)
    else null end
  );
end;
$$;

-- 5. Submit review RPC (upsert)
create or replace function public.submit_review(
  _package_id uuid,
  _rating int,
  _body text,
  _rater_kind text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode='28000'; end if;
  if _rater_kind not in ('human','agent') then raise exception 'INVALID_RATER_KIND'; end if;
  if _rating < 1 or _rating > 5 then raise exception 'INVALID_RATING'; end if;

  insert into public.reviews (package_id, user_id, rating, body, rater_kind)
  values (_package_id, uid, _rating, nullif(trim(_body),''), _rater_kind)
  on conflict (package_id, user_id, rater_kind)
  do update set rating = excluded.rating, body = excluded.body, created_at = now()
  returning id into rid;
  return rid;
end;
$$;

-- 6. List reviews (public read continues to work via existing RLS)
create or replace function public.list_package_reviews(_package_id uuid, _limit int default 50)
returns table (
  id uuid,
  rating int,
  body text,
  rater_kind text,
  verified_purchase boolean,
  created_at timestamptz,
  user_id uuid,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.rating, r.body, r.rater_kind, r.verified_purchase, r.created_at,
         r.user_id, p.display_name, p.avatar_url
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.package_id = _package_id
  order by r.created_at desc
  limit greatest(_limit, 1);
$$;
