import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  AGENT_PROVIDERS,
  PROVIDER_IDS,
  buildSyncPlan,
  getProvider,
  providerDir,
  renderForProvider,
} from "@/lib/cloud-skills/providers";

const supabaseAdmin = _supabaseAdmin as any;
const json = (v: unknown) => JSON.stringify(v, null, 2);

async function requirePaidUser(ctx: any): Promise<string> {
  const userId = (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
  if (!userId) {
    throw new Error(json({ error: "unauthorized", hint: "Connect via OAuth to use your cloud skill library." }));
  }
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const isActive = !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!isActive) {
    throw new Error(json({
      error: "subscription_required",
      message: "Cloud sync requires Agent Pass or Enterprise. Upgrade at superagentskill.com/pricing.",
    }));
  }
  return userId;
}

export const cloudSkillsProvidersTool = defineTool({
  name: "cloud_skills_providers",
  description:
    "[CLOUD] List every agent tool your cloud skills can be synced into (Hermes, Claude Code, Codex, Cursor, Windsurf, Copilot, …) with the exact directory and file format each one expects. No auth required.",
  parameters: z.object({}),
  execute: async () =>
    json({
      count: AGENT_PROVIDERS.length,
      providers: AGENT_PROVIDERS.map((p) => ({
        id: p.id,
        label: p.label,
        user_dir: p.userDir,
        project_dir: p.projectDir,
        format: p.format,
        folder_per_skill: p.folderPerSkill,
        notes: p.notes ?? null,
      })),
      next_step: "Call cloud_skills_sync with a provider id to get the exact files to write.",
    }),
});

export const cloudSkillsSyncTool = defineTool({
  name: "cloud_skills_sync",
  description:
    "[CLOUD] Sync the user's online skill library into any agent tool. Returns the exact file paths and full file contents to write for the chosen provider, plus which local skills are already up to date and which are orphans (no longer in the cloud). Pass `installed` with what you found on disk to get a minimal diff. Requires OAuth + paid subscription.",
  parameters: z.object({
    provider: z.enum(PROVIDER_IDS as [string, ...string[]]).describe("Agent tool id from cloud_skills_providers"),
    scope: z.enum(["user", "project"]).default("user"),
    slugs: z.array(z.string()).max(200).optional().describe("Only sync these slugs; omit for the whole library"),
    tag: z.string().optional(),
    category: z.string().optional(),
    installed: z
      .array(z.object({ slug: z.string(), version: z.number().int().nullish() }))
      .max(500)
      .optional()
      .describe("Skills already present on disk for this provider/scope"),
    dry_run: z.boolean().default(false).describe("Omit file contents; just report the plan"),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const provider = getProvider(input.provider);
    if (!provider) return json({ error: "unknown_provider", providers: PROVIDER_IDS });

    let q = supabaseAdmin
      .from("cloud_skills")
      .select("slug, name, description, category, tags, version, content")
      .eq("user_id", userId)
      .order("slug");
    if (input.slugs?.length) q = q.in("slug", input.slugs);
    if (input.tag) q = q.contains("tags", [input.tag]);
    if (input.category) q = q.eq("category", input.category);

    const { data, error } = await q;
    if (error) return json({ error: error.message });

    const { actions, summary } = buildSyncPlan({
      provider,
      scope: input.scope,
      skills: data ?? [],
      installed: input.installed ?? [],
      includeContent: !input.dry_run,
    });

    return json({
      provider: { id: provider.id, label: provider.label, format: provider.format },
      scope: input.scope,
      target_dir: providerDir(provider, input.scope),
      summary,
      instructions: [
        `Create ${providerDir(provider, input.scope)} if it does not exist.`,
        "Write each entry with action=create or action=update to its `path` using the `content` verbatim.",
        "Entries with action=unchanged need no work.",
        "Entries with action=orphan exist on disk but not in the cloud library — delete them only after confirming with the user.",
        "Re-run with the updated `installed` list to verify the sync converged.",
      ],
      actions,
    });
  },
});

export const cloudSkillsSyncAllTool = defineTool({
  name: "cloud_skills_sync_all",
  description:
    "[CLOUD] One-shot fan-out: render the whole cloud library for several agent tools at once so the same skills work in Hermes, Claude Code, Codex, Cursor and others from a single call. Requires OAuth + paid subscription.",
  parameters: z.object({
    providers: z
      .array(z.enum(PROVIDER_IDS as [string, ...string[]]))
      .min(1)
      .max(AGENT_PROVIDERS.length)
      .describe("Agent tool ids to write for"),
    scope: z.enum(["user", "project"]).default("user"),
    slugs: z.array(z.string()).max(200).optional(),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);

    let q = supabaseAdmin
      .from("cloud_skills")
      .select("slug, name, description, category, tags, version, content")
      .eq("user_id", userId)
      .order("slug");
    if (input.slugs?.length) q = q.in("slug", input.slugs);

    const { data, error } = await q;
    if (error) return json({ error: error.message });
    const skills = data ?? [];

    const targets = input.providers
      .map((id: string) => getProvider(id))
      .filter((p): p is NonNullable<ReturnType<typeof getProvider>> => !!p);

    const files = targets.flatMap((provider) =>
      buildSyncPlan({ provider, scope: input.scope, skills, includeContent: true }).actions.map((a) => ({
        provider: provider.id,
        path: a.path,
        content: a.content ?? renderForProvider(provider, skills.find((s: any) => s.slug === a.slug)!),
      })),
    );

    return json({
      skill_count: skills.length,
      provider_count: targets.length,
      file_count: files.length,
      scope: input.scope,
      instructions: "Write every file at its `path` with the given `content`. Create parent directories as needed.",
      files,
    });
  },
});
