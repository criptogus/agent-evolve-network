import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/integrations/supabase/client.server";

/**
 * MCP tools that expose Super Agent Skill's live registry.
 * Backed by the same Supabase tables as the web app (skills/playbooks/souls/guardrails).
 */

export const listPackagesTool = defineTool({
  name: "list_packages",
  description:
    "List published primitives (skills, playbooks, souls, guardrails) from the Super Agent Skill registry. Optional type filter and search query.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]).optional(),
    query: z.string().optional().describe("Free-text search over name/description"),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  execute: async ({ type, query, limit }) => {
    const sb = createSupabaseAdminClient();
    let q = sb
      .from("packages")
      .select("slug,name,type,description,latest_version,author_handle")
      .eq("is_published", true)
      .limit(limit);
    if (type) q = q.eq("type", type);
    if (query) q = q.ilike("name", `%${query}%`);
    const { data, error } = await q;
    if (error) return { error: error.message };
    return { count: data?.length ?? 0, items: data ?? [] };
  },
});

export const getPackageTool = defineTool({
  name: "get_package",
  description:
    "Fetch the full latest-version manifest of a primitive by slug: system prompt, rules, examples, and compatibility.",
  parameters: z.object({
    slug: z.string().describe("Package slug (e.g. cardiology-soul)"),
  }),
  execute: async ({ slug }) => {
    const sb = createSupabaseAdminClient();
    const { data: pkg, error } = await sb
      .from("packages")
      .select("id,slug,name,type,description,long_description,latest_version,author_handle")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!pkg) return { error: "not_found" };
    const { data: ver } = await sb
      .from("package_versions")
      .select("version,status,system_prompt,rules,examples,compatibility,notes")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { package: pkg, version: ver };
  },
});

export const searchRegistryTool = defineTool({
  name: "search_registry",
  description:
    "Semantic-style search across the entire registry (name + description + long description). Use when the agent does not know an exact slug.",
  parameters: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  execute: async ({ query, limit }) => {
    const sb = createSupabaseAdminClient();
    const { data, error } = await sb
      .from("packages")
      .select("slug,name,type,description,latest_version")
      .eq("is_published", true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,long_description.ilike.%${query}%`)
      .limit(limit);
    if (error) return { error: error.message };
    return { query, count: data?.length ?? 0, items: data ?? [] };
  },
});

export const requestPrimitiveTool = defineTool({
  name: "request_primitive",
  description:
    "Submit a request for a primitive that does not yet exist in the registry. Super Agent Skill will research and auto-create it via the proprietary forge pipeline.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]),
    brief: z.string().min(20).max(2000).describe("What the primitive should do, with industry/context"),
    industry: z.string().max(80).optional(),
  }),
  execute: async ({ type, brief, industry }) => {
    const sb = createSupabaseAdminClient();
    const { data, error } = await sb
      .from("package_requests")
      .insert({ kind: type, brief, industry: industry ?? null, status: "queued" })
      .select("id,status")
      .single();
    if (error) return { error: error.message };
    return {
      request_id: data.id,
      status: data.status,
      note: "Queued for the Super Agent Skill forge pipeline. Poll list_packages later or visit /admin/requests.",
    };
  },
});
