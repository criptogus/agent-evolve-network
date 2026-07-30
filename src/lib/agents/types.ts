/**
 * Agent Store — types.
 *
 * An "agent" is a curated bundle: 1 soul (identity + operating system prompt),
 * N skills (bounded capabilities) and N playbooks (step-by-step procedures).
 * Content is versioned in the repo so it can be reviewed like code and shipped
 * atomically to the ZIP download, the MCP tool and the copy/paste block.
 */

export type AgentDoc = {
  slug: string;
  title: string;
  summary: string;
  /** Markdown body. */
  body: string;
};

export type AgentDef = {
  slug: string;
  name: string;
  role: string;
  emoji: string;
  tagline: string;
  description: string;
  tags: string[];
  soul: { title: string; body: string };
  skills: AgentDoc[];
  playbooks: AgentDoc[];
};

export type AgentSummary = {
  slug: string;
  name: string;
  role: string;
  emoji: string;
  tagline: string;
  description: string;
  tags: string[];
  skill_count: number;
  playbook_count: number;
};

export function toSummary(a: AgentDef): AgentSummary {
  return {
    slug: a.slug,
    name: a.name,
    role: a.role,
    emoji: a.emoji,
    tagline: a.tagline,
    description: a.description,
    tags: a.tags,
    skill_count: a.skills.length,
    playbook_count: a.playbooks.length,
  };
}
