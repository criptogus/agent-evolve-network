import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const json = (v: unknown) => JSON.stringify(v, null, 2);

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
    let q = supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version,author_handle")
      .eq("is_published", true)
      .limit(limit);
    if (type) q = q.eq("type", type);
    if (query) q = q.ilike("name", `%${query}%`);
    const { data, error } = await q;
    if (error) return json({ error: error.message });
    return json({ count: data?.length ?? 0, items: data ?? [] });
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
    const { data: pkg, error } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,type,description,long_description,latest_version,author_handle")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) return json({ error: error.message });
    if (!pkg) return json({ error: "not_found" });
    const { data: ver } = await supabaseAdmin
      .from("package_versions")
      .select("version,status,system_prompt,rules,examples,compatibility,notes")
      .eq("package_id", pkg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return json({ package: pkg, version: ver });
  },
});

export const searchRegistryTool = defineTool({
  name: "search_registry",
  description:
    "Search across the entire registry (name + description + long description). Use when the agent does not know an exact slug.",
  parameters: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  execute: async ({ query, limit }) => {
    const { data, error } = await supabaseAdmin
      .from("packages")
      .select("slug,name,type,description,latest_version")
      .eq("is_published", true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,long_description.ilike.%${query}%`)
      .limit(limit);
    if (error) return json({ error: error.message });
    return json({ query, count: data?.length ?? 0, items: data ?? [] });
  },
});

export const requestPrimitiveTool = defineTool({
  name: "request_primitive",
  description:
    "Submit a request for a primitive that does not yet exist. Super Agent Skill will research and auto-create it via the proprietary forge pipeline.",
  parameters: z.object({
    type: z.enum(["skill", "playbook", "soul", "guardrail"]),
    brief: z.string().min(20).max(2000).describe("What the primitive should do, with industry/context"),
    industry: z.string().max(80).optional(),
  }),
  execute: async ({ type, brief, industry }) => {
    const { data, error } = await supabaseAdmin
      .from("package_requests")
      .insert({ kind: type, brief, industry: industry ?? null, status: "queued" })
      .select("id,status")
      .single();
    if (error) return json({ error: error.message });
    return json({
      request_id: data.id,
      status: data.status,
      note: "Queued for the Super Agent Skill forge pipeline.",
    });
  },
});
