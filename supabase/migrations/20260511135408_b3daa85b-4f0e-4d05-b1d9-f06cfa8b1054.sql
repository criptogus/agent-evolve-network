-- ============================================================================
-- MCP OAuth 2.1 + PKCE + Dynamic Client Registration
-- ============================================================================

-- 1) Clients (one row per registered MCP client install)
CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL DEFAULT 'MCP Client',
  client_uri TEXT,
  logo_uri TEXT,
  redirect_uris TEXT[] NOT NULL,
  scope TEXT NOT NULL DEFAULT 'mcp:read mcp:write',
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
  grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code','refresh_token'],
  response_types TEXT[] NOT NULL DEFAULT ARRAY['code'],
  software_id TEXT,
  software_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_ip TEXT
);
ALTER TABLE public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
-- No direct policies — only security-definer functions touch this table.

-- 2) Authorization codes (short-lived, single-use)
CREATE TABLE IF NOT EXISTS public.mcp_oauth_authorizations (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mcp_oauth_authorizations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_auth_expires ON public.mcp_oauth_authorizations(expires_at);

-- 3) Tokens (access + refresh, hashed; tracks rotation lineage)
CREATE TABLE IF NOT EXISTS public.mcp_oauth_tokens (
  token_hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('access','refresh')),
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  parent_token_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_user ON public.mcp_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_client ON public.mcp_oauth_tokens(client_id);

