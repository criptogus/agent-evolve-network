
-- 1) mcp_oauth_tokens: drop client SELECT access (tokens are managed server-side via SECURITY DEFINER fns)
DROP POLICY IF EXISTS "Users see their own MCP OAuth tokens" ON public.mcp_oauth_tokens;

-- 2) package_golden_cases: restrict reads to author/admin/purchasers
DROP POLICY IF EXISTS "golden read public" ON public.package_golden_cases;

CREATE POLICY "golden read author admin or purchaser"
ON public.package_golden_cases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = package_golden_cases.package_id
      AND (
        p.author_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.package_purchases pp
          WHERE pp.package_id = p.id AND pp.buyer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.pack_purchases pkp
          JOIN public.pack_items pi ON pi.pack_id = pkp.pack_id
          WHERE pi.package_id = p.id AND pkp.buyer_id = auth.uid()
        )
      )
  )
);

-- 3) package_versions: restrict full-row reads (including system_prompt) to author/admin/purchasers,
--    and expose a safe public view with non-sensitive columns for marketplace listings.
DROP POLICY IF EXISTS "versions read public" ON public.package_versions;

CREATE POLICY "versions read author admin or purchaser"
ON public.package_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.packages p
    WHERE p.id = package_versions.package_id
      AND (
        p.author_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.package_purchases pp
          WHERE pp.package_id = p.id AND pp.buyer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.pack_purchases pkp
          JOIN public.pack_items pi ON pi.pack_id = pkp.pack_id
          WHERE pi.package_id = p.id AND pkp.buyer_id = auth.uid()
        )
      )
  )
);

-- Safe public view: excludes system_prompt, rules, mcp_servers, permissions, live_resources
CREATE OR REPLACE VIEW public.package_versions_public
WITH (security_invoker = on) AS
SELECT
  v.id,
  v.package_id,
  v.version,
  v.status,
  v.notes,
  v.examples,
  v.compatibility,
  v.parent_version_id,
  v.created_at
FROM public.package_versions v
JOIN public.packages p ON p.id = v.package_id
WHERE p.is_published = true AND p.review_status = 'approved';

GRANT SELECT ON public.package_versions_public TO anon, authenticated;
