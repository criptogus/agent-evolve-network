CREATE TABLE public.cloud_skill_sync_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'mcp_sync',
  provider TEXT NOT NULL,
  provider_label TEXT,
  scope TEXT NOT NULL,
  strategy TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  client_name TEXT,
  skill_count INTEGER NOT NULL DEFAULT 0,
  written_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  unresolved_count INTEGER NOT NULL DEFAULT 0,
  orphan_count INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER,
  error TEXT,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
  orphans JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cloud_skill_sync_events TO authenticated;
GRANT ALL ON public.cloud_skill_sync_events TO service_role;

ALTER TABLE public.cloud_skill_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own sync history"
  ON public.cloud_skill_sync_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record their own sync events"
  ON public.cloud_skill_sync_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX cloud_skill_sync_events_user_created_idx
  ON public.cloud_skill_sync_events (user_id, created_at DESC);
CREATE INDEX cloud_skill_sync_events_user_provider_idx
  ON public.cloud_skill_sync_events (user_id, provider, scope, created_at DESC);