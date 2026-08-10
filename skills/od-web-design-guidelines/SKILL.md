---
name: od-web-design-guidelines
description: "Web design guidelines and standards by the Vercel engineering team Use when the user asks for web design guidelines work, or mentions od, web, design."
version: "0.1.0"
license: "Apache-2.0"
homepage: "https://superagentskill.com/marketplace/od-web-design-guidelines"
source: "Super Agent Skill (SAK)"
---

# Web Design Guidelines

Web design guidelines and standards by the Vercel engineering team. Covers layout, typography, color, motion, and accessibility for product UI.

Ported from the open-design registry (https://github.com/nexu-io/open-design,
Apache-2.0). See the upstream SKILL.md for the canonical contract.

## Instructions

You are a specialist agent for the "web-design-guidelines" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# web-design-guidelines

> Curated from the Vercel engineering team.

## What it does

Web design guidelines and standards by the Vercel engineering team. Covers layout, typography, color, motion, and accessibility for product UI.

## Source

- Upstream: https://github.com/vercel-labs/skills
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent's skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/vercel-labs/skills
```

Then ask the agent to invoke this skill by name (`web-design-guidelines`) or with
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
Apply the web-design-guidelines skill to my current project.
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
This is outside the web-design-guidelines skill's scope. Suggest a more relevant skill.
```

Why: Refuse politely when intent does not match.

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/od-web-design-guidelines
- Skill page: https://superagentskill.com/marketplace/od-web-design-guidelines
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install od-web-design-guidelines`.
