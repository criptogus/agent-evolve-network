import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePaidSubscription } from "./subscription-guard";
import { PROVIDER_IDS } from "./providers";

const TABLE = "cloud_skill_sync_conflicts";
const ScopeSchema = z.enum(["project", "global"]);
const DecisionSchema = z.enum(["merge", "overwrite", "keep_both", "skip"]);

const SELECT =
  "id, provider, provider_label, scope, slug, path, kind, detail, local_lines, cloud_lines, local_only_lines, cloud_version, client_name, decision, status, created_at, updated_at, local_content";

function toPending(r: any) {
  const { local_content, ...rest } = r;
  return { ...rest, has_local_content: !!local_content };
}

/** The caller's open conflict queue (waiting + already decided, not yet applied). */
export const listPendingConflicts = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .handler(async ({ context }) => {
    const { supabase: sb, userId } = context as any;
    const { data, error } = await (sb as any)
      .from(TABLE)
      .select(SELECT)
      .eq("user_id", userId)
      .in("status", ["pending", "decided"])
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error) throw new Response(error.message, { status: 500 });
    return { items: (data ?? []).map(toPending) };
  });

/** Record a per-file choice (merge / overwrite / keep both / skip). */
export const decidePendingConflicts = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) =>
    z
      .object({ ids: z.array(z.string().uuid()).min(1).max(300), decision: DecisionSchema })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const { error, count } = await (sb as any)
      .from(TABLE)
      .update(
        {
          decision: data.decision,
          decided_at: new Date().toISOString(),
          status: "decided",
        },
        { count: "exact" },
      )
      .eq("user_id", userId)
      .in("status", ["pending", "decided"])
      .in("id", data.ids);
    if (error) throw new Response(error.message, { status: 500 });
    return { updated: count ?? data.ids.length, decision: data.decision };
  });

/** Remove items from the queue without touching any file. */
export const dismissPendingConflicts = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(300) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const { error } = await (sb as any)
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .in("id", data.ids);
    if (error) throw new Response(error.message, { status: 500 });
    return { dismissed: data.ids.length };
  });

const ConfirmInput = z.object({
  tool: z.string().refine((v) => PROVIDER_IDS.includes(v), "Unknown tool"),
  scope: ScopeSchema,
  /** Preview only: build the plan without marking anything as finished. */
  dry_run: z.boolean().default(false),
});

/**
 * Final confirmation: turns the decided queue for one target into the exact
 * files to write, returns them as a private zip, and closes those queue items.
 * Strictly scoped to the caller's own skills and conflicts.
 */
export const confirmPendingConflicts = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => ConfirmInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: rows, error } = await supabase
      .from(TABLE)
      .select("id, slug, path, decision, local_content, provider_label")
      .eq("user_id", userId)
      .eq("provider", data.tool)
      .eq("scope", data.scope)
      .in("status", ["pending", "decided"])
      .limit(500);
    if (error) throw new Response(error.message, { status: 500 });
    if (!rows?.length) throw new Response("Nothing pending for this target", { status: 400 });

    const undecided = rows.filter((r: any) => !r.decision);
    if (undecided.length)
      throw new Response(
        `${undecided.length} file(s) still need a decision before you can finish this sync.`,
        { status: 400 },
      );

    const { data: skills, error: skillErr } = await supabase
      .from("cloud_skills")
      .select("slug, name, description, category, tags, version, content")
      .eq("user_id", userId)
      .in(
        "slug",
        rows.map((r: any) => r.slug),
      );
    if (skillErr) throw new Response(skillErr.message, { status: 500 });

    const { buildResolvedFiles } = await import("./pending-conflicts");
    const { getProvider } = await import("./providers");
    const provider = getProvider(data.tool)!;
    const { files, skipped } = buildResolvedFiles({
      providerId: data.tool,
      scope: data.scope,
      rows: rows as any,
      skills: (skills ?? []) as any,
    });

    let archive: { filename: string; base64: string; bytes: number } | null = null;
    if (files.length) {
      const { zipBundle, toBase64 } = await import("./bundle.server");
      const staged = files.map((f) => ({
        path: f.path.startsWith("~/") ? `home/${f.path.slice(2)}` : f.path,
        content: f.content,
      }));
      const bytes = await zipBundle(staged);
      archive = {
        filename: `sak-resolved-${provider.id}-${data.scope}-${files.length}-files.zip`,
        base64: toBase64(bytes),
        bytes: bytes.length,
      };
    }

    if (!data.dry_run) {
      const now = new Date().toISOString();
      await supabase
        .from(TABLE)
        .update({ status: "applied", updated_at: now })
        .eq("user_id", userId)
        .in(
          "id",
          rows.map((r: any) => r.id),
        );
    }

    return {
      tool: { id: provider.id, label: provider.label },
      scope: data.scope,
      directory: provider.dirs[data.scope] ?? null,
      applied: data.dry_run ? 0 : rows.length,
      dry_run: data.dry_run,
      files: files.map((f) => ({ slug: f.slug, path: f.path, action: f.action })),
      skipped,
      archive,
    };
  });

/**
 * Side-by-side preview data for one queued conflict: the local file captured by
 * the agent and the cloud version rendered for that tool. Scoped to the caller.
 */
export const getConflictPreview = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: row, error } = await supabase
      .from(TABLE)
      .select("id, provider, provider_label, scope, slug, path, kind, detail, local_content, cloud_version, decision")
      .eq("user_id", userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!row) throw new Response("Conflict not found", { status: 404 });

    const { data: skill, error: skillErr } = await supabase
      .from("cloud_skills")
      .select("slug, name, description, category, tags, version, content")
      .eq("user_id", userId)
      .eq("slug", row.slug)
      .maybeSingle();
    if (skillErr) throw new Response(skillErr.message, { status: 500 });

    const { getProvider, renderSkillFile } = await import("./providers");
    const provider = getProvider(row.provider);
    const cloud_content = provider && skill ? renderSkillFile(provider, skill as any) : null;

    return {
      id: row.id,
      path: row.path,
      slug: row.slug,
      kind: row.kind,
      detail: row.detail,
      decision: row.decision,
      provider_label: row.provider_label ?? provider?.label ?? row.provider,
      scope: row.scope,
      cloud_version: row.cloud_version,
      local_content: (row.local_content as string | null) ?? null,
      cloud_content,
      missing_skill: !skill,
    };
  });
