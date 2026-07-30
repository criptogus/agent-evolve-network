import type { AgentDef } from "./types";

/**
 * Bundle builders — shared by the ZIP/Markdown download route, the MCP
 * install tool and the copy/paste block in the UI so every surface ships
 * byte-identical content.
 */

function frontmatter(fields: Record<string, string | string[]>): string {
  const lines = Object.entries(fields).map(([k, v]) =>
    Array.isArray(v) ? `${k}: [${v.map((x) => JSON.stringify(x)).join(", ")}]` : `${k}: ${JSON.stringify(v)}`,
  );
  return ["---", ...lines, "---", ""].join("\n");
}

export function soulMarkdown(a: AgentDef): string {
  return (
    frontmatter({ name: `${a.slug}-soul`, type: "soul", agent: a.slug, role: a.role }) +
    `# ${a.name} — SOUL\n\n${a.soul.body}\n`
  );
}

export function docMarkdown(a: AgentDef, kind: "skill" | "playbook", i: number): string {
  const doc = kind === "skill" ? a.skills[i] : a.playbooks[i];
  return (
    frontmatter({ name: doc.slug, type: kind, agent: a.slug, description: doc.summary }) + `${doc.body}\n`
  );
}

export function agentReadme(a: AgentDef): string {
  const lines: string[] = [];
  lines.push(`# ${a.emoji} ${a.name}`);
  lines.push("");
  lines.push(`> ${a.tagline}`);
  lines.push("");
  lines.push(a.description);
  lines.push("");
  lines.push("## What's inside");
  lines.push("");
  lines.push(`- \`AGENT.md\` — the soul (identity, reasoning process, hard rules). Load this as the system prompt.`);
  lines.push(`- \`skills/\` — ${a.skills.length} bounded capabilities.`);
  lines.push(`- \`playbooks/\` — ${a.playbooks.length} step-by-step procedures.`);
  lines.push("");
  lines.push("### Skills");
  for (const s of a.skills) lines.push(`- **${s.title}** — ${s.summary}`);
  lines.push("");
  lines.push("### Playbooks");
  for (const p of a.playbooks) lines.push(`- **${p.title}** — ${p.summary}`);
  lines.push("");
  lines.push("## How to install");
  lines.push("");
  lines.push("**Claude Code / Hermes / Cursor** — drop this folder into your project (e.g. `.agents/`), then tell your agent: \"load AGENT.md as your operating soul and use the files in skills/ and playbooks/ when relevant\".");
  lines.push("");
  lines.push("**ChatGPT / Claude web** — paste `AGENT.md` as a custom instruction / project instruction, then paste individual skills when you need them.");
  lines.push("");
  lines.push("**MCP** — with the SuperAgentSkill MCP connected, ask: `install the " + a.slug + " agent`.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("Curated by SuperAgentSkill — https://superagentskill.com/agents/" + a.slug);
  return lines.join("\n") + "\n";
}

/** Full file map for the ZIP download. */
export function agentFiles(a: AgentDef): Record<string, string> {
  const files: Record<string, string> = {
    "README.md": agentReadme(a),
    "AGENT.md": soulMarkdown(a),
  };
  a.skills.forEach((s, i) => (files[`skills/${s.slug}.md`] = docMarkdown(a, "skill", i)));
  a.playbooks.forEach((p, i) => (files[`playbooks/${p.slug}.md`] = docMarkdown(a, "playbook", i)));
  return files;
}

/** Single-file bundle: everything concatenated, ready to paste. */
export function agentMarkdownBundle(a: AgentDef): string {
  const parts: string[] = [agentReadme(a), "\n\n---\n\n", soulMarkdown(a)];
  for (let i = 0; i < a.skills.length; i++) parts.push("\n\n---\n\n", docMarkdown(a, "skill", i));
  for (let i = 0; i < a.playbooks.length; i++) parts.push("\n\n---\n\n", docMarkdown(a, "playbook", i));
  return parts.join("");
}

/** Copy/paste system prompt: soul + an index of the bundled capabilities. */
export function agentSystemPrompt(a: AgentDef): string {
  const idx: string[] = [];
  idx.push("\n\n## Capabilities available to you");
  idx.push("");
  idx.push("Skills (bounded capabilities — apply the matching one when the situation fits):");
  for (const s of a.skills) idx.push(`- ${s.title}: ${s.summary}`);
  idx.push("");
  idx.push("Playbooks (multi-step procedures — follow them end to end when invoked):");
  for (const p of a.playbooks) idx.push(`- ${p.title}: ${p.summary}`);
  idx.push("");
  idx.push(
    "When one of these applies, say which you are using in one short line, then execute it. If none applies, answer from the soul above.",
  );
  return `${a.soul.body}${idx.join("\n")}`;
}
