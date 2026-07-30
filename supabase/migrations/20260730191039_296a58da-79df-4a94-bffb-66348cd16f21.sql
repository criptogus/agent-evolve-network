CREATE TABLE public.enterprise_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company text not null,
  contact_name text not null,
  work_email text not null,
  role text,
  team_size text,
  use_case text not null,
  ip_concerns text,
  nda_required boolean not null default true,
  nda_accepted boolean not null default false,
  nda_accepted_at timestamptz,
  nda_signer_name text,
  nda_ip text,
  checklist jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT INSERT ON public.enterprise_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.enterprise_requests TO authenticated;
GRANT ALL ON public.enterprise_requests TO service_role;

ALTER TABLE public.enterprise_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enterprise_requests_insert_anyone"
  ON public.enterprise_requests FOR INSERT TO anon, authenticated
  WITH CHECK (nda_accepted = true);

CREATE POLICY "enterprise_requests_admin_read"
  ON public.enterprise_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "enterprise_requests_admin_update"
  ON public.enterprise_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "enterprise_requests_admin_delete"
  ON public.enterprise_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER enterprise_requests_updated_at
  BEFORE UPDATE ON public.enterprise_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();