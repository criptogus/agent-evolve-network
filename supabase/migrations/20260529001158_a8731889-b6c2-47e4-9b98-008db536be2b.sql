-- =========================================================
-- Aplicar 6 migrações que estavam no repo mas não no banco
-- (seed GTM + marketplace integrity + golden cases + OAuth private URIs +
--  admin-only publish + efficiency axis)
-- =========================================================

-- 1) Seed GTM agents skills (idempotent via ON CONFLICT)
WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('gtm-account-tiering-strategist', 'GTM Account Tiering Strategist', 'skill', 'Builds T1/T2/T3 ABM tiers with firmographic fit, intent signals, and SLA-backed coverage rules.', 'Use when defining or auditing ABM tiers across sales, marketing, and partnerships.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/gtm-account-tiering-strategist.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded', 'You are an ABM strategist.', '{"must":[],"must_not":[]}'::jsonb, '[]'::jsonb, '[{"runtime":"claude","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO NOTHING;

-- (Other GTM seeds already present in the database — skipping to avoid bloat;
-- the main missing schema is what matters below.)

-- 2) Marketplace integrity hardening
DROP POLICY IF EXISTS "packages author write" ON public.packages;
CREATE POLICY "packages author write" ON public.packages
  FOR ALL
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.guard_package_trust_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION public.guard_package_trust_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION public.require_adversarial_pass()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _turning_on boolean; _ver_id uuid; _run record; _crit_fail int; _high_fail int;
BEGIN
  _turning_on :=
    (NEW.is_published AND NOT COALESCE(OLD.is_published, false))
    OR (NEW.review_status = 'approved' AND COALESCE(OLD.review_status, '') <> 'approved');
  IF NOT _turning_on THEN RETURN NEW; END IF;
  SELECT id INTO _ver_id FROM public.package_versions
    WHERE package_id = NEW.id ORDER BY created_at DESC LIMIT 1;
  IF _ver_id IS NULL THEN
    RAISE EXCEPTION 'cannot publish/approve %, no package version exists', NEW.slug;
  END IF;
  SELECT total, passed, pass_rate, severity_weighted_score, by_severity INTO _run
    FROM public.adversarial_runs
    WHERE package_id = NEW.id AND version_id = _ver_id
    ORDER BY created_at DESC LIMIT 1;
  IF _run IS NULL OR COALESCE(_run.total, 0) = 0 THEN
    RAISE EXCEPTION 'cannot publish/approve %, current version has no adversarial run', NEW.slug;
  END IF;
  _crit_fail := COALESCE((_run.by_severity->'critical'->>'total')::int, 0)
              - COALESCE((_run.by_severity->'critical'->>'passed')::int, 0);
  _high_fail := COALESCE((_run.by_severity->'high'->>'total')::int, 0)
              - COALESCE((_run.by_severity->'high'->>'passed')::int, 0);
  IF _crit_fail > 0 OR _high_fail > 0 THEN
    RAISE EXCEPTION 'cannot publish/approve %, % critical / % high adversarial failures', NEW.slug, _crit_fail, _high_fail;
  END IF;
  IF COALESCE(_run.severity_weighted_score, 0) < 0.9 OR COALESCE(_run.pass_rate, 0) < 0.9 THEN
    RAISE EXCEPTION 'cannot publish/approve %, adversarial score below approval bar', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_require_adversarial_pass ON public.packages;
CREATE TRIGGER trg_require_adversarial_pass
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.require_adversarial_pass();

UPDATE public.packages
  SET is_published = false
  WHERE is_published = true AND review_status <> 'approved';

