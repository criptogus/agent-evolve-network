
-- Restrict overly-permissive public reads on sensitive/aggregated tables.
-- Application reads go through the service-role admin client, which bypasses RLS.

DROP POLICY IF EXISTS "external_certifications_public_read" ON public.external_certifications;
CREATE POLICY "external_certifications_admin_read" ON public.external_certifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "metrics public read" ON public.package_metrics_daily;
CREATE POLICY "package_metrics_daily_owner_or_admin_read" ON public.package_metrics_daily
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_metrics_daily.package_id AND p.author_id = auth.uid())
  );

DROP POLICY IF EXISTS "package_releases_read" ON public.package_releases;
CREATE POLICY "package_releases_owner_or_admin_read" ON public.package_releases
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_releases.package_id AND p.author_id = auth.uid())
  );

DROP POLICY IF EXISTS "trust_scores_read" ON public.package_trust_scores;
CREATE POLICY "package_trust_scores_owner_or_admin_read" ON public.package_trust_scores
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_trust_scores.package_id AND p.author_id = auth.uid())
  );
