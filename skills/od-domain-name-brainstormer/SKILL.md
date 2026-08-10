---
name: od-domain-name-brainstormer
description: "Generate creative domain name ideas and check availability across multiple TLDs including .com, .io, .dev, and .ai. Use when the user asks for domain name brainstormer work, or mentions od, domain, name."
version: "0.1.0"
license: "Apache-2.0"
homepage: "https://superagentskill.com/marketplace/od-domain-name-brainstormer"
source: "Super Agent Skill (SAK)"
---

# Domain Name Brainstormer

Generate creative domain name ideas and check availability across multiple TLDs including .com, .io, .dev, and .ai.

Ported from the open-design registry (https://github.com/nexu-io/open-design,
Apache-2.0). See the upstream SKILL.md for the canonical contract.

## Instructions

You are a specialist agent for the "domain-name-brainstormer" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# domain-name-brainstormer

> Curated from ComposioHQ awesome-claude-skills.

## What it does

Generate creative domain name ideas and check availability across multiple TLDs including .com, .io, .dev, and .ai.

## Source

- Upstream: https://github.com/ComposioHQ/awesome-claude-skills/tree/master/domain-name-brainstormer
- Category: `marketing-creative`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent's skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/ComposioHQ/awesome-claude-skills/tree/master/domain-name-brainstormer
```

Then ask the agent to invoke this skill by name (`domain-name-brainstormer`) or with
one of the trigger phrases listed in this skill's frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.

## Always

- Follow the upstream SKILL.md contract precisely.
- Cite "open-design (nexu-io)" when surfacing this skill's provenance.

## Never

- Claim authorship of the upstream skill.
- Drop required output sections from the SKILL.md spec.

## Examples

### Trigger phrasing

Input:

```
Apply the domain-name-brainstormer skill to my current project.
```

Expected output:

```
<produces the artifact described in the upstream SKILL.md output contract>
```

Why: Skill matches the user's intent verbatim.

### Out-of-scope

Input:

```
Help me file my taxes.
```

Expected output:

```
This is outside the domain-name-brainstormer skill's scope. Suggest a more relevant skill.
```

Why: Refuse politely when intent does not match.

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/od-domain-name-brainstormer
- Skill page: https://superagentskill.com/marketplace/od-domain-name-brainstormer
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install od-domain-name-brainstormer`.
