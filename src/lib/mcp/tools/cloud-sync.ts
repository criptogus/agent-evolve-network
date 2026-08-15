import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { requirePaidUser } from "@/lib/mcp/tools/cloud-skills";
import {
  PROVIDERS,
  PROVIDER_IDS,
  getProvider,
  renderSkillFile,
  scopesFor,
  targetPath,
  type ProviderScope,
} from "@/lib/cloud-skills/providers";
import {
  CONFLICT_STRATEGIES,
  contentHash,
  detectConflict,
  resolveConflict,
  type ConflictStrategy,
  type LocalFile,
} from "@/lib/cloud-skills/conflicts";
import {
  recordPendingConflicts,
  clearResolvedConflicts,
  openConflictsForUser,
} from "@/lib/cloud-skills/pending-conflicts.server";

const supabaseAdmin = _supabaseAdmin as any;
const json = (v: unknown) => JSON.stringify(v, null, 2);

const ScopeSchema = z.enum(["project", "global"]).default("project");
const StrategySchema = z
  .enum(["ask", "overwrite", "merge", "keep_both"])
  .default("ask")
  .describe(
    "What to do when a different file already exists at the target path: ask (report only), overwrite (cloud wins), merge (cloud wins, local-only lines kept under a marked section), keep_both (write cloud version with a -sak suffix).",
  );
const ExistingSchema = z
  .array(
    z.object({
      slug: z.string(),
      version: z.number().int().optional(),
      content: z.string().max(200_000).optional(),
      content_hash: z.string().optional(),
    }),
  )
  .max(500)
  .optional()
  .describe(
    "Files already present locally. Send `content` (or `content_hash`) so conflicts can be detected exactly; `merge` requires `content`.",
  );

export const cloudSkillsTargetsTool = defineTool({
  name: "cloud_skills_targets",
  description:
    "[CLOUD] List the agent tools your cloud library can be synced into (Hermes, Claude Code, Codex, Cursor, Lovable, OpenClaw, Windsurf, Copilot, Zed, Gemini CLI, ...) with the exact directory and file layout each one expects, plus the available conflict strategies.",
  parameters: z.object({}),
  execute: async () =>
    json({
      count: PROVIDERS.length,
      targets: PROVIDERS.map((p) => ({
        tool: p.id,
        label: p.label,
        scopes: scopesFor(p),
        layout: p.layout,
        paths: scopesFor(p).map((s) => targetPath(p, s, "<slug>")),
        note: p.note,
      })),
      conflict_strategies: CONFLICT_STRATEGIES,
    }),
});

