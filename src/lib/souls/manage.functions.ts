import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin as any;

const VersionStatus = z.enum(["stable", "beta", "deprecated", "candidate"]);

// ----- helpers -----
function parseSemver(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function semverGt(a: string, b: string): boolean {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a.localeCompare(b) > 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return false;
}
function semverMax(versions: string[]): string {
  return versions.reduce((acc, v) => (semverGt(v, acc) ? v : acc), "0.0.0");
}

async function assertSoulOwnership(supabase: any, userId: string, slug: string) {
  const { data: pkg, error } = await supabase
    .from("packages")
    .select("id, author_id, latest_version, type")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Response(`Lookup failed: ${error.message}`, { status: 500 });
  if (!pkg) throw new Response("Soul not found", { status: 404 });
  if (pkg.type !== "soul") throw new Response("Not a soul package", { status: 400 });

  if (pkg.author_id !== userId) {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden: not the owner", { status: 403 });
  }
  return pkg as { id: string; author_id: string | null; latest_version: string; type: string };
}

// ----- ownership check (used by UI to show/hide owner panel) -----
export const getSoulOwnership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: pkg } = await supabase
      .from("packages")
      .select("author_id, type")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pkg || pkg.type !== "soul") return { is_owner: false, is_admin: false };
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return { is_owner: pkg.author_id === userId || !!isAdmin, is_admin: !!isAdmin };
  });

// ----- create version -----
const CreateInput = z.object({
  slug: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver (e.g. 1.2.3)"),
  status: VersionStatus.default("stable"),
  system_prompt: z.string().min(1),
  rules: z.any().default({}),
  examples: z.array(z.any()).default([]),
  notes: z.string().max(2000).optional(),
  set_as_current: z.boolean().default(true),
});

export const createSoulVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const pkg = await assertSoulOwnership(supabase, userId, data.slug);

    // ensure version doesn't already exist
    const { data: existing } = await supabase
      .from("package_versions")
      .select("id")
      .eq("package_id", pkg.id)
      .eq("version", data.version)
      .maybeSingle();
    if (existing) throw new Response(`Version ${data.version} already exists`, { status: 409 });

    // recommend monotonic increase but allow override; warn if not greater
    if (!semverGt(data.version, pkg.latest_version) && data.set_as_current) {
      // allowed but the new version won't outrank current — flag via note only if user opted in
    }

    // find parent (latest) for lineage
    const { data: parent } = await supabase
      .from("package_versions")
      .select("id")
      .eq("package_id", pkg.id)
      .eq("version", pkg.latest_version)
      .maybeSingle();

    const { data: ver, error: verErr } = await supabaseAdmin
      .from("package_versions")
      .insert({
        package_id: pkg.id,
        version: data.version,
        status: data.status,
        notes: data.notes ?? null,
        system_prompt: data.system_prompt,
        rules: data.rules ?? {},
        examples: data.examples ?? [],
        parent_version_id: parent?.id ?? null,
      })
      .select("id, version, status, created_at")
      .single();
    if (verErr) throw new Response(`Insert version failed: ${verErr.message}`, { status: 500 });

    if (data.set_as_current) {
      const { error: upErr } = await supabaseAdmin
        .from("packages")
        .update({ latest_version: data.version, updated_at: new Date().toISOString() })
        .eq("id", pkg.id);
      if (upErr) throw new Response(`Update latest failed: ${upErr.message}`, { status: 500 });
    }

    return { ok: true as const, version: ver };
  });

// ----- rollback / set current -----
const RollbackInput = z.object({
  slug: z.string().min(1),
  version: z.string().min(1),
});

export const rollbackSoulVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RollbackInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const pkg = await assertSoulOwnership(supabase, userId, data.slug);

    const { data: target } = await supabase
      .from("package_versions")
      .select("id, version")
      .eq("package_id", pkg.id)
      .eq("version", data.version)
      .maybeSingle();
    if (!target) throw new Response("Version not found", { status: 404 });

    const { error } = await supabaseAdmin
      .from("packages")
      .update({ latest_version: target.version, updated_at: new Date().toISOString() })
      .eq("id", pkg.id);
    if (error) throw new Response(`Rollback failed: ${error.message}`, { status: 500 });

    return { ok: true as const, latest_version: target.version, previous: pkg.latest_version };
  });

// ----- update version status (stable/beta/deprecated/candidate) -----
const StatusInput = z.object({
  slug: z.string().min(1),
  version: z.string().min(1),
  status: VersionStatus,
});

export const setSoulVersionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const pkg = await assertSoulOwnership(supabase, userId, data.slug);

    const { error } = await supabaseAdmin
      .from("package_versions")
      .update({ status: data.status })
      .eq("package_id", pkg.id)
      .eq("version", data.version);
    if (error) throw new Response(`Update status failed: ${error.message}`, { status: 500 });
    return { ok: true as const };
  });

// ----- suggest next semver -----
export function suggestNextVersion(versions: string[], bump: "patch" | "minor" | "major" = "patch") {
  const max = semverMax(versions.length ? versions : ["0.0.0"]);
  const p = parseSemver(max) ?? [0, 0, 0];
  if (bump === "major") return `${p[0] + 1}.0.0`;
  if (bump === "minor") return `${p[0]}.${p[1] + 1}.0`;
  return `${p[0]}.${p[1]}.${p[2] + 1}`;
}
