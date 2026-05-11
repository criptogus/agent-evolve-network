
-- ============== PACKS ==============
create table if not exists public.packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  theme text not null default 'general',
  description text not null,
  long_description text,
  cover_emoji text default '📦',
  price_credits integer not null default 0,
  author_id uuid,
  author_handle text not null default '@superagentskill',
  is_published boolean not null default true,
  review_status text not null default 'approved',
  latest_version text not null default '0.1.0',
  install_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists packs_theme_idx on public.packs(theme);

alter table public.packs enable row level security;

create policy "packs read public" on public.packs for select
  using ((is_published and review_status='approved') or author_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "packs author write" on public.packs for all
  using (author_id = auth.uid() or has_role(auth.uid(),'admin'))
  with check (author_id = auth.uid() or has_role(auth.uid(),'admin'));

-- ============== PACK ITEMS ==============
create table if not exists public.pack_items (
  pack_id uuid not null references public.packs(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  role text not null default 'core' check (role in ('core','optional')),
  sort_order integer not null default 0,
  primary key (pack_id, package_id)
);
create index if not exists pack_items_pack_idx on public.pack_items(pack_id);

alter table public.pack_items enable row level security;
create policy "pack_items read" on public.pack_items for select using (
  exists (select 1 from public.packs p where p.id = pack_items.pack_id and (
    (p.is_published and p.review_status='approved') or p.author_id = auth.uid() or has_role(auth.uid(),'admin')
  ))
);
create policy "pack_items author write" on public.pack_items for all using (
  exists (select 1 from public.packs p where p.id = pack_items.pack_id and (p.author_id = auth.uid() or has_role(auth.uid(),'admin')))
) with check (
  exists (select 1 from public.packs p where p.id = pack_items.pack_id and (p.author_id = auth.uid() or has_role(auth.uid(),'admin')))
);

-- ============== PACK PURCHASES ==============
create table if not exists public.pack_purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  pack_id uuid not null references public.packs(id) on delete cascade,
  author_id uuid,
  credits_paid integer not null,
  author_credits integer not null default 0,
  platform_credits integer not null default 0,
  created_at timestamptz not null default now(),
  unique (buyer_id, pack_id)
);
create index if not exists pack_purchases_buyer_idx on public.pack_purchases(buyer_id);

alter table public.pack_purchases enable row level security;
create policy "pack_purchases self read" on public.pack_purchases for select
  using (buyer_id = auth.uid() or author_id = auth.uid() or has_role(auth.uid(),'admin'));

-- ============== CUSTOMIZATIONS ==============
create table if not exists public.pack_customizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  pack_id uuid not null references public.packs(id) on delete cascade,
  brief text not null,
  niche text,
  audience text,
  voice text,
  status text not null default 'queued' check (status in ('queued','researching','customizing','ready','error')),
  research_summary text,
  research_sources jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pack_cust_user_idx on public.pack_customizations(user_id);
create index if not exists pack_cust_pack_idx on public.pack_customizations(pack_id);

alter table public.pack_customizations enable row level security;
create policy "pack_cust self all" on public.pack_customizations for all
  using (user_id = auth.uid() or has_role(auth.uid(),'admin'))
  with check (user_id = auth.uid());

create trigger trg_pack_cust_touch
  before update on public.pack_customizations
  for each row execute function public.touch_updated_at();

create trigger trg_packs_touch
  before update on public.packs
  for each row execute function public.touch_updated_at();

-- ============== PURCHASE RPC ==============
create or replace function public.purchase_pack(_pack_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _buyer uuid := auth.uid();
  _pk record;
  _author_share integer;
  _platform_share integer;
  _purchase_id uuid;
  _buyer_balance integer;
begin
  if _buyer is null then raise exception 'NOT_AUTHENTICATED' using errcode='28000'; end if;
  select id, author_id, price_credits, is_published, review_status, name, slug
    into _pk from public.packs where id = _pack_id for share;
  if _pk.id is null then raise exception 'PACK_NOT_FOUND'; end if;
  if not _pk.is_published or _pk.review_status <> 'approved' then raise exception 'PACK_NOT_AVAILABLE'; end if;
  if _pk.author_id = _buyer then raise exception 'CANNOT_BUY_OWN_PACK'; end if;

  if exists (select 1 from public.pack_purchases where buyer_id=_buyer and pack_id=_pack_id) then
    raise exception 'ALREADY_OWNED';
  end if;

  if _pk.price_credits = 0 then
    insert into public.pack_purchases(buyer_id, pack_id, author_id, credits_paid, author_credits, platform_credits)
      values (_buyer, _pack_id, _pk.author_id, 0, 0, 0)
      returning id into _purchase_id;
    update public.packs set install_count = install_count + 1 where id = _pack_id;
    return jsonb_build_object('purchase_id', _purchase_id, 'credits_paid', 0, 'free', true);
  end if;

  _author_share := (_pk.price_credits * 70) / 100;
  _platform_share := _pk.price_credits - _author_share;

  insert into public.pack_purchases(buyer_id, pack_id, author_id, credits_paid, author_credits, platform_credits)
    values (_buyer, _pack_id, _pk.author_id, _pk.price_credits, _author_share, _platform_share)
    returning id into _purchase_id;

  _buyer_balance := public._credit_apply(
    _buyer, -_pk.price_credits, 'purchase', 'pack_purchase', _purchase_id,
    'Purchased pack ' || _pk.name, jsonb_build_object('pack_slug', _pk.slug)
  );

  if _pk.author_id is not null and _author_share > 0 then
    perform public._credit_apply(
      _pk.author_id, _author_share, 'sale', 'pack_purchase', _purchase_id,
      'Sold pack ' || _pk.name, jsonb_build_object('pack_slug', _pk.slug, 'buyer_id', _buyer)
    );
  end if;

  update public.packs set install_count = install_count + 1 where id = _pack_id;

  return jsonb_build_object(
    'purchase_id', _purchase_id,
    'credits_paid', _pk.price_credits,
    'author_credits', _author_share,
    'platform_credits', _platform_share,
    'new_balance', _buyer_balance
  );
end $$;

-- ============== HELPER: pack with items ==============
create or replace function public.get_pack_with_items(_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select * from public.packs where slug = _slug
      and ((is_published and review_status='approved') or author_id = auth.uid() or has_role(auth.uid(),'admin'))
  )
  select case when (select id from p) is null then null else
    jsonb_build_object(
      'pack', to_jsonb((select row_to_json(p) from p)),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'package_id', pk.id,
          'slug', pk.slug,
          'name', pk.name,
          'type', pk.type,
          'description', pk.description,
          'role', pi.role,
          'sort_order', pi.sort_order
        ) order by pi.sort_order, pk.name)
        from public.pack_items pi
        join public.packages pk on pk.id = pi.package_id
        where pi.pack_id = (select id from p)
      ), '[]'::jsonb),
      'owned', exists (
        select 1 from public.pack_purchases pu
        where pu.pack_id = (select id from p) and pu.buyer_id = auth.uid()
      )
    )
  end;
$$;
