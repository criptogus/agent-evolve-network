-- Anonymous distribution stays behind the published-package server/API gates.
-- Keep the existing row predicates and administrator/author privileges intact.
alter policy artifacts_read on public.package_artifacts to authenticated;
alter policy "compat public read" on public.skill_compatibility to authenticated;
