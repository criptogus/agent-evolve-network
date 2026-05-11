CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_signups_email_key
  ON public.newsletter_signups (lower(email));

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can subscribe" ON public.newsletter_signups;
CREATE POLICY "anyone can subscribe"
  ON public.newsletter_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND (source IS NULL OR length(source) <= 80)
  );

DROP POLICY IF EXISTS "admins can read signups" ON public.newsletter_signups;
CREATE POLICY "admins can read signups"
  ON public.newsletter_signups
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));