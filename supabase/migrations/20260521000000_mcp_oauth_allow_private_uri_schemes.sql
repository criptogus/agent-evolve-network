-- RFC 8252 §7: native MCP clients (Cursor, VS Code, Claude Desktop, Codex,
-- Lovable, Hermes, OpenClaw, …) register private-use URI scheme callbacks
-- such as cursor://callback. The previous validator only accepted https
-- and loopback http, so those clients fell back to a broken loopback
-- listener and the user ended up on a "site can't be reached" page.
--
-- This migration loosens the server-side check to also permit any
-- non-http private-use URI scheme (still rejecting plain http://… to a
-- non-loopback host, which would be unsafe).

CREATE OR REPLACE FUNCTION public.mcp_oauth_register_client(
  _client_name TEXT,
  _redirect_uris TEXT[],
  _client_uri TEXT,
  _logo_uri TEXT,
  _software_id TEXT,
  _software_version TEXT,
  _ip TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid TEXT;
  _u TEXT;
  _scheme TEXT;
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
      -- ok
      CONTINUE;
    END IF;
    -- Plain http to non-loopback is never allowed.
    IF _u LIKE 'http://%' THEN
      RAISE EXCEPTION 'redirect_uri_must_be_https_or_loopback: %', _u;
    END IF;
    -- Allow private-use URI schemes (RFC 8252 §7.1) like cursor://callback.
    _scheme := substring(_u from '^([a-zA-Z][a-zA-Z0-9+.\-]*):');
    IF _scheme IS NULL THEN
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
    _client_uri,
    _logo_uri,
    _software_id,
    _software_version,
    _ip
  );

  RETURN jsonb_build_object(
    'client_id', _cid,
    'client_name', COALESCE(NULLIF(trim(_client_name), ''), 'MCP Client'),
    'redirect_uris', _redirect_uris,
    'token_endpoint_auth_method', 'none',
    'grant_types', jsonb_build_array('authorization_code', 'refresh_token'),
    'response_types', jsonb_build_array('code')
  );
END;
$$;
