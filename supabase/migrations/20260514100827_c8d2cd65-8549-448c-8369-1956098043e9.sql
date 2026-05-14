CREATE OR REPLACE FUNCTION public.mcp_oauth_register_client(_client_name text, _redirect_uris text[], _client_uri text DEFAULT NULL::text, _logo_uri text DEFAULT NULL::text, _software_id text DEFAULT NULL::text, _software_version text DEFAULT NULL::text, _ip text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _cid TEXT;
  _u TEXT;
BEGIN
  IF _redirect_uris IS NULL OR array_length(_redirect_uris, 1) IS NULL THEN
    RAISE EXCEPTION 'redirect_uris_required';
  END IF;
  FOREACH _u IN ARRAY _redirect_uris LOOP
    IF _u IS NULL OR length(_u) < 3 OR length(_u) > 2000 THEN
      RAISE EXCEPTION 'invalid_redirect_uri';
    END IF;
    IF NOT (_u LIKE 'https://%' OR _u LIKE 'http://localhost%' OR _u LIKE 'http://127.0.0.1%' OR _u LIKE 'http://[::1]%') THEN
      RAISE EXCEPTION 'redirect_uri_must_be_https_or_loopback: %', _u;
    END IF;
  END LOOP;

  _cid := 'mcp_' || encode(extensions.gen_random_bytes(18), 'hex');
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
END $function$;