
REVOKE EXECUTE ON FUNCTION public._credit_apply(uuid,integer,public.credit_reason,text,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_signup_bonus(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_package(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_credit_balance(uuid) FROM PUBLIC, anon;
