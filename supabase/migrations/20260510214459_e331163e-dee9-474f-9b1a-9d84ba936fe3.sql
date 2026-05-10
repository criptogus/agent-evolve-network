-- 1. Add review workflow columns
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- 2. Constrain allowed values
DO $$ BEGIN
  ALTER TABLE public.packages
    ADD CONSTRAINT packages_review_status_check
    CHECK (review_status IN ('draft','pending','approved','paused','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Backfill: anything already published is treated as approved so we don't break the live catalog
UPDATE public.packages SET review_status = 'approved' WHERE is_published = true AND review_status = 'pending';

-- 4. Helpful index for the admin queue
CREATE INDEX IF NOT EXISTS packages_review_status_idx ON public.packages (review_status, type, updated_at DESC);

-- 5. Tighten the public read policy: marketplace only sees approved + published
DROP POLICY IF EXISTS "packages read public" ON public.packages;
CREATE POLICY "packages read public" ON public.packages
  FOR SELECT
  USING (
    (is_published AND review_status = 'approved')
    OR author_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. Author update policy already exists; add an explicit admin-only review update policy
--    so admins can change review_status / review_notes even when they are not the author.
--    (The existing "packages author write" already covers admins via has_role.)

-- 7. View for the admin review queue (counts + last activity)
CREATE OR REPLACE VIEW public.packages_review_queue AS
SELECT id, slug, name, type, review_status, review_notes, submitted_at, reviewed_at, reviewed_by,
       author_id, author_handle, latest_version, is_published, updated_at, created_at
  FROM public.packages
 ORDER BY (review_status = 'pending') DESC, COALESCE(submitted_at, updated_at) DESC;