import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { getGatewayModel } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MCP_REGISTRY, compactMcpCatalogForLLM, getMcpById } from "./mcp-registry";

const Input = z.object({
  brief: z.string().min(20).max(4000),
  vertical: z.string().max(80).optional(),
  desired: z
    .object({
      skills: z.number().int().min(1).max(8).default(5),
      playbooks: z.number().int().min(0).max(4).default(2),
      souls: z.number().int().min(0).max(2).default(1),
      guardrails: z.number().int().min(0).max(4).default(2),
    })
    .default({ skills: 5, playbooks: 2, souls: 1, guardrails: 2 }),
});

const RecItem = z.object({
  slug: z.string(),
  score: z.number().min(0).max(10),
  why: z.string().max(280),
  role: z.string().max(80).describe("the specific role this plays in the agent"),
});

const MatchSchema = z.object({
  agent_summary: z.object({
    one_liner: z.string().max(200),
    primary_jobs: z.array(z.string()).min(1).max(6),
    target_user: z.string().max(160),
    success_metric: z.string().max(160),
  }),
  recommended_kit: z.object({
    skills: z.array(RecItem),
    playbooks: z.array(RecItem),
    souls: z.array(RecItem),
    guardrails: z.array(RecItem),
  }),
  coverage: z.object({
    overall_fit_score: z.number().min(0).max(100),
    strengths: z.array(z.string()).max(6),
    risks: z.array(z.string()).max(6),
  }),
  gaps: z
    .array(
      z.object({
        capability: z.string().max(160),
        suggestion: z.string().max(240),
        recommended_type: z.enum(["skill", "playbook", "soul", "guardrail"]),
      })
    )
    .max(8),
  recommended_mcps: z
    .array(
      z.object({
        id: z.string(),
        score: z.number().min(0).max(10),
        why: z.string().max(280),
        pairs_with: z.array(z.string()).max(8).describe("slugs from the kit that this MCP empowers"),
      })
    )
    .max(6)
    .default([]),
  rationale: z.string().max(1200),
});

export type AgentMatchResult = z.infer<typeof MatchSchema>;

type CatalogRow = {
  slug: string;
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  description: string;
};

export const matchAgentToPackages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<AgentMatchResult & { catalog_size: number }> => {
    const { data: rows, error } = await supabaseAdmin
      .from("packages")
      .select("slug,name,type,description")
      .eq("is_published", true)
      .order("install_count", { ascending: false })
      .limit(800);
    if (error) throw new Response(`Catalog read failed: ${error.message}`, { status: 500 });
    const catalog = (rows ?? []) as CatalogRow[];

    const compact = catalog
      .map((p) => `- [${p.type}] ${p.slug} :: ${p.name} — ${p.description.slice(0, 180)}`)
      .join("\n");

    const validSlugs = new Set(catalog.map((p) => p.slug));
    const slugByType: Record<string, Set<string>> = {
      skill: new Set(), playbook: new Set(), soul: new Set(), guardrail: new Set(),
    };
    for (const p of catalog) slugByType[p.type].add(p.slug);

    const sys = `You are SkillForge's Agent Match Evaluator. Given a brief describing what an AI agent should do, you select the best combination of SKILLS, PLAYBOOKS, SOULS and GUARDRAILS from the provided catalog to make that agent excellent.

Definitions:
- skill: a single sharply-scoped capability the agent gains.
- playbook: a multi-step decision graph for a recurring scenario.
- soul: a personality/heuristic layer that biases tone and decisions.
- guardrail: a refusal/safety/compliance layer.

Rules:
- ONLY pick slugs that appear in the catalog. Never invent slugs.
- Score 0-10 per item: 10 = essential, 7-9 = strong, 5-6 = nice-to-have. Drop anything <5.
- Pick a balanced kit close to the requested counts; less is more.
- "role" = the specific job this package does inside the agent (e.g. "lead qualification engine", "voice of taste").
- "gaps" = capabilities the agent needs that the catalog does NOT cover well — recommend the type to author next.
- "recommended_mcps" = pick 0-4 EXTERNAL MCP servers from the MCP registry whose tools the agent will actually call to deliver the brief. ONLY use ids from the registry. Score 0-10 like above; drop anything <6. "pairs_with" must reference slugs you put in the kit.
- Be opinionated and concise. No hedging, no marketing language.`;

    const user = `AGENT BRIEF:
${data.brief}

${data.vertical ? `VERTICAL: ${data.vertical}\n` : ""}DESIRED COUNTS: skills≈${data.desired.skills}, playbooks≈${data.desired.playbooks}, souls≈${data.desired.souls}, guardrails≈${data.desired.guardrails}

CATALOG (${catalog.length} packages):
${compact}

EXTERNAL MCP REGISTRY (${MCP_REGISTRY.length} servers):
${compactMcpCatalogForLLM()}`;

    const { output } = await generateText({
      model: getGatewayModel("openai/gpt-5.2"),
      system: sys,
      prompt: user,
      output: Output.object({ schema: MatchSchema }),
    });

    // sanitize: drop any hallucinated slugs / wrong types
    const clean = (arr: typeof output.recommended_kit.skills, type: keyof typeof slugByType) =>
      arr.filter((x) => slugByType[type].has(x.slug)).slice(0, data.desired[type === "skill" ? "skills" : type === "playbook" ? "playbooks" : type === "soul" ? "souls" : "guardrails"] + 1);

    output.recommended_kit.skills = clean(output.recommended_kit.skills, "skill");
    output.recommended_kit.playbooks = clean(output.recommended_kit.playbooks, "playbook");
    output.recommended_kit.souls = clean(output.recommended_kit.souls, "soul");
    output.recommended_kit.guardrails = clean(output.recommended_kit.guardrails, "guardrail");

    // sanitize MCPs: only registry ids, dedupe, drop low scores, cap at 4
    const seen = new Set<string>();
    output.recommended_mcps = (output.recommended_mcps ?? [])
      .filter((m) => {
        if (!getMcpById(m.id) || seen.has(m.id) || m.score < 6) return false;
        seen.add(m.id);
        return true;
      })
      .slice(0, 4);

    return { ...output, catalog_size: catalog.length };
  });

