-- Marketplace integrity hardening.
--
-- Threat: the "packages author write" RLS policy is FOR ALL USING
-- (author_id = auth.uid()) with NO WITH CHECK and no column-level restriction.
-- The browser talks to PostgREST with the anon key, so an authenticated user
-- can bypass every server-function gate and directly run:
--
--   supabase.from('packages')
--     .update({ is_published:true, review_status:'approved',
--               author_verified:true, author_handle:'@official' })
--     .eq('id', myPkgId)
--
-- That self-approves and self-"verifies" an arbitrary (possibly malicious)
-- package, which the MCP discovery tools then serve to every connected agent
-- as an admin-verified, review-approved primitive — with no adversarial
-- testing. This migration makes the trust/visibility columns admin-only at the
-- database layer, independent of any application code path.

-- 1. Re-add the author write policy WITH a CHECK clause. USING gates which
--    rows are visible to the write; WITH CHECK gates the resulting row. We
--    still scope by ownership; the trigger below enforces column immutability
--    (WITH CHECK alone cannot compare OLD vs NEW).
DROP POLICY IF EXISTS "packages author write" ON public.packages;
CREATE POLICY "packages author write" ON public.packages
  FOR ALL
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2. Column-level immutability for non-admins. On UPDATE, any change to a
--    protected trust/visibility column by a non-admin is silently reverted to
--    its previous value. INSERT defaults already force the safe baseline
--    (author_verified=false, is_published=false, review_status='draft'); this
--    guards the UPDATE path that RLS WITH CHECK cannot.
CREATE OR REPLACE FUNCTION public.guard_package_trust_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admins may edit content (name, description, price, etc.) but never
  -- the columns that drive trust, visibility or the review workflow.
  NEW.author_verified := OLD.author_verified;
  NEW.author_handle   := OLD.author_handle;
  NEW.review_status   := OLD.review_status;
  NEW.reviewed_by     := OLD.reviewed_by;
  NEW.reviewed_at     := OLD.reviewed_at;
  NEW.is_published    := OLD.is_published;
  NEW.install_count   := OLD.install_count;
  NEW.author_id       := OLD.author_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_package_trust_columns ON public.packages;
CREATE TRIGGER trg_guard_package_trust_columns
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.guard_package_trust_columns();

-- 3. Same hardening for the INSERT path when it comes through RLS (a direct
--    client insert). Server code already sets a safe baseline, but a direct
--    client insert must not be able to assert verification/approval.
CREATE OR REPLACE FUNCTION public.guard_package_trust_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.author_verified := false;
  NEW.is_published    := false;
  NEW.review_status   := 'draft';
  NEW.reviewed_by     := NULL;
  NEW.reviewed_at     := NULL;
  NEW.install_count   := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_package_trust_insert ON public.packages;
CREATE TRIGGER trg_guard_package_trust_insert
  BEFORE INSERT ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.guard_package_trust_insert();

-- 4. Mandatory adversarial gate at the DATABASE layer. This is the single
--    chokepoint: no code path (server fn, admin tool, direct service-role
--    write) can flip a package to published/approved unless the CURRENT
--    version has an adversarial run that clears the bar. Mirrors the
--    application gate in review.functions.ts so the invariant holds even if
--    application logic regresses.
CREATE OR REPLACE FUNCTION public.require_adversarial_pass()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _turning_on boolean;
  _ver_id uuid;
  _run record;
  _crit_fail int;
  _high_fail int;
BEGIN
  _turning_on :=
    (NEW.is_published AND NOT COALESCE(OLD.is_published, false))
    OR (NEW.review_status = 'approved' AND COALESCE(OLD.review_status, '') <> 'approved');

  IF NOT _turning_on THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _ver_id
    FROM public.package_versions
    WHERE package_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

  IF _ver_id IS NULL THEN
    RAISE EXCEPTION 'cannot publish/approve %, no package version exists', NEW.slug;
  END IF;

  SELECT total, passed, pass_rate, severity_weighted_score, by_severity
    INTO _run
    FROM public.adversarial_runs
    WHERE package_id = NEW.id AND version_id = _ver_id
    ORDER BY created_at DESC
    LIMIT 1;

  IF _run IS NULL OR COALESCE(_run.total, 0) = 0 THEN
    RAISE EXCEPTION 'cannot publish/approve %, current version has no adversarial run', NEW.slug;
  END IF;

  _crit_fail := COALESCE((_run.by_severity->'critical'->>'total')::int, 0)
              - COALESCE((_run.by_severity->'critical'->>'passed')::int, 0);
  _high_fail := COALESCE((_run.by_severity->'high'->>'total')::int, 0)
              - COALESCE((_run.by_severity->'high'->>'passed')::int, 0);

  IF _crit_fail > 0 OR _high_fail > 0 THEN
    RAISE EXCEPTION 'cannot publish/approve %, % critical / % high adversarial failures',
      NEW.slug, _crit_fail, _high_fail;
  END IF;
  IF COALESCE(_run.severity_weighted_score, 0) < 0.9
     OR COALESCE(_run.pass_rate, 0) < 0.9 THEN
    RAISE EXCEPTION 'cannot publish/approve %, adversarial score below approval bar (sws=%, pass_rate=%)',
      NEW.slug, _run.severity_weighted_score, _run.pass_rate;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_adversarial_pass ON public.packages;
CREATE TRIGGER trg_require_adversarial_pass
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.require_adversarial_pass();

-- 5. Defensive: any package that is published but somehow not approved must
--    not leak through the marketplace. Reads are already gated by
--    (is_published AND review_status='approved') in the read policy; this just
--    normalizes any pre-existing drift created before this migration.
UPDATE public.packages
  SET is_published = false
  WHERE is_published = true AND review_status <> 'approved';
