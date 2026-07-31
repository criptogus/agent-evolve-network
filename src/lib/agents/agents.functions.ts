/**
 * Agent Store server functions. Runtime helpers and schemas live in
 * ./agents.shared because server-fn splitting strips module-scope siblings.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SlugInput, assertPaid } from "./agents.shared";
import { findAgent, listAgentSummaries, AGENT_CATALOG_VERSION } from "./catalog";
import { agentSystemPrompt, agentMarkdownBundle } from "./bundle";
import type { AgentSummary } from "./types";

export type AgentPreview = {
  summary: AgentSummary;
  soul_excerpt: string;
  skills: Array<{ slug: string; title: string; summary: string }>;
  playbooks: Array<{ slug: string; title: string; summary: string }>;
};

/** Public: catalog listing (metadata only, no content). */
export const listAgents = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ agents: AgentSummary[]; catalog_version: string }> => ({
    agents: listAgentSummaries(),
    catalog_version: AGENT_CATALOG_VERSION,
  }),
);

/** Public: detail page preview — metadata plus a soul excerpt, never the full bundle. */
export const getAgentPreview = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SlugInput.parse(d))
  .handler(async ({ data }): Promise<AgentPreview | null> => {
    const a = findAgent(data.slug);
    if (!a) return null;
    const excerpt = a.soul.body.split("\n").slice(0, 12).join("\n");
    return {
      summary: {
        slug: a.slug,
        name: a.name,
        role: a.role,
        emoji: a.emoji,
        tagline: a.tagline,
        description: a.description,
        tags: a.tags,
        skill_count: a.skills.length,
        playbook_count: a.playbooks.length,
      },
      soul_excerpt: excerpt,
      skills: a.skills.map((s) => ({ slug: s.slug, title: s.title, summary: s.summary })),
      playbooks: a.playbooks.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary })),
    };
  });

/** Pro-only: full copy/paste system prompt + single-file markdown bundle. */
export const getAgentBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SlugInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertPaid(supabase, userId);
    const a = findAgent(data.slug);
    if (!a) throw new Response("Agent not found", { status: 404 });
    return {
      slug: a.slug,
      name: a.name,
      system_prompt: agentSystemPrompt(a),
      markdown: agentMarkdownBundle(a),
    };
  });
