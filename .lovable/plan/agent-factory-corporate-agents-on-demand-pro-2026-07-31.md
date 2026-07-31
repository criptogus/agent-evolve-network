# Agent Factory — corporate agents on demand (Pro)

Two moves: put ready-to-use agents at the center of the product story, and let Pro customers generate their own corporate agent from a single prompt — with soul, skills, playbooks and guardrails held to the same state-of-the-art bar as the curated catalog.

## 1. Landing page: agents become the headline

- Rework the hero into an "agent factory" promise: turn Claude, Hermes or ChatGPT into a full corporate team in 30 seconds.
- New section right below the hero: the 13 curated agents as a visual grid (emoji, role, "1 soul · N skills · N playbooks") with a "Build your own agent" CTA for Pro.
- Reuse the existing grade/impact numbers to show that generated agents ship at grade A, not as raw prompts.
- Nav: promote Agents to the first item; add "Build an agent" entry pointing at the new builder.

## 2. Agent Factory (Pro-only) at `/agents/new`

Single-screen brief, then a visible build pipeline:

```text
brief  ->  research state of the art  ->  draft soul
       ->  draft 4-6 skills + 2-3 playbooks
       ->  attach guardrails  ->  score & auto-repair  ->  agent ready
```

Brief fields: role/title, company context, industry, primary outcomes, tone, hard constraints (what the agent must never do), optional existing docs pasted in.

Output: a complete agent — soul (identity, reasoning process, hard rules), skills, playbooks, guardrails — plus a grade card. Anything below grade A is auto-revised before it is shown.

Delivery reuses everything the Agent Store already has: copy/paste system prompt, single-file Markdown, ZIP of `.agents/<slug>/`, and MCP install.

## 3. My agents

`/account/agents`: list of generated agents with status, grade, created date; open, re-run with an edited brief, rename, download, or delete. Generated agents stay private to the account.

## 4. MCP surface

- `create_agent` (Pro): build an agent from a prompt directly inside Claude/Hermes and write the files into the repo.
- `list_my_agents` / `install_agent` extended to cover generated agents by slug.

## Technical details

- New table `agent_builds` (id, user_id, slug, name, role, brief jsonb, status, soul, skills jsonb, playbooks jsonb, guardrails jsonb, grade, score, report jsonb, error, timestamps) with RLS + GRANTs: owner-only select/insert/update/delete for `authenticated`, `service_role` all, no `anon`.
- Generation pipeline in `src/lib/agents/factory.server.ts`, mirroring `src/lib/packs/pipeline.server.ts`: state-of-the-art research pass, then per-artifact generation through `src/lib/ai-gateway.ts`, budget-aware so no request approaches the Worker timeout. Long builds run step-by-step with the UI polling status, same pattern as pack customization.
- Quality gate reuses the existing skill review scoring (`src/lib/mcp/tools/skills.ts` format + substance judge) and `src/lib/skills/impact-projection.ts` for the impact card; one auto-repair round per artifact that scores below the A threshold.
- Guardrails seeded from `content/guardrails/*` plus brief-specific rules derived from the stated hard constraints.
- Server functions in `src/lib/agents/factory.functions.ts`: `startAgentBuild`, `runAgentBuildStep`, `getAgentBuild`, `listMyAgentBuilds`, `deleteAgentBuild` — all `requireSupabaseAuth` + the same paid-plan check as `getAgentBundle`, called from components (never from a public loader).
- Download route `/api/agents/build/$id/download/$ext` reuses `agentFiles` / `agentMarkdownBundle` by adapting a build row into the existing `AgentDef` shape, so every surface ships identical content.
- Routes: `src/routes/agents.new.tsx`, `src/routes/agents.build.$id.tsx`, `src/routes/account.agents.tsx`, each with its own `head()` metadata (builder pages `noindex`).
- Funnel events (`agent_build_started`, `agent_build_ready`, `agent_build_download`) into `mcp_funnel_events` for the existing admin dashboards.
