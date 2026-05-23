-- Marketplace integrity — admin-only publication
--
-- Until now, the only thing stopping a non-admin author from flipping
-- packages.is_published = true was the application-layer check in
-- setMyPackagePublished. Anyone hitting the table directly with a
-- service-role token, or any new code path that forgot the check, could
-- bypass admin review and put a package on the public marketplace.
--
-- This migration moves the rule into the database via a trigger so it
-- holds no matter who writes:
--   * Authors may set is_published = false freely (unpublish).
--   * Setting is_published = true requires the calling role to be admin
--     (checked via public.user_roles), OR to be the service-role bypass
--     used by the /admin/review server flow (which always runs the
--     adversarial gate before flipping).
--
-- We deliberately do NOT enforce the adversarial gate inside the
-- trigger — that logic stays in TypeScript so admins can read its
-- output. The trigger is the floor; the app layer is the policy.

CREATE OR REPLACE FUNCTION public.enforce_admin_only_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _flipping_to_public BOOLEAN := (
    TG_OP = 'UPDATE'
    AND COALESCE(OLD.is_published, FALSE) = FALSE
    AND COALESCE(NEW.is_published, FALSE) = TRUE
  ) OR (
    TG_OP = 'INSERT' AND COALESCE(NEW.is_published, FALSE) = TRUE
  );
  _uid UUID := auth.uid();
  _is_admin BOOLEAN := FALSE;
BEGIN
  IF NOT _flipping_to_public THEN
    RETURN NEW;
  END IF;

  -- service_role (used by SECURITY DEFINER admin RPCs and server-side
  -- admin functions running with the service key) bypasses the check.
  -- All user-facing surfaces hit the table as the authenticated role,
  -- so this only carves out the legitimate admin server path.
  IF current_setting('request.jwt.claim.role', TRUE) = 'service_role'
     OR current_user = 'service_role'
     OR session_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'marketplace_publish_forbidden: must be signed in'
      USING ERRCODE = '42501';
  END IF;

  SELECT TRUE INTO _is_admin
  FROM public.user_roles
  WHERE user_id = _uid AND role = 'admin'
  LIMIT 1;

  IF NOT COALESCE(_is_admin, FALSE) THEN
    RAISE EXCEPTION
      'marketplace_publish_forbidden: only admins can list packages on the public marketplace. Submit for review from /account/packages.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_admin_only_publish ON public.packages;
CREATE TRIGGER trg_enforce_admin_only_publish
  BEFORE INSERT OR UPDATE OF is_published ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_only_publish();

COMMENT ON FUNCTION public.enforce_admin_only_publish IS
  'Blocks non-admin sessions from setting packages.is_published = true. Service-role contexts (admin RPCs) bypass. Authors must submit drafts for admin review.';
