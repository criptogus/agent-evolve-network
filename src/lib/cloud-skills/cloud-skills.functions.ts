import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePaidSubscription } from "./subscription-guard";
import {
  CreateCloudSkillInput,
  UpdateCloudSkillInput,
  ListCloudSkillsInput,
  ExportFormat,
} from "./schemas";

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------
export const listCloudSkills = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => ListCloudSkillsInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    let q = supabase
      .from("cloud_skills")
      .select("id, slug, name, description, category, tags, is_public, version, created_at, updated_at", { count: "exact" });

    if (data.include_public) {
      q = q.or(`user_id.eq.${userId},is_public.eq.true`);
    } else {
      q = q.eq("user_id", userId);
    }

    if (data.category) q = q.eq("category", data.category);
    if (data.tag) q = q.contains("tags", [data.tag]);
    if (data.query) {
      const safe = data.query.replace(/[%,()]/g, " ").trim();
      if (safe) {
        q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
      }
    }

    q = q.order("updated_at", { ascending: false }).range(data.offset, data.offset + data.limit - 1);

    const { data: skills, error, count } = await q;
    if (error) throw new Response(error.message, { status: 500 });

    return { skills: skills ?? [], total: count ?? 0 };
  });

// ---------------------------------------------------------------------------
// Get single
// ---------------------------------------------------------------------------
export const getCloudSkill = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: skill, error } = await supabase
      .from("cloud_skills")
      .select("*")
      .eq("id", data.id)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .maybeSingle();

    if (error) throw new Response(error.message, { status: 500 });
    if (!skill) throw new Response("Not found", { status: 404 });

    const { data: versions } = await supabase
      .from("cloud_skill_versions")
      .select("id, version, changelog, created_at")
      .eq("cloud_skill_id", skill.id)
      .order("version", { ascending: false })
      .limit(20);

    return { skill, versions: versions ?? [] };
  });

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export const createCloudSkill = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => CreateCloudSkillInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: existing } = await supabase
      .from("cloud_skills")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", data.slug)
      .maybeSingle();
    if (existing) throw new Response("A skill with this slug already exists", { status: 409 });

    const { data: skill, error } = await supabase
      .from("cloud_skills")
      .insert({
        user_id: userId,
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        tags: data.tags,
        content: data.content,
        variables: data.variables,
        is_public: data.is_public,
        version: 1,
      })
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 500 });

    await supabase.from("cloud_skill_versions").insert({
      cloud_skill_id: skill.id,
      version: 1,
      content: data.content,
      variables: data.variables,
      changelog: "Initial version",
    });

    return { skill };
  });

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export const updateCloudSkill = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => UpdateCloudSkillInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: current, error: fetchErr } = await supabase
      .from("cloud_skills")
      .select("id, version, content, variables")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (fetchErr) throw new Response(fetchErr.message, { status: 500 });
    if (!current) throw new Response("Not found or not owned by you", { status: 404 });

    const contentChanged = data.content && data.content !== current.content;
    const newVersion = contentChanged ? current.version + 1 : current.version;

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.category !== undefined) update.category = data.category;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.content !== undefined) update.content = data.content;
    if (data.variables !== undefined) update.variables = data.variables;
    if (data.is_public !== undefined) update.is_public = data.is_public;
    if (contentChanged) update.version = newVersion;

    const { data: skill, error } = await supabase
      .from("cloud_skills")
      .update(update)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 500 });

    if (contentChanged) {
      await supabase.from("cloud_skill_versions").insert({
        cloud_skill_id: skill.id,
        version: newVersion,
        content: data.content,
        variables: data.variables ?? current.variables,
        changelog: data.changelog ?? null,
      });
    }

    return { skill, version_bumped: !!contentChanged };
  });

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
export const deleteCloudSkill = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { error } = await supabase
      .from("cloud_skills")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Response(error.message, { status: 500 });

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Fork a public skill into your own library
// ---------------------------------------------------------------------------
export const forkCloudSkill = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) =>
    z.object({
      source_id: z.string().uuid(),
      new_slug: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: source, error: srcErr } = await supabase
      .from("cloud_skills")
      .select("*")
      .eq("id", data.source_id)
      .maybeSingle();
    if (srcErr || !source) throw new Response("Source skill not found", { status: 404 });
    if (source.user_id === userId) throw new Response("Cannot fork your own skill", { status: 400 });
    if (!source.is_public) throw new Response("Only public skills can be forked", { status: 403 });

    const newSlug = data.new_slug ?? `${source.slug}-fork-${Math.random().toString(36).slice(2, 6)}`;

    const { data: skill, error } = await supabase
      .from("cloud_skills")
      .insert({
        user_id: userId,
        slug: newSlug,
        name: `${source.name} (fork)`,
        description: source.description,
        category: source.category,
        tags: source.tags,
        content: source.content,
        variables: source.variables,
        is_public: false,
        version: 1,
        forked_from: source.id,
      })
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 500 });

    await supabase.from("cloud_skill_versions").insert({
      cloud_skill_id: skill.id,
      version: 1,
      content: source.content,
      variables: source.variables,
      changelog: `Forked from ${source.slug}`,
    });

    return { skill, forked_from: { id: source.id, slug: source.slug } };
  });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const exportCloudSkill = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      format: ExportFormat.default("markdown"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data: skill } = await supabase
      .from("cloud_skills")
      .select("*")
      .eq("id", data.id)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .maybeSingle();
    if (!skill) throw new Response("Not found", { status: 404 });

    if (data.format === "json") {
      return {
        format: "json",
        data: {
          slug: skill.slug,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          tags: skill.tags,
          variables: skill.variables,
          content: skill.content,
          version: skill.version,
        },
      };
    }

    if (data.format === "yaml") {
      const lines = [
        `name: ${skill.name}`,
        `slug: ${skill.slug}`,
        skill.description ? `description: ${skill.description}` : null,
        `category: ${skill.category}`,
        skill.tags.length ? `tags: ${skill.tags.join(", ")}` : null,
        `version: ${skill.version}`,
      ].filter(Boolean);
      return {
        format: "yaml",
        data: `---\n${lines.join("\n")}\n---\n\n${skill.content}`,
      };
    }

    // markdown (default)
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

    return { format: "markdown", data: `${frontmatter}\n\n${skill.content}` };
  });

