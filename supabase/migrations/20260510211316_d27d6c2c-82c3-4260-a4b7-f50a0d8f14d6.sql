
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO service_role;
