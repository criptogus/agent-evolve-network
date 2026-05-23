-- Slice 1 of the MCP UX roadmap: server-side funnel telemetry and
-- idempotency keys for MCP write tools. Both backed by simple tables
-- with public RPCs so anonymous and authenticated callers can use them
-- (rate-limited by IP for the anonymous case).

-- ---------------------------------------------------------------------
-- mcp_funnel_events: append-only event log we use to figure out where
-- users drop out of the connect flow. Names are deliberately a
-- closed vocabulary (CHECK constraint) so we don't end up with the
-- typical "127 spellings of the same event" telemetry mess.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mcp_funnel_events (
  id          BIGSERIAL PRIMARY KEY,
  event       TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Stable, hashed (sha256 hex) so we can count uniques without
  -- storing PII / raw IPs.
  anon_hash   TEXT,
  client_id   TEXT,
  client_name TEXT,
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mcp_funnel_events_event_known CHECK (event IN (
    'connect_viewed',
    'oauth_authorize_viewed',
    'oauth_authorize_approved',
    'oauth_authorize_denied',
    'oauth_success_shown',
    'oauth_loopback_attempted',
    'oauth_manual_code_copied',
    'oauth_scheme_triggered',
    'mcp_first_call',
    'mcp_first_write',
    'install_button_clicked',
    'pat_minted'
  ))
);

CREATE INDEX IF NOT EXISTS mcp_funnel_events_event_created_idx
  ON public.mcp_funnel_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS mcp_funnel_events_user_idx
  ON public.mcp_funnel_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.mcp_funnel_events ENABLE ROW LEVEL SECURITY;
-- Only admins can read events directly. Writes go through the RPC.
CREATE POLICY mcp_funnel_events_admin_read
  ON public.mcp_funnel_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Public RPC used by browser/server callers to record an event. We
-- rate-limit anonymous callers per anon_hash to keep this from
-- becoming a spam vector.
CREATE OR REPLACE FUNCTION public.record_mcp_funnel_event(
  _event       TEXT,
  _client_id   TEXT DEFAULT NULL,
  _client_name TEXT DEFAULT NULL,
  _anon_hash   TEXT DEFAULT NULL,
  _props       JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _recent_count INT;
BEGIN
  -- Cheap throttle: anonymous callers can record at most 60 events per
  -- minute per anon_hash. Signed-in users are trusted (auth is the rate
  -- limit). NULL anon_hash from a signed-in user is fine.
  IF _uid IS NULL AND _anon_hash IS NOT NULL THEN
    SELECT count(*) INTO _recent_count
    FROM public.mcp_funnel_events
    WHERE anon_hash = _anon_hash
      AND created_at > now() - interval '1 minute';
    IF _recent_count >= 60 THEN
      RETURN; -- silently drop; never fail the user's flow on telemetry
    END IF;
  END IF;

  INSERT INTO public.mcp_funnel_events (
    event, user_id, anon_hash, client_id, client_name, props
  ) VALUES (
    _event, _uid, _anon_hash, _client_id, _client_name, COALESCE(_props, '{}'::jsonb)
  );
EXCEPTION WHEN OTHERS THEN
  -- Telemetry must NEVER break user flows.
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_mcp_funnel_event(TEXT, TEXT, TEXT, TEXT, JSONB)
  TO anon, authenticated;

-- Read-only aggregate the admin funnel page queries. Lives in SQL so
-- we don't ship a query that does a full table scan on every refresh.
CREATE OR REPLACE FUNCTION public.mcp_funnel_summary(_days INT DEFAULT 7)
RETURNS TABLE (event TEXT, count BIGINT, distinct_users BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.event,
    count(*) AS count,
    count(DISTINCT COALESCE(e.user_id::text, e.anon_hash)) AS distinct_users
  FROM public.mcp_funnel_events e
  WHERE e.created_at > now() - make_interval(days => GREATEST(_days, 1))
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  GROUP BY e.event
  ORDER BY count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.mcp_funnel_summary(INT) TO authenticated;

-- ---------------------------------------------------------------------
-- mcp_idempotency: per-user idempotency keys for MCP write tools so
-- agents that retry a failed upload don't end up creating duplicates.
-- The key is hashed (sha256 hex) so a leaked key still doesn't leak
-- the response payload directly via casual snooping.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mcp_idempotency (
  key_hash    TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool        TEXT NOT NULL,
  response    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (user_id, key_hash, tool)
);

CREATE INDEX IF NOT EXISTS mcp_idempotency_expires_idx
  ON public.mcp_idempotency (expires_at);

ALTER TABLE public.mcp_idempotency ENABLE ROW LEVEL SECURITY;
-- Direct access blocked; only the SECURITY DEFINER RPCs below touch it.

CREATE OR REPLACE FUNCTION public.mcp_idempotency_get(
  _user_id UUID, _key_hash TEXT, _tool TEXT
) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT response
  FROM public.mcp_idempotency
  WHERE user_id = _user_id
    AND key_hash = _key_hash
    AND tool = _tool
    AND expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mcp_idempotency_put(
  _user_id UUID, _key_hash TEXT, _tool TEXT, _response JSONB
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.mcp_idempotency (user_id, key_hash, tool, response)
  VALUES (_user_id, _key_hash, _tool, _response)
  ON CONFLICT (user_id, key_hash, tool) DO NOTHING;

  -- Lazy GC: every put has a chance to evict expired rows.
  IF random() < 0.05 THEN
    DELETE FROM public.mcp_idempotency WHERE expires_at < now();
  END IF;
END;
$$;

-- Server-only -- these RPCs are intentionally NOT granted to anon /
-- authenticated. The MCP route calls them via the service role.

COMMENT ON TABLE public.mcp_funnel_events IS
  'Append-only funnel telemetry for the MCP connect flow. Events use a closed vocabulary; anonymous callers are rate-limited to 60/min per anon_hash.';
COMMENT ON TABLE public.mcp_idempotency IS
  'Per-user idempotency keys for MCP write tools (upload_packages, request_primitive). 24h TTL; lazy GC on writes.';