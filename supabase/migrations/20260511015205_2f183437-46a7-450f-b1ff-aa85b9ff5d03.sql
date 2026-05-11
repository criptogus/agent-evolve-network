
-- Moderation flags on reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_reason text,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by uuid;

-- Reports table
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  package_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_reports_reason_check
    CHECK (reason IN ('spam','abusive','fake','off_topic','harassment','other')),
  CONSTRAINT review_reports_status_check
    CHECK (status IN ('open','actioned','dismissed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS review_reports_unique_per_user
  ON public.review_reports (review_id, reporter_id);
CREATE INDEX IF NOT EXISTS review_reports_status_idx
  ON public.review_reports (status, created_at DESC);

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports self insert" ON public.review_reports;
CREATE POLICY "reports self insert" ON public.review_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports self read" ON public.review_reports;
CREATE POLICY "reports self read" ON public.review_reports
  FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "reports admin update" ON public.review_reports;
CREATE POLICY "reports admin update" ON public.review_reports
  FOR UPDATE USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- File a report (one per review per user)
CREATE OR REPLACE FUNCTION public.report_review(
  _review_id uuid, _reason text, _details text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  rev record;
  rid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _reason NOT IN ('spam','abusive','fake','off_topic','harassment','other') THEN
    RAISE EXCEPTION 'INVALID_REASON';
  END IF;

  SELECT id, package_id, user_id INTO rev FROM public.reviews WHERE id = _review_id;
  IF rev.id IS NULL THEN RAISE EXCEPTION 'REVIEW_NOT_FOUND'; END IF;
  IF rev.user_id = uid THEN RAISE EXCEPTION 'CANNOT_REPORT_OWN_REVIEW'; END IF;

  INSERT INTO public.review_reports (review_id, package_id, reporter_id, reason, details)
  VALUES (_review_id, rev.package_id, uid, _reason, NULLIF(trim(_details),''))
  ON CONFLICT (review_id, reporter_id)
    DO UPDATE SET reason = EXCLUDED.reason,
                  details = EXCLUDED.details,
                  status = 'open',
                  resolved_at = NULL,
                  resolved_by = NULL,
                  resolution = NULL
  RETURNING id INTO rid;
  RETURN rid;
END $$;

REVOKE EXECUTE ON FUNCTION public.report_review(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.report_review(uuid, text, text) TO authenticated;

-- Admin: hide/unhide a review and resolve linked reports
CREATE OR REPLACE FUNCTION public.moderate_review(
  _review_id uuid, _hide boolean, _reason text DEFAULT NULL, _resolution text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501';
  END IF;
  UPDATE public.reviews
     SET is_hidden = _hide,
         hidden_reason = CASE WHEN _hide THEN _reason ELSE NULL END,
         hidden_at = CASE WHEN _hide THEN now() ELSE NULL END,
         hidden_by = CASE WHEN _hide THEN uid ELSE NULL END
   WHERE id = _review_id;
  UPDATE public.review_reports
     SET status = CASE WHEN _hide THEN 'actioned' ELSE 'dismissed' END,
         resolution = _resolution,
         resolved_by = uid,
         resolved_at = now()
   WHERE review_id = _review_id AND status = 'open';
END $$;

REVOKE EXECUTE ON FUNCTION public.moderate_review(uuid, boolean, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.moderate_review(uuid, boolean, text, text) TO authenticated;

-- Admin: resolve a single report without changing the review (e.g. dismiss as not-actionable)
CREATE OR REPLACE FUNCTION public.resolve_report(
  _report_id uuid, _status text, _resolution text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF _status NOT IN ('actioned','dismissed') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  UPDATE public.review_reports
     SET status = _status, resolution = _resolution,
         resolved_by = uid, resolved_at = now()
   WHERE id = _report_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.resolve_report(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_report(uuid, text, text) TO authenticated;

-- Refresh public listing to exclude hidden reviews
CREATE OR REPLACE FUNCTION public.list_package_reviews(_package_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, rating integer, body text, rater_kind text, verified_purchase boolean, created_at timestamptz, user_id uuid, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.rating, r.body, r.rater_kind, r.verified_purchase, r.created_at,
         r.user_id, p.display_name, p.avatar_url
    FROM public.reviews r
    LEFT JOIN public.profiles p ON p.id = r.user_id
   WHERE r.package_id = _package_id
     AND r.is_hidden = false
   ORDER BY r.created_at DESC
   LIMIT GREATEST(_limit, 1);
$$;
