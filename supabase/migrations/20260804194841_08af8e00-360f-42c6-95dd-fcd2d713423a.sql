revoke select on public.package_weekly_metrics from anon;
grant select on public.package_weekly_metrics to authenticated;
grant all on public.package_weekly_metrics to service_role;

alter table public.package_weekly_metrics enable row level security;
drop policy if exists "weekly metrics readable" on public.package_weekly_metrics;
create policy "weekly metrics author or admin read"
  on public.package_weekly_metrics for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.packages p
      where (p.id = package_weekly_metrics.package_id or p.slug = package_weekly_metrics.package_slug)
        and p.author_id = auth.uid()
    )
  );