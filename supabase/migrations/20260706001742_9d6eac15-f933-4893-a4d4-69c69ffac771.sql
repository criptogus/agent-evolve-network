-- Finding 1: restore EXECUTE on has_role for anon so RLS policies that call it don't fail for signed-out visitors
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

-- Finding 2: add missing 'tags' column on packages (queried by use-case landing pages & bounty submit)
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_packages_tags ON public.packages USING gin (tags);