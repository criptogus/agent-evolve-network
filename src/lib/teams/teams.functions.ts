import { readFrontmatter } from "@/lib/plugins/conformance";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ArtifactFilesSchema } from "@/lib/plugins/artifacts";
import { inspectContent } from "@/lib/security/prompt-injection-guard";
import { toJson } from "@/lib/json";
const Id = z.string().uuid();
const Role = z.enum(["viewer", "editor", "admin"]);
const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().trim().min(2).max(100) }),
  z.object({ action: z.literal("accept"), token: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({
    action: z.literal("invite"),
    workspace_id: Id,
    email: z.string().email().max(254),
    role: Role,
  }),
  z.object({ action: z.literal("set_role"), workspace_id: Id, user_id: Id, role: Role }),
  z.object({ action: z.literal("remove_member"), workspace_id: Id, user_id: Id }),
  z.object({
    action: z.literal("submit_skill"),
    workspace_id: Id,
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    name: z.string().min(2).max(120),
    description: z.string().max(1000),
    files: ArtifactFilesSchema,
  }),
  z.object({
    action: z.literal("review_skill"),
    workspace_id: Id,
    id: Id,
    status: z.enum(["approved", "rejected"]),
  }),
  z.object({
    action: z.literal("pin_package"),
    workspace_id: Id,
    slug: z.string().min(2).max(64),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  }),
  z.object({ action: z.literal("unpin_package"), workspace_id: Id, package_id: Id }),
]);
export type TeamAction = z.infer<typeof Action>;
export const manageTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Action.parse(d))
  .handler(async ({ context, data }) => {
    if (data.action === "submit_skill") {
      if (!data.files["SKILL.md"]) throw new Error("SKILL.md is required");
      const fm = readFrontmatter(data.files["SKILL.md"]);
      if (
        fm.name !== data.slug ||
        !fm.description ||
        data.files["SKILL.md"].replace(/^---[\s\S]*?---/, "").trim().length < 200
      )
        throw new Error(
          "SKILL.md needs a matching slug, description and at least 200 characters of instructions",
        );
      for (const [path, content] of Object.entries(data.files))
        if (inspectContent(content, { fence: false }).rejected)
          throw new Error(`Unsafe content in ${path}`);
    }
    const workspace = "workspace_id" in data ? data.workspace_id : undefined;
    const { action, ...payload } = data;
    const { data: result, error } = await context.supabase.rpc("team_action", {
      _action: action,
      _workspace: workspace,
      _payload: toJson(payload),
    });
    if (error) throw new Error(error.message);
    return z
      .object({ workspace_id: Id.optional(), token: z.string().optional(), id: Id.optional() })
      .parse(result);
  });
export const listTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("team_workspaces")
      .select("*")
      .order("created_at");
    if (error) throw new Error(error.message);
    return { teams: data ?? [], user_id: context.userId };
  });
export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspace_id: Id }).parse(d))
  .handler(async ({ context, data }) => {
    const db = context.supabase;
    const id = data.workspace_id;
    const [members, skills, pins, audit] = await Promise.all([
      db.from("team_members").select("*").eq("workspace_id", id),
      db
        .from("team_skill_versions")
        .select(
          "id,workspace_id,slug,version,name,description,status,created_by,reviewed_by,created_at,reviewed_at",
        )
        .eq("workspace_id", id)
        .order("created_at", { ascending: false }),
      db.from("team_library").select("*").eq("workspace_id", id),
      db
        .from("team_audit_events")
        .select("*")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    for (const r of [members, skills, pins, audit]) if (r.error) throw new Error(r.error.message);
    if (!members.data?.some((m) => m.user_id === context.userId))
      throw new Error("Workspace not found");
    const ids = (pins.data ?? []).map((p) => p.package_id);
    const versions = (pins.data ?? []).map((p) => p.version_id);
    const [pkgs, vers] = await Promise.all([
      ids.length
        ? db.from("packages").select("id,slug,name,is_published,review_status").in("id", ids)
        : { data: [], error: null },
      versions.length
        ? supabaseAdmin.from("package_versions").select("id,version").in("id", versions)
        : { data: [], error: null },
    ]);
    if (pkgs.error || vers.error) throw new Error("Unable to load pinned packages");
    return {
      members: members.data ?? [],
      skills: skills.data ?? [],
      audit: audit.data ?? [],
      pins: (pins.data ?? []).map((p) => ({
        ...p,
        package: (pkgs.data ?? []).find((k) => k.id === p.package_id) ?? null,
        version: (vers.data ?? []).find((v) => v.id === p.version_id)?.version ?? null,
      })),
    };
  });
export const downloadTeamSkill = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: Id }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("team_skill_versions")
      .select("slug,version,files")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Skill unavailable");
    return { ...row, files: ArtifactFilesSchema.parse(row.files) };
  });

export const downloadTeamPin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspace_id: Id, package_id: Id }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: pin, error } = await context.supabase
      .from("team_library")
      .select("version_id")
      .eq("workspace_id", data.workspace_id)
      .eq("package_id", data.package_id)
      .maybeSingle();
    if (error || !pin) throw new Error("Pinned package unavailable");
    const { data: pkg } = await context.supabase
      .from("packages")
      .select("slug")
      .eq("id", data.package_id)
      .maybeSingle();
    if (!pkg) throw new Error("Package unavailable");
    const { loadPluginPackage } = await import("@/lib/plugins/package.server");
    const bundle = await loadPluginPackage(pkg.slug, pin.version_id);
    if (!bundle)
      throw new Error("Package unavailable for public export; use its licensed installation flow");
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const [path, body] of bundle.files) zip.file(`${bundle.pluginName}/${path}`, body);
    return {
      base64: await zip.generateAsync({ type: "base64" }),
      filename: `${pkg.slug}-${bundle.manifest.version}.zip`,
    };
  });
