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

/* ------------------------------------------------------------------ *
 * Agent Factory — build and install a customer's own corporate agent *
 * ------------------------------------------------------------------ */

export const createAgentTool = defineTool({
  name: "create_agent",
  description:
    "[AGENT FACTORY] Build a brand-new corporate agent from a prompt: researches the state of the art for the role, then writes the operating soul, skills, playbooks and guardrails, scores the result and repairs it until it clears the A bar. Returns a build id — poll `get_my_agent` until status is 'ready', then install it. Requires OAuth + a paid plan.",
  parameters: z.object({
    role: z.string().describe("Role or title, e.g. 'Head of Customer Success'."),
    company: z.string().describe("Company context: what it sells, to whom, size, stage."),
    industry: z.string().optional(),
    outcomes: z.string().optional().describe("What this agent is accountable for."),
    tone: z.string().optional(),
    constraints: z.string().optional().describe("Hard constraints — these become enforceable guardrails."),
    context: z.string().optional().describe("Existing docs to inherit (playbooks, ICP, style guide)."),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const brief = { ...input };
    const slugBase =
      input.role
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "agent";

    let slug = slugBase;
    for (let i = 2; i < 40; i++) {
      const { data: clash } = await supabaseAdmin
        .from("agent_builds")
        .select("id")
        .eq("user_id", userId)
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${slugBase}-${i}`;
    }

    const { data: row, error } = await supabaseAdmin
      .from("agent_builds")
      .insert({
        user_id: userId,
        slug,
        name: input.role,
        role: input.role,
        brief,
        status: "queued",
        step: "Queued",
      })
      .select("id, slug")
      .single();
    if (error) return json({ error: "insert_failed", message: error.message });

    // Run the pipeline inline, one bounded step at a time, so the tool returns a
    // finished agent when the client's budget allows and a resumable build when
    // it does not.
    const { runBuildPipeline } = await import("@/lib/agents/factory-runner.server");
    const result = await runBuildPipeline(row.id, { budgetMs: 55_000 });

    try {
      await supabaseAdmin
        .from("mcp_funnel_events")
        .insert({ event: "agent_build_started", user_id: userId, props: { slug, via: "mcp" } });
    } catch {
      /* best-effort */
    }

    return json({
      build_id: row.id,
      slug: row.slug,
      status: result.status,
      next_step:
        result.status === "ready"
          ? `install_my_agent { slug: "${row.slug}" }`
          : `Still building (${result.status}). Call get_my_agent { slug: "${row.slug}" } again in ~30s to resume.`,
      web_url: `https://superagentskill.com/agents/build/${row.id}`,
    });
  },
});

export const listMyAgentsTool = defineTool({
  name: "list_my_agents",
  description:
    "[AGENT FACTORY] List the agents this user generated with create_agent, with status and quality grade. Requires OAuth + a paid plan.",
  parameters: z.object({}),
  execute: async (_input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const { data: rows } = await supabaseAdmin
      .from("agent_builds")
      .select("id, slug, name, role, status, step, score, grade, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return json({ count: (rows ?? []).length, agents: rows ?? [] });
  },
});

export const getMyAgentTool = defineTool({
  name: "get_my_agent",
  description:
    "[AGENT FACTORY] Check (and resume) a generated agent's build. If the build is unfinished this advances it; when it is ready it returns the grade and score. Requires OAuth + a paid plan.",
  parameters: z.object({ slug: z.string().describe("Slug returned by create_agent.") }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const { data: row } = await supabaseAdmin
      .from("agent_builds")
      .select("id, slug, name, role, status, step, score, grade, error")
      .eq("user_id", userId)
      .eq("slug", input.slug)
      .maybeSingle();
    if (!row) return json({ error: "not_found", hint: "Call list_my_agents for valid slugs." });

    if (row.status !== "ready" && row.status !== "error") {
      const { runBuildPipeline } = await import("@/lib/agents/factory-runner.server");
      const result = await runBuildPipeline(row.id, { budgetMs: 55_000 });
      return json({ ...row, status: result.status, next_step: result.status === "ready" ? `install_my_agent { slug: "${row.slug}" }` : "Call get_my_agent again to resume." });
    }
    return json(row);
  },
});

export const installMyAgentTool = defineTool({
  name: "install_my_agent",
  description:
    "[AGENT FACTORY] Install an agent this user generated: returns the operating soul, every skill and playbook, and the guardrails as files to write into the repo (default `.agents/<slug>/`). Requires OAuth + a paid plan.",
  parameters: z.object({
    slug: z.string(),
    format: z.enum(["files", "system_prompt"]).default("files"),
  }),
  execute: async (input, ctx) => {
    const userId = await requirePaidUser(ctx);
    const { data: row } = await supabaseAdmin
      .from("agent_builds")
      .select("*")
      .eq("user_id", userId)
      .eq("slug", input.slug)
      .maybeSingle();
    if (!row) return json({ error: "not_found", hint: "Call list_my_agents for valid slugs." });
    if (row.status !== "ready") return json({ error: "not_ready", status: row.status, hint: "Call get_my_agent to resume the build." });

    const { buildFiles, buildSystemPrompt } = await import("@/lib/agents/factory-adapt");

    try {
      await supabaseAdmin
        .from("mcp_funnel_events")
        .insert({ event: "agent_build_download", user_id: userId, props: { slug: row.slug, via: "mcp" } });
    } catch {
      /* best-effort */
    }

    if (input.format === "system_prompt") {
      return json({ slug: row.slug, name: row.name, grade: row.grade, system_prompt: buildSystemPrompt(row) });
    }

    const files = buildFiles(row);
    return json({
      slug: row.slug,
      name: row.name,
      grade: row.grade,
      score: row.score,
      install_dir: `.agents/${row.slug}`,
      instructions:
        "Write each file below into install_dir, preserving the relative paths. Load AGENT.md as your operating soul for this domain, treat GUARDRAILS.md as non-negotiable, and consult skills/ and playbooks/ when the situation matches.",
      files: Object.entries(files).map(([path, content]) => ({ path, content })),
    });
  },
});