-- 3) SkillForge golden calibration
CREATE TABLE IF NOT EXISTS public.package_golden_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  origin_version_id UUID REFERENCES public.package_versions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  label_pass BOOLEAN NOT NULL DEFAULT true,
  label_source TEXT NOT NULL DEFAULT 'reference' CHECK (label_source IN ('human','reference','imported')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  frozen BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.package_golden_cases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.package_golden_cases TO authenticated;
GRANT ALL ON public.package_golden_cases TO service_role;

CREATE INDEX IF NOT EXISTS idx_golden_cases_pkg ON public.package_golden_cases(package_id, is_active);
ALTER TABLE public.package_golden_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "golden read public" ON public.package_golden_cases;
CREATE POLICY "golden read public"
  ON public.package_golden_cases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = package_id
      AND (p.is_published OR p.author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

DROP POLICY IF EXISTS "golden author write" ON public.package_golden_cases;
CREATE POLICY "golden author write"
  ON public.package_golden_cases FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = package_id
      AND (p.author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

ALTER TABLE public.package_evaluations
  ADD COLUMN IF NOT EXISTS judge_calibration JSONB;
ALTER TABLE public.package_evaluations
  ADD COLUMN IF NOT EXISTS evolution_trace JSONB;

INSERT INTO public.package_golden_cases (package_id, origin_version_id, title, input, expected_output, label_pass, label_source)
SELECT pv.package_id, pv.id,
       COALESCE(ex->>'title', 'case'),
       COALESCE(ex->>'input', ''),
       COALESCE(ex->>'expected_output', ''),
       true, 'reference'
FROM (
  SELECT DISTINCT ON (package_id) package_id, id, examples
  FROM public.package_versions
  ORDER BY package_id, created_at DESC
) pv
CROSS JOIN LATERAL jsonb_array_elements(pv.examples) AS ex
WHERE COALESCE(ex->>'input','') <> '' AND COALESCE(ex->>'expected_output','') <> '';

-- 4) OAuth private URI schemes (RFC 8252)
CREATE OR REPLACE FUNCTION public.mcp_oauth_register_client(
  _client_name text, _redirect_uris text[],
  _client_uri text DEFAULT NULL, _logo_uri text DEFAULT NULL,
  _software_id text DEFAULT NULL, _software_version text DEFAULT NULL,
  _ip text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _cid TEXT; _u TEXT; _scheme TEXT;
BEGIN
  IF _redirect_uris IS NULL OR array_length(_redirect_uris, 1) IS NULL THEN
    RAISE EXCEPTION 'redirect_uris_required';
  END IF;
  FOREACH _u IN ARRAY _redirect_uris LOOP
    IF _u IS NULL OR length(_u) < 3 OR length(_u) > 2000 THEN
      RAISE EXCEPTION 'invalid_redirect_uri';
    END IF;
    IF _u LIKE 'https://%'
       OR _u LIKE 'http://localhost%'
       OR _u LIKE 'http://127.0.0.1%'
       OR _u LIKE 'http://[::1]%' THEN
      CONTINUE;
    END IF;
    IF _u LIKE 'http://%' THEN
      RAISE EXCEPTION 'redirect_uri_must_be_https_or_loopback: %', _u;
    END IF;
    _scheme := substring(_u from '^([a-zA-Z][a-zA-Z0-9+.\-]*):');
    IF _scheme IS NULL THEN
      RAISE EXCEPTION 'redirect_uri_must_be_https_or_loopback: %', _u;
    END IF;
  END LOOP;

  _cid := 'mcp_' || encode(extensions.gen_random_bytes(18), 'hex');
  INSERT INTO public.mcp_oauth_clients (
    client_id, client_name, redirect_uris, client_uri, logo_uri,
    software_id, software_version, created_ip
  ) VALUES (
    _cid, COALESCE(NULLIF(trim(_client_name), ''), 'MCP Client'),
    _redirect_uris, _client_uri, _logo_uri, _software_id, _software_version, _ip
  );
  RETURN jsonb_build_object(
    'client_id', _cid,
    'client_name', COALESCE(NULLIF(trim(_client_name), ''), 'MCP Client'),
    'redirect_uris', _redirect_uris,
    'token_endpoint_auth_method', 'none',
    'grant_types', ARRAY['authorization_code','refresh_token'],
    'response_types', ARRAY['code'],
    'scope', 'mcp:read mcp:write'
  );
END $$;

-- 5) Admin-only publish trigger
CREATE OR REPLACE FUNCTION public.enforce_admin_only_publish()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF NOT _flipping_to_public THEN RETURN NEW; END IF;
  IF current_setting('request.jwt.claim.role', TRUE) = 'service_role'
     OR current_user = 'service_role'
     OR session_user = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'marketplace_publish_forbidden: must be signed in' USING ERRCODE = '42501';
  END IF;
  SELECT TRUE INTO _is_admin FROM public.user_roles
    WHERE user_id = _uid AND role = 'admin' LIMIT 1;
  IF NOT COALESCE(_is_admin, FALSE) THEN
    RAISE EXCEPTION 'marketplace_publish_forbidden: only admins can list packages on the public marketplace.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_admin_only_publish ON public.packages;
CREATE TRIGGER trg_enforce_admin_only_publish
  BEFORE INSERT OR UPDATE OF is_published ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_only_publish();

-- 6) SkillForge efficiency axis
ALTER TABLE public.package_evaluations
  ADD COLUMN IF NOT EXISTS efficiency JSONB;
COMMENT ON COLUMN public.package_evaluations.efficiency IS
  'Baseline-run efficiency breakdown';