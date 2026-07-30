CREATE TABLE public.tenant_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alias text NOT NULL DEFAULT 'primary',
  fingerprint text NOT NULL,
  kdf_salt text NOT NULL,
  wrapped_dek text,
  verifier text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX tenant_encryption_keys_one_active
  ON public.tenant_encryption_keys (user_id) WHERE status = 'active';
CREATE INDEX tenant_encryption_keys_user_idx ON public.tenant_encryption_keys (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_encryption_keys TO authenticated;
GRANT ALL ON public.tenant_encryption_keys TO service_role;
ALTER TABLE public.tenant_encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own keys select" ON public.tenant_encryption_keys
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own keys insert" ON public.tenant_encryption_keys
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own keys update" ON public.tenant_encryption_keys
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own keys delete" ON public.tenant_encryption_keys
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.tenant_encrypted_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_id uuid NOT NULL REFERENCES public.tenant_encryption_keys(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'skill',
  ref text NOT NULL,
  ciphertext text NOT NULL,
  plaintext_sha256 text NOT NULL,
  byte_size integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref)
);

CREATE INDEX tenant_encrypted_objects_user_idx ON public.tenant_encrypted_objects (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_encrypted_objects TO authenticated;
GRANT ALL ON public.tenant_encrypted_objects TO service_role;
ALTER TABLE public.tenant_encrypted_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own objects select" ON public.tenant_encrypted_objects
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own objects insert" ON public.tenant_encrypted_objects
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own objects update" ON public.tenant_encrypted_objects
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own objects delete" ON public.tenant_encrypted_objects
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.tenant_key_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_id uuid,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_key_events_user_idx ON public.tenant_key_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.tenant_key_events TO authenticated;
GRANT ALL ON public.tenant_key_events TO service_role;
ALTER TABLE public.tenant_key_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own key events select" ON public.tenant_key_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own key events insert" ON public.tenant_key_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TRIGGER tenant_encryption_keys_touch BEFORE UPDATE ON public.tenant_encryption_keys
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tenant_encrypted_objects_touch BEFORE UPDATE ON public.tenant_encrypted_objects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();