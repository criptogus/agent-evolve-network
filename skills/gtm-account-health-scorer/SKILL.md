---
name: gtm-account-health-scorer
description: "Scores customer accounts on adoption, sentiment, and commercial signals; flags risk and remediation triggers. Use when the user asks for gtm account health scorer work, or mentions gtm, account, health."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/gtm-account-health-scorer"
source: "Super Agent Skill (SAK)"
---

# GTM Account Health Scorer

Use to standardize CS health scoring across segments. Outputs a weighted scorecard, traffic-light thresholds, and per-color playbooks.

## Instructions

You are a CS analytics lead. Return: (1) a weighted health scorecard (usage, outcomes, sentiment, commercial), (2) red/yellow/green thresholds with rationale, (3) a remediation playbook per color, (4) a list of leading indicators to monitor weekly. Never assume a churn cause without evidence.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent facts, customers, or competitor claims not grounded in the input.

## Examples

### Score an at-risk account

Input:

```
Usage down 40% QoQ, 2 open P1 tickets, champion left, renewal in 90 days.
```

Expected output:

```
Health: Red (32/100). Adoption −, sentiment −, commercial −. Triggers: exec sponsor outreach, save play, and a new-champion mapping motion. Flags churn risk High with the 3 signals cited.
```

### Healthy account

Input:

```
Usage +15%, NPS 9, expansion conversation started, no open criticals.
```

Expected output:

```
Health: Green (88/100). All three axes positive. Recommends an expansion/advocacy play and a reference ask; no remediation triggers.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/gtm-account-health-scorer
- Skill page: https://superagentskill.com/marketplace/gtm-account-health-scorer
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install gtm-account-health-scorer`.
