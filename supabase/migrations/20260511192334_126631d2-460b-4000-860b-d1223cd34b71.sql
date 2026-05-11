ALTER TABLE public.package_installs
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill version for existing rows from the package's latest_version
UPDATE public.package_installs pi
   SET version = p.latest_version
  FROM public.packages p
 WHERE pi.package_id = p.id
   AND pi.version IS NULL;

-- Allow users to delete their own installs (uninstall)
DROP POLICY IF EXISTS "installs self delete" ON public.package_installs;
CREATE POLICY "installs self delete"
ON public.package_installs
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to update their own installs (version bump)
DROP POLICY IF EXISTS "installs self update" ON public.package_installs;
CREATE POLICY "installs self update"
ON public.package_installs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);