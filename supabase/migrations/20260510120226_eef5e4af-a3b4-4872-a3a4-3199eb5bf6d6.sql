
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'publisher', 'user');
CREATE TYPE public.package_type AS ENUM ('skill', 'playbook', 'soul', 'guardrail');
CREATE TYPE public.version_status AS ENUM ('stable', 'beta', 'deprecated', 'candidate');
CREATE TYPE public.run_status AS ENUM ('running', 'ok', 'error', 'blocked');
CREATE TYPE public.learning_kind AS ENUM ('miss', 'hallucination', 'win', 'suggestion', 'block');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles read self" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto profile + default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user_' || substr(NEW.id::text, 1, 8)
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Packages
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type public.package_type NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_handle TEXT NOT NULL DEFAULT '@agentforge',
  author_verified BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL,
  long_description TEXT,
  license TEXT NOT NULL DEFAULT 'MIT',
  latest_version TEXT NOT NULL DEFAULT '0.1.0',
  scopes TEXT[] NOT NULL DEFAULT ARRAY['agent:upgrade','registry:read'],
  is_published BOOLEAN NOT NULL DEFAULT true,
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages read public" ON public.packages FOR SELECT USING (is_published OR author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "packages author write" ON public.packages FOR ALL USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "packages author insert" ON public.packages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Package versions
CREATE TABLE public.package_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  status public.version_status NOT NULL DEFAULT 'stable',
  notes TEXT,
  system_prompt TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  compatibility JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_version_id UUID REFERENCES public.package_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, version)
);
ALTER TABLE public.package_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions read public" ON public.package_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_id AND (p.is_published OR p.author_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "versions author write" ON public.package_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_id AND (p.author_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

-- Runs
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  package_slugs TEXT[] NOT NULL DEFAULT '{}',
  package_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.run_status NOT NULL DEFAULT 'running',
  output TEXT,
  error TEXT,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  health NUMERIC(5,2),
  precision_score NUMERIC(5,2),
  hallucination_rate NUMERIC(5,2),
  guardrail_blocks JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs self read" ON public.runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "runs self insert" ON public.runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "runs self update" ON public.runs FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX runs_user_idx ON public.runs(user_id, started_at DESC);
CREATE INDEX runs_slugs_idx ON public.runs USING GIN(package_slugs);

-- Run events
CREATE TABLE public.run_events (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.run_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events self read" ON public.run_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.runs r WHERE r.id = run_id AND r.user_id = auth.uid())
);
CREATE INDEX run_events_run_idx ON public.run_events(run_id, ts);

-- Daily metrics aggregation
CREATE TABLE public.package_metrics_daily (
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  runs INTEGER NOT NULL DEFAULT 0,
  ok_runs INTEGER NOT NULL DEFAULT 0,
  error_runs INTEGER NOT NULL DEFAULT 0,
  blocked_runs INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms NUMERIC(10,2) DEFAULT 0,
  avg_health NUMERIC(5,2) DEFAULT 0,
  avg_precision NUMERIC(5,2) DEFAULT 0,
  avg_hallucination NUMERIC(5,2) DEFAULT 0,
  PRIMARY KEY (package_id, day)
);
ALTER TABLE public.package_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics public read" ON public.package_metrics_daily FOR SELECT USING (true);

-- Trigger to update metrics on run completion
CREATE OR REPLACE FUNCTION public.update_package_metrics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s TEXT;
  pid UUID;
BEGIN
  IF NEW.status = 'running' OR NEW.ended_at IS NULL THEN RETURN NEW; END IF;
  IF OLD.ended_at IS NOT NULL THEN RETURN NEW; END IF;
  FOREACH s IN ARRAY NEW.package_slugs LOOP
    SELECT id INTO pid FROM public.packages WHERE slug = s;
    IF pid IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.package_metrics_daily (package_id, day, runs, ok_runs, error_runs, blocked_runs, avg_latency_ms, avg_health, avg_precision, avg_hallucination)
    VALUES (
      pid, CURRENT_DATE, 1,
      CASE WHEN NEW.status='ok' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status='error' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status='blocked' THEN 1 ELSE 0 END,
      COALESCE(NEW.latency_ms,0),
      COALESCE(NEW.health,0),
      COALESCE(NEW.precision_score,0),
      COALESCE(NEW.hallucination_rate,0)
    )
    ON CONFLICT (package_id, day) DO UPDATE SET
      runs = package_metrics_daily.runs + 1,
      ok_runs = package_metrics_daily.ok_runs + EXCLUDED.ok_runs,
      error_runs = package_metrics_daily.error_runs + EXCLUDED.error_runs,
      blocked_runs = package_metrics_daily.blocked_runs + EXCLUDED.blocked_runs,
      avg_latency_ms = ((package_metrics_daily.avg_latency_ms * package_metrics_daily.runs) + COALESCE(NEW.latency_ms,0)) / (package_metrics_daily.runs + 1),
      avg_health = ((package_metrics_daily.avg_health * package_metrics_daily.runs) + COALESCE(NEW.health,0)) / (package_metrics_daily.runs + 1),
      avg_precision = ((package_metrics_daily.avg_precision * package_metrics_daily.runs) + COALESCE(NEW.precision_score,0)) / (package_metrics_daily.runs + 1),
      avg_hallucination = ((package_metrics_daily.avg_hallucination * package_metrics_daily.runs) + COALESCE(NEW.hallucination_rate,0)) / (package_metrics_daily.runs + 1);
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_update_package_metrics
AFTER UPDATE ON public.runs
FOR EACH ROW EXECUTE FUNCTION public.update_package_metrics();

