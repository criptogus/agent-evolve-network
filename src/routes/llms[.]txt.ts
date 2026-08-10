import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";

const supabaseAdmin = _supabaseAdmin as any;

const BODY = `# Super Agent Skill
> The MCP infrastructure layer for AI agents. Connect any agent to a live registry of skills, playbooks, souls and guardrails — then let the proprietary forge research, author, evaluate and continuously evolve them.

Site: https://superagentskill.com
MCP endpoint: https://superagentskill.com/api/public/mcp
MCP endpoint (legacy alias, may be blocked by edge firewalls for datacenter IPs): https://superagentskill.com/api/mcp
Transport: MCP Streamable HTTP (JSON-RPC 2.0). Required header: \`Accept: application/json, text/event-stream\`
Long-form agent manual: https://superagentskill.com/agents.md
Sitemap: https://superagentskill.com/sitemap.xml

## What it is (TL;DR)
Super Agent Skill is to AI agents what npm is to Node and what Twilio is to telecom: a single
connection that gives any MCP-compatible agent (Claude, Cursor, Codex, Grok, custom) instant
access to thousands of installable, version-controlled, continuously-evolving capabilities.
No retraining. No SDK. No DevOps. One MCP URL → one sentence → a specialist.

## Who it's for
- AI engineers wiring agents into production
- Teams that already use Claude/Cursor/Codex/Grok and want them to actually do the job
- Domain experts (doctors, lawyers, marketers, fintech ops) monetizing their expertise as packages

## Quickstart (30 seconds)
1. Add MCP server in your agent's config:
   \`\`\`
   {"mcpServers":{"superagentskill":{"url":"https://superagentskill.com/api/public/mcp"}}}
   \`\`\`
2. Authorize via OAuth 2.1 + PKCE (browser opens automatically).
3. Ask the agent: "make me a cardiologist" — it discovers, installs and evolves.

## Alternative entry point — open Skills CLI (skills.sh), no account, no MCP
Every published SAK skill is mirrored as a standard Anthropic-spec SKILL.md package in
https://github.com/criptogus/agent-evolve-network under \`skills/<slug>/SKILL.md\`, so the open
skills ecosystem CLI can install them into Claude Code, Cursor, Codex, GitHub Copilot, Windsurf,
Gemini CLI, Cline, Zed, OpenCode and more:
\`\`\`
npx skills add criptogus/agent-evolve-network            # whole graded catalog
npx skills add criptogus/agent-evolve-network/<slug>     # one skill
npx skills update                                        # refresh
\`\`\`
Trade-off: the CLI copies a snapshot of files. Use MCP when you want always-current graded
versions, Trust Score checks, review/diagnosis tools and before/after improvement proof.



## Primitives (mental model)
| type      | what it is                                              | use it for                          |
|-----------|---------------------------------------------------------|-------------------------------------|
| skill     | a single capability                                     | ECG read, MEDDPICC, KYC analysis    |
| playbook  | a multi-step workflow                                   | chest-pain triage, sales motion     |
| soul      | tone / personality / decision style                     | Challenger rep, calm clinician      |
| guardrail | safety boundary, runs before output                     | no advice without citation, no PII  |

## Tools (full reference)
- list_packages({type?, query?, limit=20}) — list registry items
- search_registry({query, limit=10}) — semantic search by name/description
- get_package({slug}) — full manifest (system_prompt, rules, examples, compatibility)
- request_primitive({type, brief, industry?}) — auto-create a missing primitive
- get_skill_trust({slug}) — trust score, downloads, ratings, drift signals

## Decision rules for agents
1. Detect 1–3 domain keywords from the user turn.
2. \`search_registry({ query })\`. If no hit, \`request_primitive\`.
3. Adopt the returned \`system_prompt\` + \`rules\` for the turn.
4. Stack at most: 1 soul, 1–N skills, 0–1 playbook, 0–N guardrails.
5. Guardrails always run last and may refuse.

## Pricing
- Hacker — $0/mo · 3 installs, registry read, MCP gateway
- Agent Pass — $19/agent/mo · unlimited upgrades, SkillForge AI, weekly reports
- Enterprise — custom · private registry, SAML SSO, RBAC, audit logs
Creators keep 80–85% of every package sold.

## Key links
- Connect:        https://superagentskill.com/connect
- Marketplace:    https://superagentskill.com/marketplace
- Pricing:        https://superagentskill.com/pricing
- Docs:           https://superagentskill.com/docs
- MCP docs:       https://superagentskill.com/docs/mcp
- Discover:       https://superagentskill.com/discover
- Forge:          https://superagentskill.com/forge
- Agent manual:   https://superagentskill.com/agents.md
`;

type CatalogRow = { slug: string; name: string; type: string; description: string | null };

// Generated catalog: one line per published package so LLMs can cite and
// deep-link every skill directly. Fails soft — on any DB error the file is
// served without the catalog section.
async function buildCatalogSection(): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from("packages")
      .select("slug,name,type,description")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("install_count", { ascending: false })
      .order("name", { ascending: true })
      .limit(2000);
    if (error || !data?.length) return "";
    const lines = (data as CatalogRow[]).map((p) => {
      const desc = (p.description ?? "").replace(/\s+/g, " ").trim();
      const url = `https://superagentskill.com/marketplace/${encodeURIComponent(p.slug)}`;
      const exportUrl =
        p.type === "skill"
          ? ` · markdown: https://superagentskill.com/api/skills/${encodeURIComponent(p.slug)}/export.md`
          : "";
      return `- ${p.name} (${p.type}): ${desc} — ${url}${exportUrl}`;
    });
    return `\n## Catalog (published packages)\n${lines.join("\n")}\n`;
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(BODY + (await buildCatalogSection()), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        }),
    },
  },
});
