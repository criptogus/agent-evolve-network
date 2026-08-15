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

const supabaseAdmin = _supabaseAdmin as any;
const json = (v: unknown) => JSON.stringify(v, null, 2);

const ScopeSchema = z.enum(["project", "global"]).default("project");

export const cloudSkillsTargetsTool = defineTool({
  name: "cloud_skills_targets",
  description:
    "[CLOUD] List the agent tools your cloud library can be synced into (Hermes, Claude Code, Codex, Cursor, Lovable, OpenClaw, Windsurf, Copilot, Zed, Gemini CLI, ...) with the exact directory and file layout each one expects.",
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

function buildFiles(providerId: string, scope: ProviderScope, skills: any[]) {
  const p = getProvider(providerId);
  if (!p) throw new Error(json({ error: "unknown_tool", tool: providerId, known: PROVIDER_IDS }));
  if (!p.dirs[scope])
    throw new Error(
      json({ error: "unsupported_scope", tool: providerId, supported: scopesFor(p) }),
    );
  return {
    provider: p,
    files: skills.map((s) => ({
      path: targetPath(p, scope, s.slug)!,
      slug: s.slug,
      version: s.version,
      content: renderSkillFile(p, s),
    })),
  };
}

export const cloudSkillsSyncTool = defineTool({
  name: "cloud_skills_sync",
  description:
    "[CLOUD] Materialise your private cloud library for one agent tool. Returns the exact file paths and file contents to write on disk (SKILL.md folders, flat Markdown or Cursor .mdc, depending on the tool). Requires OAuth + paid subscription. Nothing is deleted: files you no longer have in the cloud are only reported.",
  parameters: z.object({
    tool: z.string().min(1).describe(`One of: ${PROVIDER_IDS.join(", ")}`),
    scope: ScopeSchema,
    slugs: z.array(z.string()).max(200).optional().describe("Limit the sync to these slugs."),
    existing: z
      .array(z.object({ slug: z.string(), version: z.number().int().optional() }))
      .max(500)
      .optional()
      .describe("Skills already present locally, so unchanged ones can be skipped."),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const skills = await loadSkills(userId, input.slugs);
    const { provider, files } = buildFiles(input.tool, input.scope as ProviderScope, skills);

    const have = new Map((input.existing ?? []).map((e) => [e.slug, e.version ?? -1]));
    const write = files.filter((f) => have.get(f.slug) !== f.version);
    const unchanged = files.filter((f) => have.get(f.slug) === f.version).map((f) => f.slug);
    const orphans = (input.existing ?? [])
      .map((e) => e.slug)
      .filter((slug) => !files.some((f) => f.slug === slug));

    return json({
      tool: provider.id,
      label: provider.label,
      scope: input.scope,
      layout: provider.layout,
      directory: provider.dirs[input.scope as ProviderScope],
      note: provider.note,
      write_count: write.length,
      unchanged,
      orphans,
      instructions: [
        "Write every entry in `files` at its exact `path`, creating directories as needed.",
        "These files are private to this user — do not commit secrets or share them.",
        `Entries in \`orphans\` exist locally but not in the cloud library; ask before deleting.`,
      ],
      files: write,
    });
  },
});

export const cloudSkillsSyncAllTool = defineTool({
  name: "cloud_skills_sync_all",
  description:
    "[CLOUD] Same as cloud_skills_sync but for several agent tools in one call, so one library lands in Claude Code, Cursor, Codex, Hermes and others at once. Requires OAuth + paid subscription.",
  parameters: z.object({
    tools: z.array(z.string().min(1)).min(1).max(10),
    scope: ScopeSchema,
    slugs: z.array(z.string()).max(200).optional(),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const skills = await loadSkills(userId, input.slugs);

    const results = input.tools.map((t) => {
      try {
        const { provider, files } = buildFiles(t, input.scope as ProviderScope, skills);
        return {
          tool: provider.id,
          label: provider.label,
          directory: provider.dirs[input.scope as ProviderScope],
          files,
        };
      } catch (e: any) {
        return { tool: t, error: String(e?.message ?? e) };
      }
    });

    return json({
      scope: input.scope,
      skill_count: skills.length,
      instructions: "Write every file at its exact path for each tool. Do not delete anything.",
      results,
    });
  },
});
