-- 1. Internal-only database functions: callable by the server, not by browsers.
REVOKE EXECUTE ON FUNCTION public.compute_skill_drift(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_skill_drift(uuid, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.mcp_check_and_log_call(uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_check_and_log_call(uuid, text, text, boolean) TO service_role;
REVOKE EXECUTE ON FUNCTION public.report_skill_execution(text, boolean, text, text, integer, integer, integer, text, text, text, text, boolean, boolean, smallint, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_skill_execution(text, boolean, text, text, integer, integer, integer, text, text, text, text, boolean, boolean, smallint, integer, integer, text) TO service_role;

-- 2. Credit balance: only your own (admins and the server may read any).
CREATE OR REPLACE FUNCTION public.get_credit_balance(_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(delta), 0)::int
    FROM public.credit_ledger
   WHERE user_id = _user_id
     AND (_user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR auth.role() = 'service_role')
$function$;
REVOKE EXECUTE ON FUNCTION public.get_credit_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_credit_balance(uuid) TO authenticated, service_role;

-- 3. Star counts are maintained only by the stars trigger, never written by authors.
CREATE OR REPLACE FUNCTION public.guard_package_trust_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- star_count may change only from the package_stars sync trigger (nested trigger call).
  IF pg_trigger_depth() <= 1 THEN
    NEW.star_count := OLD.star_count;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.author_verified := OLD.author_verified;
  NEW.author_handle   := OLD.author_handle;
  NEW.review_status   := OLD.review_status;
  NEW.reviewed_by     := OLD.reviewed_by;
  NEW.reviewed_at     := OLD.reviewed_at;
  NEW.is_published    := OLD.is_published;
  NEW.install_count   := OLD.install_count;
  NEW.author_id       := OLD.author_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_package_trust_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.star_count := 0;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.author_verified := false;
  NEW.is_published    := false;
  NEW.review_status   := 'draft';
  NEW.reviewed_by     := NULL;
  NEW.reviewed_at     := NULL;
  NEW.install_count   := 0;
  RETURN NEW;
END;
$function$;

-- 4. Authors may edit version content only while the package is not yet approved and live.
DROP POLICY IF EXISTS "versions author write" ON public.package_versions;
CREATE POLICY "versions admin write" ON public.package_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "versions author insert unreviewed" ON public.package_versions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.packages p
                       WHERE p.id = package_versions.package_id
                         AND p.author_id = auth.uid()
                         AND NOT (p.is_published AND p.review_status = 'approved')));
CREATE POLICY "versions author update unreviewed" ON public.package_versions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.packages p
                  WHERE p.id = package_versions.package_id
                    AND p.author_id = auth.uid()
                    AND NOT (p.is_published AND p.review_status = 'approved')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.packages p
                       WHERE p.id = package_versions.package_id
                         AND p.author_id = auth.uid()
                         AND NOT (p.is_published AND p.review_status = 'approved')));
CREATE POLICY "versions author delete unreviewed" ON public.package_versions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.packages p
                  WHERE p.id = package_versions.package_id
                    AND p.author_id = auth.uid()
                    AND NOT (p.is_published AND p.review_status = 'approved')));

-- 5. Stars only on packages that are publicly listed.
DROP POLICY IF EXISTS package_stars_insert_own ON public.package_stars;
CREATE POLICY package_stars_insert_own ON public.package_stars
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.packages p
                           WHERE p.id = package_stars.package_id
                             AND p.is_published AND p.review_status = 'approved'));

-- 6. Pack customizations: read your own; create only for packs you bought; the server runs them.
DROP POLICY IF EXISTS "pack_cust self all" ON public.pack_customizations;
CREATE POLICY "pack_cust read own or admin" ON public.pack_customizations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pack_cust insert own purchased" ON public.pack_customizations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.pack_purchases pp
                           WHERE pp.pack_id = pack_customizations.pack_id
                             AND pp.buyer_id = auth.uid()));

-- 7. Public catalog classification lives on the package, so listings never read version content.
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS vertical text;
COMMENT ON COLUMN public.packages.vertical IS 'Public catalog classification, synced from the latest version rules (vertical, else category, else domain).';

