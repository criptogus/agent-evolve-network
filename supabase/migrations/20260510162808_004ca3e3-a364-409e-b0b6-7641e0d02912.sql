
DROP POLICY IF EXISTS "evaluations auth insert" ON public.package_evaluations;
CREATE POLICY "evaluations auth insert"
ON public.package_evaluations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (triggered_by = auth.uid() OR has_role(auth.uid(),'admin')));