// ---------------------------------------------------------------------------
// Import from markdown/YAML content
// ---------------------------------------------------------------------------
export const importCloudSkill = createServerFn({ method: "POST" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) =>
    z.object({
      filename: z.string().max(200),
      content: z.string().min(10).max(200_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { filename, content } = data;

    // Parse YAML frontmatter if present
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    let meta: Record<string, string> = {};
    let body = content;

    if (frontmatterMatch) {
      const fmLines = frontmatterMatch[1].split("\n");
      for (const line of fmLines) {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          meta[key] = val;
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
    const name = meta.name ?? baseName;
    const description = meta.description ?? null;
    const category = meta.category ?? "imported";
    const tags = meta.tags ? meta.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

    // Deduplicate slug
    let finalSlug = slug;
    let n = 1;
    while (true) {
      const { data: existing } = await supabase
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

    const { data: skill, error } = await supabase
      .from("cloud_skills")
      .insert({
        user_id: userId,
        slug: finalSlug,
        name,
        description,
        category,
        tags,
        content: body.trim(),
        variables: {},
        is_public: false,
        version: 1,
      })
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 500 });

    await supabase.from("cloud_skill_versions").insert({
      cloud_skill_id: skill.id,
      version: 1,
      content: body.trim(),
      variables: {},
      changelog: `Imported from ${filename}`,
    });

    return { skill, parsed_meta: meta };
  });

// ---------------------------------------------------------------------------
// Get version content (for diff/rollback)
// ---------------------------------------------------------------------------
export const getCloudSkillVersion = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .inputValidator((d: unknown) =>
    z.object({
      cloud_skill_id: z.string().uuid(),
      version: z.number().int().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    // Verify ownership
    const { data: skill } = await supabase
      .from("cloud_skills")
      .select("id")
      .eq("id", data.cloud_skill_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!skill) throw new Response("Not found", { status: 404 });

    const { data: ver, error } = await supabase
      .from("cloud_skill_versions")
      .select("*")
      .eq("cloud_skill_id", data.cloud_skill_id)
      .eq("version", data.version)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!ver) throw new Response("Version not found", { status: 404 });

    return { version: ver };
  });

// ---------------------------------------------------------------------------
// Categories (for filter dropdowns)
// ---------------------------------------------------------------------------
export const listCloudSkillCategories = createServerFn({ method: "GET" })
  .middleware([requirePaidSubscription])
  .handler(async ({ context }) => {
    const { supabase: sb, userId } = context as any;
    const supabase = sb as any;

    const { data } = await supabase
      .from("cloud_skills")
      .select("category")
      .eq("user_id", userId);

    const categories = ([...new Set((data ?? []).map((r: any) => r.category))] as string[]).sort();
    return { categories };
  });
