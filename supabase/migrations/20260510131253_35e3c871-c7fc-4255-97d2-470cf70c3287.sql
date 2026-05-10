CREATE TABLE public.report_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_domain text NOT NULL,
  company text NOT NULL,
  role text NOT NULL,
  prompt text,
  stack_size integer NOT NULL DEFAULT 0,
  governance text,
  health_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_leads_email ON public.report_leads (email);
CREATE INDEX idx_report_leads_domain ON public.report_leads (email_domain);
ALTER TABLE public.report_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads public insert" ON public.report_leads FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "leads admin read" ON public.report_leads FOR SELECT TO public USING (public.has_role(auth.uid(), 'admin'::app_role));