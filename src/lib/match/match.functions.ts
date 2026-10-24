import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { streamMatchResult, type MatchStreamEvent } from "./result-stream.ts";
import { MATCH_GENERATOR_MODEL, matchGenerationOptions } from "./match-generation.ts";
import { getGatewayModel } from "@/lib/ai-gateway";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
const supabaseAdmin = _supabaseAdmin;
import { preselectAgentMatch, type MatchSelectionTrace } from "./jev-agent-match.server";
import { MCP_REGISTRY, getMcpById } from "./mcp-registry";
import {
  MatchSchema,
  buildMatchPrompt,
  sanitizeMatch,
  type AgentMatchResult,
} from "./match-contract.ts";
export type { AgentMatchResult } from "./match-contract.ts";

const Input = z.object({
  brief: z.string().min(20).max(4000),
  semantic_selection: z.boolean().default(false),
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

export type AgentMatchResponse = AgentMatchResult & {
  catalog_size: number;
  selection: MatchSelectionTrace;
  generation_usage: { input_tokens: number | null; output_tokens: number | null };
};

type CatalogRow = {
  slug: string;
  name: string;
  type: "skill" | "playbook" | "soul" | "guardrail";
  description: string;
};

export const matchAgentToPackages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<ReadableStream<MatchStreamEvent<AgentMatchResponse>>> =>
    streamMatchResult(async (signal) => {
      const { data: rows, error } = await supabaseAdmin
        .from("packages")
        .select("slug,name,type,description")
        .eq("is_published", true)
        .eq("review_status", "approved")
        .order("install_count", { ascending: false })
        .limit(800)
        .abortSignal(signal);
      if (error) throw new Response(`Catalog read failed: ${error.message}`, { status: 500 });
      const catalog = (rows ?? []) as CatalogRow[];

      const { candidates, trace: selection } = await preselectAgentMatch({
        brief: data.brief,
        vertical: data.vertical,
        catalog,
        desired: data.desired,
        consent: data.semantic_selection,
      });

      const { system, prompt } = buildMatchPrompt({
        ...data,
        candidates,
        catalogSize: catalog.length,
      });

      const { output, usage } = await generateText({
        model: getGatewayModel(MATCH_GENERATOR_MODEL),
        ...matchGenerationOptions(),
        abortSignal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
        system,
        prompt,
        output: Output.object({ schema: MatchSchema }),
      });

      const clean = sanitizeMatch(output, candidates, data.desired);

      console.info("[agent-match.metrics]", {
        selection,
        generation_model: MATCH_GENERATOR_MODEL,
        generation_input_tokens: usage.inputTokens ?? null,
        generation_output_tokens: usage.outputTokens ?? null,
      });
      return {
        ...clean,
        catalog_size: catalog.length,
        selection,
        generation_usage: {
          input_tokens: usage.inputTokens ?? null,
          output_tokens: usage.outputTokens ?? null,
        },
      };
    }),
  );

// --- MCP connections (per-user) -------------------------------------------------

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMcpRegistry = createServerFn({ method: "GET" }).handler(async () => {
  return MCP_REGISTRY.map((m) => ({
    id: m.id,
    name: m.name,
    vendor: m.vendor,
    category: m.category,
    description: m.description,
    transport: m.transport,
    url: m.url,
    command: m.command,
    args: m.args,
    scopes: m.scopes,
    env: m.env,
    homepage: m.homepage,
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
      throw new Response(`Missing required env: ${missing.map((m) => m.key).join(", ")}`, {
        status: 400,
      });
    }
    // Persist only the env KEYS supplied (never the secret values).
    const provided: Record<string, boolean> = {};
    for (const k of Object.keys(data.env)) provided[k] = !!data.env[k]?.trim();

    const { data: row, error } = await supabaseAdmin
      .from("user_mcp_connections")
      .upsert(
        {
          user_id: context.userId,
          registry_id: entry.id,
          name: entry.name,
          transport: entry.transport,
          url: entry.url ?? null,
          command: entry.command ?? null,
          args: entry.args ?? [],
          env_provided: provided,
          scopes: entry.scopes,
          status: "connected",
        },
        { onConflict: "user_id,registry_id" },
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
        registry_id: entry.id,
        name: entry.name,
        transport: entry.transport,
        scopes: entry.scopes,
      },
    });
    await supabaseAdmin
      .from("user_mcp_connections")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", conn.id);

    return { run_id: run.id };
  });
