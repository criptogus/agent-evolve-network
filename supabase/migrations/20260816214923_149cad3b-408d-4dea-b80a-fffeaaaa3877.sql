GRANT INSERT ON public.newsletter_signups TO anon;
GRANT INSERT, SELECT ON public.newsletter_signups TO authenticated;
GRANT ALL ON public.newsletter_signups TO service_role;