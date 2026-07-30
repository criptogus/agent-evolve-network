import { defineTool } from "mcp-tanstack-start";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";
import { findAgent, listAgentSummaries } from "@/lib/agents/catalog";
import { agentSystemPrompt, agentFiles } from "@/lib/agents/bundle";

const supabaseAdmin = _supabaseAdmin as any;
const json = (v: unknown) => JSON.stringify(v, null, 2);

async function requirePaidUser(ctx: any): Promise<string> {
  const userId = (ctx?.auth?.claims as { user_id?: string } | undefined)?.user_id ?? null;
  if (!userId) {
    throw new Error(
      json({ error: "unauthorized", hint: "Connect via OAuth (or paste a personal access token) to install agents." }),
    );
  }
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const active = !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  if (!active) {
    throw new Error(
      json({
        error: "subscription_required",
        message: "The Agent Store requires Agent Pass or Enterprise. Upgrade at superagentskill.com/pricing.",
      }),
    );
  }
  return userId;
}

export const listAgentsTool = defineTool({
  name: "list_agents",
  description:
    "[AGENT STORE] Browse the curated ready-to-use agents (CEO, COO, CTO, CMO, HR, Agent Architect, Corporate Finance, Board, Google Ads, Meta Ads, Newsletter, LinkedIn, X). Returns metadata only — free and anonymous. Use `install_agent` to get the full soul + skills + playbooks (paid).",
  parameters: z.object({ query: z.string().optional() }),
  execute: async (input) => {
    const q = (input.query ?? "").trim().toLowerCase();
    let agents = listAgentSummaries();
    if (q) {
      agents = agents.filter((a) =>
        [a.name, a.role, a.tagline, a.description, ...a.tags].join(" ").toLowerCase().includes(q),
      );
    }
    return json({
      count: agents.length,
      agents,
      next_step: "install_agent { slug } — requires a paid plan.",
    });
  },
});

export const installAgentTool = defineTool({
  name: "install_agent",
  description:
    "[AGENT STORE] Install a curated agent: returns the full operating soul (ready to use as a system prompt) plus every skill and playbook as files you can write into the user's repo (default `.agents/<slug>/`). Requires OAuth + a paid plan.",
  parameters: z.object({
    slug: z.string().describe("Agent slug from list_agents, e.g. 'cmo' or 'google-ads'."),
    format: z.enum(["files", "system_prompt"]).default("files"),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const agent = findAgent(input.slug);
    if (!agent) return json({ error: "not_found", hint: "Call list_agents for valid slugs." });

    try {
      await supabaseAdmin
        .from("mcp_funnel_events")
        .insert({ event: "agent_install_mcp", user_id: userId, props: { slug: agent.slug, format: input.format } });
    } catch {
      /* best-effort */
    }

    if (input.format === "system_prompt") {
      return json({ slug: agent.slug, name: agent.name, system_prompt: agentSystemPrompt(agent) });
    }

    const files = agentFiles(agent);
    return json({
      slug: agent.slug,
      name: agent.name,
      install_dir: `.agents/${agent.slug}`,
      instructions:
        "Write each file below into install_dir, preserving the relative paths. Then load AGENT.md as your operating soul for this domain and consult skills/ and playbooks/ when the situation matches.",
      files: Object.entries(files).map(([path, content]) => ({ path, content })),
    });
  },
});