// --- MCP connections (per-user) -------------------------------------------------

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMcpRegistry = createServerFn({ method: "GET" }).handler(async () => {
  return MCP_REGISTRY.map((m) => ({
    id: m.id, name: m.name, vendor: m.vendor, category: m.category,
    description: m.description, transport: m.transport, url: m.url,
    command: m.command, args: m.args, scopes: m.scopes, env: m.env, homepage: m.homepage,
  }));
});

export const listMyMcpConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_mcp_connections")
      .select("id,registry_id,name,status,created_at,last_run_at")
      .eq("user_id", context.userId);
    if (error) throw new Response(error.message, { status: 500 });
    return data ?? [];
  });

const ConnectInput = z.object({
  registry_id: z.string(),
  env: z.record(z.string(), z.string()).default({}),
});

export const connectMcp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConnectInput.parse(d))
  .handler(async ({ data, context }) => {
    const entry = getMcpById(data.registry_id);
    if (!entry) throw new Response("Unknown MCP", { status: 404 });
    const missing = entry.env.filter((f) => f.required && !data.env[f.key]?.trim());
    if (missing.length) {
      throw new Response(`Missing required env: ${missing.map((m) => m.key).join(", ")}`, { status: 400 });
    }
    // Persist only the env KEYS supplied (never the secret values).
    const provided: Record<string, boolean> = {};
    for (const k of Object.keys(data.env)) provided[k] = !!data.env[k]?.trim();

    const { data: row, error } = await supabaseAdmin
      .from("user_mcp_connections")
      .upsert(
        {
          user_id: context.userId, registry_id: entry.id, name: entry.name,
          transport: entry.transport, url: entry.url ?? null,
          command: entry.command ?? null, args: entry.args ?? [],
          env_provided: provided, scopes: entry.scopes, status: "connected",
        },
        { onConflict: "user_id,registry_id" }
      )
      .select("id,registry_id,name,status")
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    return row;
  });

export const disconnectMcp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ registry_id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("user_mcp_connections")
      .delete()
      .eq("user_id", context.userId)
      .eq("registry_id", data.registry_id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

const RunInput = z.object({
  registry_id: z.string(),
  prompt: z.string().min(5).max(4000),
  package_slugs: z.array(z.string()).max(20).default([]),
});

export const runMcpWithKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunInput.parse(d))
  .handler(async ({ data, context }) => {
    const entry = getMcpById(data.registry_id);
    if (!entry) throw new Response("Unknown MCP", { status: 404 });

    const { data: conn } = await supabaseAdmin
      .from("user_mcp_connections")
      .select("id")
      .eq("user_id", context.userId)
      .eq("registry_id", data.registry_id)
      .maybeSingle();
    if (!conn) throw new Response("MCP not connected", { status: 412 });

    const { data: run, error } = await supabaseAdmin
      .from("runs")
      .insert({
        user_id: context.userId,
        prompt: data.prompt,
        package_slugs: data.package_slugs,
        status: "running",
      })
      .select("id")
      .single();
    if (error) throw new Response(error.message, { status: 500 });

    await supabaseAdmin.from("run_events").insert({
      run_id: run.id,
      kind: "mcp.attached",
      payload: {
        registry_id: entry.id, name: entry.name,
        transport: entry.transport, scopes: entry.scopes,
      },
    });
    await supabaseAdmin
      .from("user_mcp_connections")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", conn.id);

    return { run_id: run.id };
  });