CREATE OR REPLACE FUNCTION public.package_vertical_from_rules(_rules jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    CASE WHEN jsonb_typeof(_rules->'vertical') = 'string' THEN NULLIF(_rules->>'vertical', '') END,
    CASE WHEN jsonb_typeof(_rules->'category') = 'string' THEN NULLIF(_rules->>'category', '') END,
    CASE WHEN jsonb_typeof(_rules->'domain') = 'string' THEN NULLIF(_rules->>'domain', '') END
  )
$function$;

CREATE OR REPLACE FUNCTION public.packages_sync_vertical()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.latest_version IS DISTINCT FROM OLD.latest_version THEN
    NEW.vertical := (SELECT public.package_vertical_from_rules(v.rules)
                       FROM public.package_versions v
                      WHERE v.package_id = NEW.id AND v.version = NEW.latest_version
                      ORDER BY v.created_at DESC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.package_versions_sync_vertical()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _v text := public.package_vertical_from_rules(NEW.rules);
BEGIN
  UPDATE public.packages p
     SET vertical = _v
   WHERE p.id = NEW.package_id
     AND p.latest_version = NEW.version
     AND p.vertical IS DISTINCT FROM _v;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.packages_sync_vertical() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_versions_sync_vertical() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_packages_sync_vertical ON public.packages;
CREATE TRIGGER trg_packages_sync_vertical
  BEFORE INSERT OR UPDATE OF latest_version ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.packages_sync_vertical();

DROP TRIGGER IF EXISTS trg_package_versions_sync_vertical ON public.package_versions;
CREATE TRIGGER trg_package_versions_sync_vertical
  AFTER INSERT OR UPDATE OF rules, version ON public.package_versions
  FOR EACH ROW EXECUTE FUNCTION public.package_versions_sync_vertical();

UPDATE public.packages p
   SET vertical = (SELECT public.package_vertical_from_rules(v.rules)
                     FROM public.package_versions v
                    WHERE v.package_id = p.id AND v.version = p.latest_version
                    ORDER BY v.created_at DESC LIMIT 1)
 WHERE p.vertical IS NULL;

-- 8. Workspace invites require a verified mailbox for the invited address.
CREATE OR REPLACE FUNCTION public.team_action(_action text, _workspace uuid DEFAULT NULL::uuid, _payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); role_name text; wid uuid:=_workspace; token text; inv public.team_invites; item public.team_skill_versions; target uuid; v_id uuid; pkg_id uuid; result jsonb:='{}';
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if _action='create' then
  if length(trim(coalesce(_payload->>'name',''))) not between 2 and 100 then raise exception 'INVALID_NAME'; end if;
  insert into public.team_workspaces(name,owner_id) values(trim(_payload->>'name'),uid) returning id into wid;
  insert into public.team_members values(wid,uid,'admin',now());
  result:=jsonb_build_object('workspace_id',wid);
 elsif _action='accept' then
  select * into inv from public.team_invites where token_hash=encode(extensions.digest(coalesce(_payload->>'token',''),'sha256'),'hex') for update;
  if inv.id is null or inv.accepted_at is not null or inv.expires_at<=now() or lower(inv.email)<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'INVALID_INVITE' using errcode='42501'; end if;
  -- Auto-confirmed sign-ups do not prove mailbox ownership, so require a confirmation link that was actually sent,
  -- or a sign-in provider (e.g. Google) that verified this same address.
  if not exists(select 1 from auth.users u where u.id=uid and lower(u.email)=lower(inv.email) and u.confirmation_sent_at is not null and u.email_confirmed_at is not null and u.email_confirmed_at>=u.confirmation_sent_at)
     and not exists(select 1 from auth.identities i where i.user_id=uid and i.provider<>'email' and lower(i.identity_data->>'email')=lower(inv.email) and lower(coalesce(i.identity_data->>'email_verified',''))='true')
  then raise exception 'EMAIL_NOT_VERIFIED' using errcode='42501'; end if;
  wid:=inv.workspace_id;
  -- Joining again must never overwrite an existing member's role.
  insert into public.team_members(workspace_id,user_id,role) values(wid,uid,inv.role) on conflict do nothing;
  update public.team_invites set accepted_at=now() where id=inv.id;
  result:=jsonb_build_object('workspace_id',wid);
 else
  -- Read the role after acquiring the lock, so a removed administrator cannot use a stale grant.
  perform 1 from public.team_workspaces where id=wid for update;
  role_name:=public.team_role(wid);
  if role_name is null then raise exception 'NOT_A_MEMBER' using errcode='42501'; end if;
  if _action='invite' then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   if _payload->>'role' not in ('viewer','editor','admin') or coalesce(_payload->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_INVITE'; end if;
   token:=encode(extensions.gen_random_bytes(32),'hex');
   insert into public.team_invites(workspace_id,email,role,token_hash,created_by) values(wid,lower(_payload->>'email'),_payload->>'role',encode(extensions.digest(token,'sha256'),'hex'),uid);
   result:=jsonb_build_object('token',token);
  elsif _action in ('set_role','remove_member') then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   target:=(_payload->>'user_id')::uuid;
   if exists(select 1 from public.team_workspaces where id=wid and owner_id=target) then raise exception 'OWNER_PROTECTED'; end if;
   if _action='remove_member' then delete from public.team_members where workspace_id=wid and user_id=target;
   else
    if coalesce(_payload->>'role','') not in ('viewer','editor','admin') then raise exception 'INVALID_ROLE'; end if;
    update public.team_members set role=_payload->>'role' where workspace_id=wid and user_id=target;
   end if;
  elsif _action='submit_skill' then
   if role_name not in ('editor','admin') then raise exception 'EDITOR_REQUIRED' using errcode='42501'; end if;
   if jsonb_typeof(_payload->'files')<>'object' or octet_length((_payload->'files')::text)>2000000 or not ((_payload->'files') ? 'SKILL.md') then raise exception 'INVALID_FILES'; end if;
   if (select count(*) from jsonb_each(_payload->'files')) not between 1 and 200 or exists(select 1 from jsonb_each(_payload->'files') f where jsonb_typeof(f.value)<>'string' or octet_length(f.value#>>'{}')>250000 or length(f.key) not between 1 and 240 or f.key ~ '(^/|^[A-Za-z]:|\\|(^|/)(\.\.?|\.git|\.ssh|node_modules|\.env[^/]*)(/|$)|//|/$|[[:cntrl:]])') then raise exception 'INVALID_FILES'; end if;
   insert into public.team_skill_versions(workspace_id,slug,version,name,description,files,created_by) values(wid,_payload->>'slug',_payload->>'version',_payload->>'name',coalesce(_payload->>'description',''),_payload->'files',uid) returning id into target;
   result:=jsonb_build_object('id',target);
  elsif _action='review_skill' then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   select * into item from public.team_skill_versions where id=(_payload->>'id')::uuid and workspace_id=wid for update;
   if item.id is null or item.status<>'pending' then raise exception 'NOT_PENDING'; end if;
   if item.created_by=uid then raise exception 'INDEPENDENT_REVIEW_REQUIRED'; end if;
   if coalesce(_payload->>'status','') not in ('approved','rejected') then raise exception 'INVALID_STATUS'; end if;
   update public.team_skill_versions set status=_payload->>'status',reviewed_by=uid,reviewed_at=now() where id=item.id;
  elsif _action='pin_package' then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   select p.id,v.id into pkg_id,v_id from public.packages p join public.package_versions v on v.package_id=p.id where p.slug=_payload->>'slug' and v.version=_payload->>'version' and p.is_published and p.review_status='approved' and v.version=p.latest_version;
   if v_id is null then raise exception 'APPROVED_VERSION_REQUIRED'; end if;
   insert into public.team_library(workspace_id,package_id,version_id,pinned_by) values(wid,pkg_id,v_id,uid) on conflict(workspace_id,package_id) do update set version_id=excluded.version_id,pinned_by=uid,pinned_at=now();
  elsif _action='unpin_package' then
   if role_name<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
   delete from public.team_library where workspace_id=wid and package_id=(_payload->>'package_id')::uuid;
  else raise exception 'UNKNOWN_ACTION';
  end if;
 end if;
 insert into public.team_audit_events(workspace_id,actor_id,action,detail) values(wid,uid,_action,jsonb_strip_nulls(jsonb_build_object('id',_payload->>'id','slug',_payload->>'slug','version',_payload->>'version','role',_payload->>'role','user_id',_payload->>'user_id','package_id',_payload->>'package_id','status',_payload->>'status')));
 return result;
end $function$;