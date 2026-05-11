
-- Audit log of every review/report attempt and its outcome
CREATE TABLE IF NOT EXISTS public.review_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  package_id uuid,
  review_id uuid,
  outcome text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_audit_kind_check CHECK (kind IN ('review_submit','review_update','review_report')),
  CONSTRAINT review_audit_outcome_check CHECK (outcome IN ('allowed','blocked'))
);

CREATE INDEX IF NOT EXISTS review_audit_user_time_idx
  ON public.review_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS review_audit_blocked_idx
  ON public.review_audit (outcome, created_at DESC) WHERE outcome = 'blocked';

ALTER TABLE public.review_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit admin read" ON public.review_audit;
CREATE POLICY "audit admin read" ON public.review_audit
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
-- No insert/update/delete policies — only the service role (server functions) can write.

-- Hard DB cooldown: same user can't submit two reviews on same package within 60s
CREATE OR REPLACE FUNCTION public.enforce_review_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  -- Cooldown only applies to inserts of brand-new ratings (the on-conflict update path
  -- still goes through this trigger, so allow if it's an upsert of the same row).
  SELECT count(*) INTO recent_count
    FROM public.reviews
   WHERE user_id = NEW.user_id
     AND package_id = NEW.package_id
     AND created_at > now() - interval '60 seconds'
     AND id <> NEW.id;
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'COOLDOWN_60S' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reviews_cooldown_trg ON public.reviews;
CREATE TRIGGER reviews_cooldown_trg
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_review_cooldown();

-- Hard DB cooldown: same reporter can't file the same report twice in 60s
CREATE OR REPLACE FUNCTION public.enforce_report_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent int;
BEGIN
  SELECT count(*) INTO recent
    FROM public.review_reports
   WHERE reporter_id = NEW.reporter_id
     AND created_at > now() - interval '60 seconds'
     AND id <> NEW.id;
  IF recent >= 3 THEN
    RAISE EXCEPTION 'REPORT_RATE_LIMIT' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reports_cooldown_trg ON public.review_reports;
CREATE TRIGGER reports_cooldown_trg
  BEFORE INSERT ON public.review_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_report_cooldown();
