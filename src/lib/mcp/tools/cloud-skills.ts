import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashToken } from "@/lib/account/tokens.server";

const supabaseAdmin = _supabaseAdmin as any;
const json = (v: unknown) => JSON.stringify(v, null, 2);

async function resolveUserFromToken(token: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("mcp_tokens")
    .select("user_id,id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return null;
  await supabaseAdmin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data.user_id;
}

async function requirePaidUser(ctx: any): Promise<string> {
  const sessionUserId = (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
  const userId = sessionUserId;
  if (!userId) {
    throw new Error(json({
      error: "unauthorized",
      hint: "Connect via OAuth to use Cloud Skill Manager.",
    }));
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
      message: "Cloud Skill Manager requires Agent Pass or Enterprise. Upgrade at superagentskill.com/pricing.",
    }));
  }

  return userId;
}

export const cloudSkillsListTool = defineTool({
  name: "cloud_skills_list",
  description:
    "[CLOUD] List your saved cloud skills. Requires OAuth + paid subscription. Filter by category, tag, or search query.",
  parameters: z.object({
    category: z.string().optional(),
    tag: z.string().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);

    let q = supabaseAdmin
      .from("cloud_skills")
      .select("id, slug, name, description, category, tags, version, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(input.limit);

    if (input.category) q = q.eq("category", input.category);
    if (input.tag) q = q.contains("tags", [input.tag]);
    if (input.query) {
      const safe = input.query.replace(/[%,()]/g, " ").trim();
      if (safe) q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    const { data, error } = await q;
    if (error) return json({ error: error.message });
    return json({ count: data?.length ?? 0, skills: data ?? [] });
  },
});

export const cloudSkillsGetTool = defineTool({
  name: "cloud_skills_get",
  description:
    "[CLOUD] Get the full content of a cloud skill by slug. Requires OAuth + paid subscription.",
  parameters: z.object({
    slug: z.string().min(1),
  }),
  execute: async ({ slug }, ctx) => {
    const userId = await requirePaidUser(ctx);

    const { data: skill, error } = await supabaseAdmin
      .from("cloud_skills")
      .select("*")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) return json({ error: error.message });
    if (!skill) return json({ error: "not_found" });
    return json({ skill });
  },
});

export const cloudSkillsSaveTool = defineTool({
  name: "cloud_skills_save",
  description:
    "[CLOUD] Save a skill to your cloud library. Creates or updates by slug. Requires OAuth + paid subscription. Use this to save a local skill to the cloud for reuse across projects.",
  parameters: z.object({
    slug: z.string().min(2).max(64).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
    name: z.string().min(2).max(120),
    content: z.string().min(10).max(200_000),
    description: z.string().max(500).optional(),
    category: z.string().max(60).default("general"),
    tags: z.array(z.string().max(40)).max(10).default([]),
    variables: z.record(z.string(), z.any()).default({}),
    changelog: z.string().max(500).optional(),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);

    const { data: existing } = await supabaseAdmin
      .from("cloud_skills")
      .select("id, version, content")
      .eq("user_id", userId)
      .eq("slug", input.slug)
      .maybeSingle();

    if (existing) {
      const contentChanged = input.content !== existing.content;
      const newVersion = contentChanged ? existing.version + 1 : existing.version;

      const { data: skill, error } = await supabaseAdmin
        .from("cloud_skills")
        .update({
          name: input.name,
          description: input.description ?? null,
          category: input.category,
          tags: input.tags,
          content: input.content,
          variables: input.variables,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, slug, name, version")
        .single();
      if (error) return json({ error: error.message });

      if (contentChanged) {
        await supabaseAdmin.from("cloud_skill_versions").insert({
          cloud_skill_id: existing.id,
          version: newVersion,
          content: input.content,
          variables: input.variables,
          changelog: input.changelog ?? null,
        });
      }

      return json({ action: "updated", skill, version_bumped: contentChanged });
    }

    const { data: skill, error } = await supabaseAdmin
      .from("cloud_skills")
      .insert({
        user_id: userId,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        category: input.category,
        tags: input.tags,
        content: input.content,
        variables: input.variables,
        is_public: false,
        version: 1,
      })
      .select("id, slug, name, version")
      .single();
    if (error) return json({ error: error.message });

    await supabaseAdmin.from("cloud_skill_versions").insert({
      cloud_skill_id: skill.id,
      version: 1,
      content: input.content,
      variables: input.variables,
      changelog: input.changelog ?? "Initial save",
    });

    return json({ action: "created", skill });
  },
});

export const cloudSkillsDeleteTool = defineTool({
  name: "cloud_skills_delete",
  description:
    "[CLOUD] Delete a cloud skill by slug. Requires OAuth + paid subscription.",
  parameters: z.object({
    slug: z.string().min(1),
  }),
  execute: async ({ slug }, ctx) => {
    const userId = await requirePaidUser(ctx);

    const { error } = await supabaseAdmin
      .from("cloud_skills")
      .delete()
      .eq("user_id", userId)
      .eq("slug", slug);
    if (error) return json({ error: error.message });
    return json({ ok: true, deleted: slug });
  },
});

export const cloudSkillsExportTool = defineTool({
  name: "cloud_skills_export",
  description:
    "[CLOUD] Export a cloud skill as Markdown with YAML frontmatter (SKILL.md format), ready to paste into any project. Requires OAuth + paid subscription.",
  parameters: z.object({
    slug: z.string().min(1),
  }),
  execute: async ({ slug }, ctx) => {
    const userId = await requirePaidUser(ctx);

    const { data: skill } = await supabaseAdmin
      .from("cloud_skills")
      .select("*")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
    if (!skill) return json({ error: "not_found" });

    const frontmatter = [
      "---",
      `name: ${skill.name}`,
      `slug: ${skill.slug}`,
      skill.description ? `description: ${skill.description}` : null,
      `category: ${skill.category}`,
      skill.tags.length ? `tags: ${skill.tags.join(", ")}` : null,
      `version: ${skill.version}`,
      "---",
    ].filter(Boolean).join("\n");

    return `${frontmatter}\n\n${skill.content}`;
  },
});

export const cloudSkillsImportTool = defineTool({
  name: "cloud_skills_import",
  description:
    "[CLOUD] Import a skill file (Markdown with optional YAML frontmatter) into your cloud library. Parses name, category, tags from frontmatter. Requires OAuth + paid subscription.",
  parameters: z.object({
    filename: z.string().min(1).max(200),
    content: z.string().min(10).max(200_000),
  }),
  execute: async ({ filename, content }, ctx) => {
    const userId = await requirePaidUser(ctx);

    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    let meta: Record<string, string> = {};
    let body = content;

    if (frontmatterMatch) {
      for (const line of frontmatterMatch[1].split("\n")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          meta[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
        }
      }
      body = frontmatterMatch[2];
    }

    const baseName = filename.replace(/\.(md|yaml|yml|json|txt|skill)$/i, "");
    const slug = (meta.slug ?? baseName)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "imported-skill";

    let finalSlug = slug;
    let n = 1;
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from("cloud_skills")
        .select("id")
        .eq("user_id", userId)
        .eq("slug", finalSlug)
        .maybeSingle();
      if (!existing) break;
      n += 1;
      finalSlug = `${slug}-${n}`;
      if (n > 50) break;
    }

    const tags = meta.tags ? meta.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

    const { data: skill, error } = await supabaseAdmin
      .from("cloud_skills")
      .insert({
        user_id: userId,
        slug: finalSlug,
        name: meta.name ?? baseName,
        description: meta.description ?? null,
        category: meta.category ?? "imported",
        tags,
        content: body.trim(),
        variables: {},
        is_public: false,
        version: 1,
      })
      .select("id, slug, name, version")
      .single();
    if (error) return json({ error: error.message });

    await supabaseAdmin.from("cloud_skill_versions").insert({
      cloud_skill_id: skill.id,
      version: 1,
      content: body.trim(),
      variables: {},
      changelog: `Imported from ${filename}`,
    });

    return json({ action: "imported", skill, parsed_meta: meta });
  },
});
