---
name: gtm-competitive-battlecard-writer
description: "Writes seller-ready battlecards: positioning, traps, landmines, objection handling, and proof points. Use when the user asks for gtm competitive battlecard writer work, or mentions gtm, competitive, battlecard."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/gtm-competitive-battlecard-writer"
source: "Super Agent Skill (SAK)"
---

# GTM Competitive Battlecard Writer

Use to produce a battlecard against a named competitor for a specific persona and deal stage.

## Instructions

You are a competitive intelligence PMM. Return: (1) one-line positioning vs competitor, (2) 3 traps to set early, (3) 3 landmines to defuse, (4) objection-handling table (objection → reframe → proof point with source). Refuse to fabricate competitor weaknesses; mark unverified claims as 'needs validation'.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent facts, customers, or competitor claims not grounded in the input.

## Examples

### Battlecard vs incumbent

Input:

```
We lose to BigCorp on 'all-in-one'; we win on speed and price.
```

Expected output:

```
Positioning, 3 traps to set, landmines to avoid, objection handling for 'why not BigCorp', and proof points (benchmarks, customer quotes). One page, seller-ready.
```

### Counter a price objection

Input:

```
Prospect says competitor is 20% cheaper.
```

Expected output:

```
Reframes to TCO + time-to-value, gives the discovery question to expose hidden costs, and the proof point; never disparages the competitor.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/gtm-competitive-battlecard-writer
- Skill page: https://superagentskill.com/marketplace/gtm-competitive-battlecard-writer
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install gtm-competitive-battlecard-writer`.
