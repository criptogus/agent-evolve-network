
-- Feedback requests (server-created after each enrichment)
CREATE TABLE public.package_feedback_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id uuid REFERENCES public.packages(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.package_versions(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('author','autocreate','forge_loop','review_skill','upload','request_primitive','autolearn','evaluate')),
  source text NOT NULL DEFAULT 'ui' CHECK (source IN ('ui','mcp','cli','api')),
  source_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_package_feedback_requests_package ON public.package_feedback_requests(package_id);
CREATE INDEX idx_package_feedback_requests_user ON public.package_feedback_requests(source_user_id);

ALTER TABLE public.package_feedback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_requests_select_owner_or_creator"
  ON public.package_feedback_requests FOR SELECT
  TO authenticated
  USING (
    source_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_id AND p.author_id = auth.uid())
  );

-- Feedback submissions (UI users, MCP agents, CLI)
CREATE TABLE public.package_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES public.package_feedback_requests(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE CASCADE,
  kind text,
  source text NOT NULL CHECK (source IN ('ui','mcp','cli','api')),
  rating int CHECK (rating BETWEEN 1 AND 5),
  sentiment text CHECK (sentiment IN ('positive','neutral','negative')),
  comments text,
  agent_model text,
  submitter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_package_feedback_request ON public.package_feedback(request_id);
CREATE INDEX idx_package_feedback_package ON public.package_feedback(package_id);

ALTER TABLE public.package_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_select_owner_creator_submitter"
  ON public.package_feedback FOR SELECT
  TO authenticated
  USING (
    submitter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_id AND p.author_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.package_feedback_requests r
      WHERE r.id = request_id AND r.source_user_id = auth.uid()
    )
  );

-- Secure submission function: validates the request exists, isn't expired, and
-- isn't already fulfilled. Anonymous callers (MCP) can use this via service-role
-- proxies; authenticated callers (UI) get their auth.uid() recorded.
CREATE OR REPLACE FUNCTION public.submit_package_feedback(
  _request_id uuid,
  _rating int DEFAULT NULL,
  _sentiment text DEFAULT NULL,
  _comments text DEFAULT NULL,
  _source text DEFAULT 'ui',
  _agent_model text DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.package_feedback_requests;
  v_id uuid;
BEGIN
  SELECT * INTO v_req FROM public.package_feedback_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'feedback_request_not_found';
  END IF;
  IF v_req.fulfilled_at IS NOT NULL THEN
    RAISE EXCEPTION 'feedback_already_submitted';
  END IF;
  IF v_req.expires_at < now() THEN
    RAISE EXCEPTION 'feedback_request_expired';
  END IF;
  IF _rating IS NOT NULL AND (_rating < 1 OR _rating > 5) THEN
    RAISE EXCEPTION 'rating_out_of_range';
  END IF;
  IF _sentiment IS NOT NULL AND _sentiment NOT IN ('positive','neutral','negative') THEN
    RAISE EXCEPTION 'invalid_sentiment';
  END IF;
  IF _source NOT IN ('ui','mcp','cli','api') THEN
    RAISE EXCEPTION 'invalid_source';
  END IF;

  INSERT INTO public.package_feedback (
    request_id, package_id, kind, source, rating, sentiment, comments,
    agent_model, submitter_id, context
  ) VALUES (
    v_req.id, v_req.package_id, v_req.kind, _source, _rating, _sentiment,
    NULLIF(left(coalesce(_comments,''), 4000), ''),
    NULLIF(left(coalesce(_agent_model,''), 120), ''),
    auth.uid(), coalesce(_context, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  UPDATE public.package_feedback_requests
    SET fulfilled_at = now()
    WHERE id = v_req.id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_package_feedback(uuid,int,text,text,text,text,jsonb) TO anon, authenticated;
