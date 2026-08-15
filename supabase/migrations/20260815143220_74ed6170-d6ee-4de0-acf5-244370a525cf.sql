CREATE TABLE public.cloud_skill_sync_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_label TEXT,
  scope TEXT NOT NULL,
  slug TEXT NOT NULL,
  path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'diverged',
  detail TEXT,
  local_lines INTEGER,
  cloud_lines INTEGER,
  local_only_lines INTEGER,
  local_content TEXT,
  cloud_hash TEXT,
  cloud_version INTEGER,
  client_name TEXT,
  decision TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT cloud_skill_sync_conflicts_scope_check CHECK (scope IN ('project','global')),
  CONSTRAINT cloud_skill_sync_conflicts_status_check CHECK (status IN ('pending','decided','applied','dismissed')),
  CONSTRAINT cloud_skill_sync_conflicts_decision_check CHECK (decision IS NULL OR decision IN ('merge','overwrite','keep_both','skip')),
  CONSTRAINT cloud_skill_sync_conflicts_unique UNIQUE (user_id, provider, scope, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_skill_sync_conflicts TO authenticated;
GRANT ALL ON public.cloud_skill_sync_conflicts TO service_role;

ALTER TABLE public.cloud_skill_sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync conflicts"
  ON public.cloud_skill_sync_conflicts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync conflicts"
  ON public.cloud_skill_sync_conflicts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync conflicts"
  ON public.cloud_skill_sync_conflicts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync conflicts"
  ON public.cloud_skill_sync_conflicts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX cloud_skill_sync_conflicts_user_status_idx
  ON public.cloud_skill_sync_conflicts (user_id, status, updated_at DESC);

CREATE TRIGGER cloud_skill_sync_conflicts_touch
  BEFORE UPDATE ON public.cloud_skill_sync_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();