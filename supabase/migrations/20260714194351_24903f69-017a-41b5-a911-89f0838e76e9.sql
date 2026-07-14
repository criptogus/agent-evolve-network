CREATE OR REPLACE FUNCTION public._credit_apply(_user_id uuid, _delta integer, _reason credit_reason, _ref_type text, _ref_id uuid, _description text, _metadata jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  -- Serialize concurrent credit changes for this user via a transaction-scoped advisory lock.
  -- Postgres forbids FOR UPDATE with aggregates, so we lock explicitly instead of on the SUM query.
  PERFORM pg_advisory_xact_lock(hashtext('credit_ledger:' || _user_id::text));

  SELECT COALESCE(SUM(delta), 0)::int INTO current_balance
    FROM public.credit_ledger WHERE user_id = _user_id;

  new_balance := current_balance + _delta;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, description, metadata)
  VALUES (_user_id, _delta, new_balance, _reason, _ref_type, _ref_id, _description, COALESCE(_metadata,'{}'::jsonb));
  RETURN new_balance;
END $function$;