-- Users can SEE their own tokens (for the Account → Connections page).
-- All writes go through security-definer functions; no INSERT/UPDATE/DELETE policy.
CREATE POLICY "Users see their own MCP OAuth tokens"
  ON public.mcp_oauth_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mcp_oauth_register_client(
  _client_name TEXT,
  _redirect_uris TEXT[],
  _client_uri TEXT DEFAULT NULL,
  _logo_uri TEXT DEFAULT NULL,
  _software_id TEXT DEFAULT NULL,
  _software_version TEXT DEFAULT NULL,
  _ip TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid TEXT;
  _u TEXT;
BEGIN
  IF _redirect_uris IS NULL OR array_length(_redirect_uris, 1) IS NULL THEN
    RAISE EXCEPTION 'redirect_uris_required';
  END IF;
  -- Validate each redirect URI
  FOREACH _u IN ARRAY _redirect_uris LOOP
    IF _u IS NULL OR length(_u) < 3 OR length(_u) > 2000 THEN
      RAISE EXCEPTION 'invalid_redirect_uri';
    END IF;
    IF NOT (_u LIKE 'https://%' OR _u LIKE 'http://localhost%' OR _u LIKE 'http://127.0.0.1%' OR _u LIKE 'http://[::1]%') THEN
      RAISE EXCEPTION 'redirect_uri_must_be_https_or_loopback: %', _u;
    END IF;
  END LOOP;

  _cid := 'mcp_' || encode(gen_random_bytes(18), 'hex');
  INSERT INTO public.mcp_oauth_clients (
    client_id, client_name, redirect_uris, client_uri, logo_uri,
    software_id, software_version, created_ip
  ) VALUES (
    _cid,
    COALESCE(NULLIF(trim(_client_name), ''), 'MCP Client'),
    _redirect_uris,
    _client_uri, _logo_uri, _software_id, _software_version, _ip
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
REVOKE ALL ON FUNCTION public.mcp_oauth_register_client(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_register_client(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.mcp_oauth_issue_code(
  _client_id TEXT,
  _redirect_uri TEXT,
  _scope TEXT,
  _code_challenge TEXT,
  _code_challenge_method TEXT,
  _code_hash TEXT,
  _ttl_seconds INT DEFAULT 600
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _client RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='28000'; END IF;
  IF _code_challenge_method <> 'S256' THEN RAISE EXCEPTION 'pkce_method_must_be_S256'; END IF;
  IF length(_code_challenge) < 32 OR length(_code_challenge) > 200 THEN RAISE EXCEPTION 'invalid_code_challenge'; END IF;

  SELECT * INTO _client FROM public.mcp_oauth_clients WHERE client_id = _client_id;
  IF _client.client_id IS NULL THEN RAISE EXCEPTION 'unknown_client'; END IF;
  IF NOT (_redirect_uri = ANY(_client.redirect_uris)) THEN
    RAISE EXCEPTION 'redirect_uri_mismatch';
  END IF;

  INSERT INTO public.mcp_oauth_authorizations (
    code_hash, client_id, user_id, redirect_uri, scope,
    code_challenge, code_challenge_method, expires_at
  ) VALUES (
    _code_hash, _client_id, _uid, _redirect_uri, COALESCE(NULLIF(trim(_scope), ''), 'mcp:read mcp:write'),
    _code_challenge, _code_challenge_method,
    now() + make_interval(secs => GREATEST(_ttl_seconds, 60))
  );
END $$;
REVOKE ALL ON FUNCTION public.mcp_oauth_issue_code(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_issue_code(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mcp_oauth_exchange_code(
  _client_id TEXT,
  _redirect_uri TEXT,
  _code_hash TEXT,
  _access_token_hash TEXT,
  _refresh_token_hash TEXT,
  _access_ttl_seconds INT DEFAULT 3600,
  _refresh_ttl_seconds INT DEFAULT 2592000
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _auth RECORD;
BEGIN
  SELECT * INTO _auth FROM public.mcp_oauth_authorizations
    WHERE code_hash = _code_hash FOR UPDATE;
  IF _auth.code_hash IS NULL THEN RAISE EXCEPTION 'invalid_grant'; END IF;
  IF _auth.used_at IS NOT NULL THEN RAISE EXCEPTION 'code_already_used'; END IF;
  IF _auth.expires_at <= now() THEN RAISE EXCEPTION 'code_expired'; END IF;
  IF _auth.client_id <> _client_id THEN RAISE EXCEPTION 'client_id_mismatch'; END IF;
  IF _auth.redirect_uri <> _redirect_uri THEN RAISE EXCEPTION 'redirect_uri_mismatch'; END IF;

  UPDATE public.mcp_oauth_authorizations SET used_at = now() WHERE code_hash = _code_hash;

  INSERT INTO public.mcp_oauth_tokens (token_hash, kind, client_id, user_id, scope, expires_at)
  VALUES (_access_token_hash, 'access', _client_id, _auth.user_id, _auth.scope,
          now() + make_interval(secs => GREATEST(_access_ttl_seconds, 60)));
  INSERT INTO public.mcp_oauth_tokens (token_hash, kind, client_id, user_id, scope, expires_at)
  VALUES (_refresh_token_hash, 'refresh', _client_id, _auth.user_id, _auth.scope,
          now() + make_interval(secs => GREATEST(_refresh_ttl_seconds, 3600)));

  RETURN jsonb_build_object(
    'user_id', _auth.user_id,
    'scope', _auth.scope,
    'access_ttl', _access_ttl_seconds,
    'refresh_ttl', _refresh_ttl_seconds
  );
END $$;
REVOKE ALL ON FUNCTION public.mcp_oauth_exchange_code(TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_exchange_code(TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.mcp_oauth_refresh_token(
  _client_id TEXT,
  _old_refresh_hash TEXT,
  _new_access_hash TEXT,
  _new_refresh_hash TEXT,
  _access_ttl_seconds INT DEFAULT 3600,
  _refresh_ttl_seconds INT DEFAULT 2592000
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _old RECORD;
BEGIN
  SELECT * INTO _old FROM public.mcp_oauth_tokens
    WHERE token_hash = _old_refresh_hash AND kind = 'refresh' FOR UPDATE;
  IF _old.token_hash IS NULL THEN RAISE EXCEPTION 'invalid_grant'; END IF;
  IF _old.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'refresh_revoked'; END IF;
  IF _old.expires_at <= now() THEN RAISE EXCEPTION 'refresh_expired'; END IF;
  IF _old.client_id <> _client_id THEN RAISE EXCEPTION 'client_id_mismatch'; END IF;

  -- Rotate: mark old refresh revoked + revoke any non-expired access tokens issued from the same client+user
  UPDATE public.mcp_oauth_tokens SET revoked_at = now() WHERE token_hash = _old_refresh_hash;
  UPDATE public.mcp_oauth_tokens
     SET revoked_at = now()
   WHERE client_id = _client_id AND user_id = _old.user_id AND kind = 'access'
     AND revoked_at IS NULL AND expires_at > now();

  INSERT INTO public.mcp_oauth_tokens (token_hash, kind, client_id, user_id, scope, parent_token_hash, expires_at)
  VALUES (_new_access_hash, 'access', _client_id, _old.user_id, _old.scope, _old_refresh_hash,
          now() + make_interval(secs => GREATEST(_access_ttl_seconds, 60)));
  INSERT INTO public.mcp_oauth_tokens (token_hash, kind, client_id, user_id, scope, parent_token_hash, expires_at)
  VALUES (_new_refresh_hash, 'refresh', _client_id, _old.user_id, _old.scope, _old_refresh_hash,
          now() + make_interval(secs => GREATEST(_refresh_ttl_seconds, 3600)));

  RETURN jsonb_build_object(
    'user_id', _old.user_id,
    'scope', _old.scope,
    'access_ttl', _access_ttl_seconds,
    'refresh_ttl', _refresh_ttl_seconds
  );
END $$;
REVOKE ALL ON FUNCTION public.mcp_oauth_refresh_token(TEXT, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_refresh_token(TEXT, TEXT, TEXT, TEXT, INT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.mcp_oauth_verify_access(_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t RECORD; _client_name TEXT;
BEGIN
  SELECT * INTO _t FROM public.mcp_oauth_tokens
   WHERE token_hash = _token_hash AND kind = 'access';
  IF _t.token_hash IS NULL THEN RETURN NULL; END IF;
  IF _t.revoked_at IS NOT NULL OR _t.expires_at <= now() THEN RETURN NULL; END IF;

  -- best-effort touch
  UPDATE public.mcp_oauth_tokens SET last_used_at = now() WHERE token_hash = _token_hash;

  SELECT client_name INTO _client_name FROM public.mcp_oauth_clients WHERE client_id = _t.client_id;

  RETURN jsonb_build_object(
    'user_id', _t.user_id,
    'client_id', _t.client_id,
    'client_name', _client_name,
    'scope', _t.scope,
    'expires_at', _t.expires_at
  );
END $$;
REVOKE ALL ON FUNCTION public.mcp_oauth_verify_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_verify_access(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.mcp_oauth_revoke_token(_token_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _row RECORD;
BEGIN
  SELECT * INTO _row FROM public.mcp_oauth_tokens WHERE token_hash = _token_hash;
  IF _row.token_hash IS NULL THEN RETURN; END IF;
  -- Authenticated users can revoke their own; service_role calls have auth.uid()=null, allowed.
  IF _uid IS NOT NULL AND _row.user_id <> _uid THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.mcp_oauth_tokens SET revoked_at = now() WHERE token_hash = _token_hash AND revoked_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.mcp_oauth_revoke_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_revoke_token(TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mcp_oauth_revoke_client_for_user(_client_id TEXT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _n INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.mcp_oauth_tokens
     SET revoked_at = now()
   WHERE client_id = _client_id AND user_id = _uid AND revoked_at IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.mcp_oauth_revoke_client_for_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_revoke_client_for_user(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.mcp_oauth_list_user_connections()
RETURNS TABLE(
  client_id TEXT,
  client_name TEXT,
  scope TEXT,
  active_access INT,
  active_refresh INT,
  first_granted TIMESTAMPTZ,
  last_used TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.client_id,
    c.client_name,
    max(t.scope) as scope,
    count(*) filter (where t.kind='access' and t.revoked_at is null and t.expires_at > now())::int as active_access,
    count(*) filter (where t.kind='refresh' and t.revoked_at is null and t.expires_at > now())::int as active_refresh,
    min(t.created_at) as first_granted,
    max(t.last_used_at) as last_used
  FROM public.mcp_oauth_tokens t
  JOIN public.mcp_oauth_clients c ON c.client_id = t.client_id
  WHERE t.user_id = auth.uid()
  GROUP BY t.client_id, c.client_name
  ORDER BY max(coalesce(t.last_used_at, t.created_at)) DESC;
$$;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_list_user_connections() TO authenticated;

CREATE OR REPLACE FUNCTION public.mcp_oauth_get_client(_client_id TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(c) - 'created_ip' FROM public.mcp_oauth_clients c WHERE c.client_id = _client_id;
$$;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_get_client(TEXT) TO anon, authenticated, service_role;