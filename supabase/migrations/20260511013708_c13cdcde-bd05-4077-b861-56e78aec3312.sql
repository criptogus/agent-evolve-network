
CREATE OR REPLACE FUNCTION public.tg_user_mcp_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE IF NOT EXISTS public.user_mcp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  registry_id text NOT NULL,
  name text NOT NULL,
  transport text NOT NULL DEFAULT 'http',
  url text,
  command text,
  args jsonb NOT NULL DEFAULT '[]'::jsonb,
  env_provided jsonb NOT NULL DEFAULT '{}'::jsonb,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'connected',
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, registry_id)
);

ALTER TABLE public.user_mcp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_mcp self all" ON public.user_mcp_connections;
CREATE POLICY "user_mcp self all" ON public.user_mcp_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_mcp_set_updated ON public.user_mcp_connections;
CREATE TRIGGER user_mcp_set_updated BEFORE UPDATE ON public.user_mcp_connections
FOR EACH ROW EXECUTE FUNCTION public.tg_user_mcp_touch();