-- Ranking view
CREATE VIEW public.package_rankings AS
SELECT
  p.id, p.slug, p.name, p.type, p.author_handle, p.author_verified, p.description, p.latest_version, p.install_count,
  COALESCE(SUM(m.runs),0) AS total_runs,
  COALESCE(AVG(NULLIF(m.avg_health,0)),0) AS avg_health,
  COALESCE(AVG(NULLIF(m.avg_precision,0)),0) AS avg_precision,
  COALESCE(AVG(NULLIF(m.avg_hallucination,0)),0) AS avg_hallucination,
  COALESCE(AVG(NULLIF(m.avg_latency_ms,0)),0) AS avg_latency_ms,
  (
    0.4 * COALESCE(AVG(NULLIF(m.avg_precision,0))/100.0, 0)
    + 0.3 * COALESCE(AVG(NULLIF(m.avg_health,0))/100.0, 0)
    + 0.2 * LN(GREATEST(COALESCE(SUM(m.runs),0),1)+1)/8.0
    + 0.1 * (1.0 - LEAST(COALESCE(AVG(NULLIF(m.avg_hallucination,0))/10.0, 0), 1.0))
  ) AS score
FROM public.packages p
LEFT JOIN public.package_metrics_daily m ON m.package_id = p.id AND m.day >= CURRENT_DATE - INTERVAL '30 days'
WHERE p.is_published
GROUP BY p.id;

-- Learnings (MCP feedback loop)
CREATE TABLE public.learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  package_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  run_id UUID REFERENCES public.runs(id) ON DELETE SET NULL,
  kind public.learning_kind NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_patch TEXT,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  cluster_key TEXT,
  applied_in_version_id UUID REFERENCES public.package_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learnings public read" ON public.learnings FOR SELECT USING (true);
CREATE POLICY "learnings auth insert" ON public.learnings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX learnings_pkg_idx ON public.learnings(package_id, created_at DESC);
CREATE INDEX learnings_cluster_idx ON public.learnings(package_id, cluster_key);

-- Reviews (verified usage)
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  run_id_ref UUID REFERENCES public.runs(id) ON DELETE SET NULL,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, user_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews self write" ON public.reviews FOR ALL USING (auth.uid() = user_id);
-- Verified usage: must have at least one OK run with this package
CREATE OR REPLACE FUNCTION public.verify_review_usage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pkg_slug TEXT;
  has_run BOOLEAN;
BEGIN
  SELECT slug INTO pkg_slug FROM public.packages WHERE id = NEW.package_id;
  SELECT EXISTS (
    SELECT 1 FROM public.runs WHERE user_id = NEW.user_id AND status='ok' AND pkg_slug = ANY(package_slugs)
  ) INTO has_run;
  IF NOT has_run THEN
    RAISE EXCEPTION 'Review requires at least one successful run with this package';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_verify_review BEFORE INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.verify_review_usage();

-- MCP tokens (per-user)
CREATE TABLE public.mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokens self all" ON public.mcp_tokens FOR ALL USING (auth.uid() = user_id);

-- Presets (cloud-synced)
CREATE TABLE public.presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  package_slugs TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_id UUID REFERENCES public.runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets self" ON public.presets FOR ALL USING (auth.uid() = user_id);

-- Package installs
CREATE TABLE public.package_installs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, package_id)
);
ALTER TABLE public.package_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installs self" ON public.package_installs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "installs read all" ON public.package_installs FOR SELECT USING (true);
