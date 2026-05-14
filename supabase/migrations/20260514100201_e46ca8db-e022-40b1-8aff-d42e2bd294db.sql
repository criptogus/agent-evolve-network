-- Force any existing soul to be free
UPDATE public.packages SET price_credits = 0 WHERE type = 'soul' AND price_credits <> 0;

-- Trigger to enforce souls are always free
CREATE OR REPLACE FUNCTION public.enforce_souls_free()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type = 'soul' AND COALESCE(NEW.price_credits, 0) <> 0 THEN
    NEW.price_credits := 0;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_enforce_souls_free ON public.packages;
CREATE TRIGGER trg_enforce_souls_free
BEFORE INSERT OR UPDATE OF price_credits, type ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.enforce_souls_free();