async function loadSkills(userId: string, slugs?: string[]) {
  let q = supabaseAdmin
    .from("cloud_skills")
    .select("slug, name, description, category, tags, version, content, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (slugs?.length) q = q.in("slug", slugs);
  const { data, error } = await q;
  if (error) throw new Error(json({ error: error.message }));
  return (data ?? []) as any[];
}

function planFor(
  providerId: string,
  scope: ProviderScope,
  skills: any[],
  existing: LocalFile[],
  strategy: ConflictStrategy,
) {
  const p = getProvider(providerId);
  if (!p) throw new Error(json({ error: "unknown_tool", tool: providerId, known: PROVIDER_IDS }));
  if (!p.dirs[scope])
    throw new Error(
      json({ error: "unsupported_scope", tool: providerId, supported: scopesFor(p) }),
    );

  const localBySlug = new Map(existing.map((e) => [e.slug, e]));
  const resolved = skills.map((s) => {
    const path = targetPath(p, scope, s.slug)!;
    const incoming = renderSkillFile(p, s);
    const local = localBySlug.get(s.slug);
    const conflict = detectConflict({
      slug: s.slug,
      path,
      incoming,
      cloudVersion: s.version,
      local,
    });
    const file = resolveConflict({ slug: s.slug, path, incoming, conflict, strategy, local });
    return { ...file, version: s.version, cloud_hash: contentHash(incoming), conflict_detail: conflict };
  });

  const orphans = existing
    .map((e) => e.slug)
    .filter((slug) => !skills.some((s) => s.slug === slug));

  return {
    provider: p,
    write: resolved.filter((r) => r.action !== "skip"),
    skipped: resolved
      .filter((r) => r.action === "skip")
      .map((r) => ({ slug: r.slug, path: r.path, reason: r.note, conflict: r.conflict })),
    conflicts: resolved
      .filter((r) => r.conflict === "diverged" || r.conflict === "unknown")
      .map((r) => ({ ...r.conflict_detail, resolution: r.action, applied_path: r.path })),
    orphans,
  };
}


/**
 * Keeps the web-app conflict queue in sync with what the agent just saw:
 * unresolved conflicts become pending items the user can decide on at
 * /account/cloud-skills, and anything no longer conflicting leaves the queue.
 */
async function syncConflictQueue(
  userId: string,
  plan: ReturnType<typeof planFor>,
  scope: ProviderScope,
  existing: LocalFile[],
  clientName?: string | null,
) {
  const localBySlug = new Map(existing.map((e) => [e.slug, e]));
  const unresolved = plan.conflicts.filter((c: any) => c.resolution === "skip");

  const queued = await recordPendingConflicts({
    userId,
    provider: plan.provider.id,
    providerLabel: plan.provider.label,
    scope,
    clientName,
    conflicts: unresolved.map((c: any) => ({
      slug: c.slug,
      path: c.path,
      kind: c.kind,
      detail: c.detail,
      local_lines: c.local_lines ?? null,
      cloud_lines: c.cloud_lines ?? null,
      local_only_lines: c.local_only_lines ?? null,
      local_content: localBySlug.get(c.slug)?.content ?? null,
      cloud_hash: null,
      cloud_version: null,
    })),
  });

  const unresolvedSlugs = new Set(unresolved.map((c: any) => c.slug));
  const settled = plan.write
    .map((f: any) => f.slug)
    .concat(plan.skipped.filter((s: any) => s.conflict === "identical").map((s: any) => s.slug))
    .filter((slug: string) => !unresolvedSlugs.has(slug));

  await clearResolvedConflicts({ userId, provider: plan.provider.id, scope, slugs: settled });

  return queued;
}

export const cloudSkillsSyncTool = defineTool({
  name: "cloud_skills_sync",
  description:
    "[CLOUD] Materialise your private cloud library for one agent tool. Returns the exact file paths and contents to write (SKILL.md folders, flat Markdown or Cursor .mdc). Detects conflicts when a different file already exists at the target path and resolves them with conflict_strategy: ask | overwrite | merge | keep_both. Requires OAuth + paid subscription. Nothing is ever deleted.",
  parameters: z.object({
    tool: z.string().min(1).describe(`One of: ${PROVIDER_IDS.join(", ")}`),
    scope: ScopeSchema,
    slugs: z.array(z.string()).max(200).optional().describe("Limit the sync to these slugs."),
    existing: ExistingSchema,
    conflict_strategy: StrategySchema,
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const skills = await loadSkills(userId, input.slugs);
    const plan = planFor(
      input.tool,
      input.scope as ProviderScope,
      skills,
      input.existing ?? [],
      input.conflict_strategy as ConflictStrategy,
    );

    const unresolved = plan.conflicts.filter((c) => c.resolution === "skip");
    const queued = await syncConflictQueue(
      userId,
      plan,
      input.scope as ProviderScope,
      input.existing ?? [],
      (ctx as any)?.clientName ?? null,
    );

    return json({
      tool: plan.provider.id,
      label: plan.provider.label,
      scope: input.scope,
      layout: plan.provider.layout,
      directory: plan.provider.dirs[input.scope as ProviderScope],
      note: plan.provider.note,
      conflict_strategy: input.conflict_strategy,
      write_count: plan.write.length,
      conflict_count: plan.conflicts.length,
      queued_for_review: queued,
      review_url: queued
        ? "https://superagentskill.com/account/cloud-skills#pending-conflicts"
        : undefined,
      unresolved_conflicts: unresolved,
      conflicts: plan.conflicts,
      skipped: plan.skipped,
      orphans: plan.orphans,
      instructions: [
        "Write every entry in `files` at its exact `path`, creating directories as needed.",
        "These files are private to this user — do not commit secrets or share them.",
        unresolved.length
          ? "Show the user the `unresolved_conflicts` list and ask which strategy to use, then call this tool again with conflict_strategy set to overwrite, merge or keep_both. They can also decide file by file at `review_url` and download the resolved files."
          : "No unresolved conflicts.",
        "Entries in `orphans` exist locally but not in the cloud library; ask before deleting.",
      ],
      files: plan.write.map((f) => ({
        slug: f.slug,
        path: f.path,
        action: f.action,
        version: f.version,
        note: f.note,
        content: f.content,
      })),
    });
  },
});

export const cloudSkillsSyncAllTool = defineTool({
  name: "cloud_skills_sync_all",
  description:
    "[CLOUD] Same as cloud_skills_sync but for several agent tools in one call, so one library lands in Claude Code, Cursor, Codex, Hermes and others at once. Supports the same conflict_strategy. Requires OAuth + paid subscription.",
  parameters: z.object({
    tools: z.array(z.string().min(1)).min(1).max(10),
    scope: ScopeSchema,
    slugs: z.array(z.string()).max(200).optional(),
    existing: z
      .record(z.string(), ExistingSchema.unwrap())
      .optional()
      .describe("Optional per-tool map of local files, keyed by tool id."),
    conflict_strategy: StrategySchema,
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const skills = await loadSkills(userId, input.slugs);

    const results = await Promise.all(input.tools.map(async (t) => {
      try {
        const plan = planFor(
          t,
          input.scope as ProviderScope,
          skills,
          (input.existing?.[t] as LocalFile[] | undefined) ?? [],
          input.conflict_strategy as ConflictStrategy,
        );
        const queued = await syncConflictQueue(
          userId,
          plan,
          input.scope as ProviderScope,
          (input.existing?.[t] as LocalFile[] | undefined) ?? [],
          (ctx as any)?.clientName ?? null,
        );
        return {
          queued_for_review: queued,
          tool: plan.provider.id,
          label: plan.provider.label,
          directory: plan.provider.dirs[input.scope as ProviderScope],
          conflict_count: plan.conflicts.length,
          conflicts: plan.conflicts,
          skipped: plan.skipped,
          orphans: plan.orphans,
          files: plan.write.map((f) => ({
            slug: f.slug,
            path: f.path,
            action: f.action,
            content: f.content,
          })),
        };
      } catch (e: any) {
        return { tool: t, error: String(e?.message ?? e) };
      }
    }));

    return json({
      scope: input.scope,
      skill_count: skills.length,
      conflict_strategy: input.conflict_strategy,
      instructions:
        "Write every file at its exact path for each tool. Never delete local files; unresolved conflicts must be confirmed with the user first.",
      results,
    });
  },
});

export const cloudSkillsPendingConflictsTool = defineTool({
  name: "cloud_skills_pending_conflicts",
  description:
    "[CLOUD] List the sync conflicts still waiting for a human decision, per tool and scope, with the exact file paths. The user can decide file by file (merge | overwrite | keep both | skip) and finish the sync at /account/cloud-skills, or you can re-run cloud_skills_sync with an explicit conflict_strategy.",
  parameters: z.object({}),
  execute: async (_input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const items = await openConflictsForUser(userId);
    return json({
      count: items.length,
      review_url: "https://superagentskill.com/account/cloud-skills#pending-conflicts",
      pending: items.map((i) => ({
        tool: i.provider,
        label: i.provider_label,
        scope: i.scope,
        slug: i.slug,
        path: i.path,
        kind: i.kind,
        detail: i.detail,
        local_only_lines: i.local_only_lines,
        decision: i.decision,
        status: i.status,
        updated_at: i.updated_at,
      })),
      instructions: items.length
        ? "Ask the user how to resolve each file, then either re-run cloud_skills_sync with the chosen conflict_strategy or point them to review_url to confirm and download the resolved files."
        : "Nothing is waiting on a human decision.",
    });
  },
});
