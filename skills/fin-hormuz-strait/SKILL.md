---
name: fin-hormuz-strait
description: "Check live Strait of Hormuz status — shipping transits, oil price impact, stranded vessels, insurance/war-risk levels, and global trade impact, read-only. Use when the user asks for hormuz strait monitor work, or mentions fin, hormuz, strait."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-hormuz-strait"
source: "Super Agent Skill (SAK)"
---

# Hormuz Strait Monitor

Use this skill when a user asks about the Strait of Hormuz or Persian Gulf shipping risk: "is
Hormuz open?", tanker traffic, oil chokepoint disruption, war-risk premium, energy supply-chain
risk, or geopolitical risk affecting energy markets. It fetches the public Hormuz Strait Monitor
dashboard API (hormuzstraitmonitor.com), which requires no authentication.

It is READ-ONLY. It surfaces strait status, ship counts, Brent oil price, stranded vessels,
insurance/war-risk level, cargo throughput, diplomacy, global trade impact, tanker freight rates,
crisis timeline, and news. Present a concise briefing for routine status and expand for active
incidents. Not financial advice; data may be delayed.

## Instructions

You are a geopolitical-energy monitoring assistant for the Strait of Hormuz (read-only, no auth).
Workflow:
1. Read the dashboard JSON published at `hormuzstraitmonitor.com/api/dashboard` (read-only HTTPS GET, no auth). Response is
   {success, data, timestamp}. If success is false or the request fails, tell the user the monitor
   is temporarily unavailable and suggest the site directly.
2. Identify the needed sections: straitStatus, shipCount, oilPrice, strandedVessels, insurance,
   throughput, diplomacy, globalTradeImpact, crisisTimeline, tankerRates, news. For a general
   update, present all key sections; otherwise focus on the relevant ones.
3. Present clearly: lead with strait status and any active disruption. Use tables for structured
   data; describe sparkline/7-day trends rather than dumping numbers. Flag percentOfNormal below 80
   or above 120. Map insurance level (NORMAL/ELEVATED/HIGH/CRITICAL/EXTREME) to a risk interpretation.
   If status is not fully open, include estimated daily cost, most-affected regions, alternative routes,
   LNG impact, and SPR days.
4. Include the lastUpdated timestamp. Keep "all clear" responses concise; expand for incidents.
Add a disclaimer: data is sourced from Hormuz Strait Monitor and may have delays. Research-only, not financial advice.

## Always

- Fetch live data from the dashboard API rather than answering from memory.
- Lead with strait status and include the lastUpdated freshness timestamp.
- Note the data source and that it may be delayed; research-only, not financial advice.

## Never

- Perform any write operation or authenticate (the API is public, read-only).
- Invent values when success is false; report unavailability instead.

## Examples

### General status

Input:

```
Is Hormuz open right now?
```

Expected output:

```
Fetches the dashboard, leads with straitStatus (e.g. "OPEN since ...") plus ship traffic, Brent
price/change, and insurance risk level. Concise if all-clear; includes lastUpdated and a delay disclaimer.
```

### Risk briefing during disruption

Input:

```
What's the war risk premium and trade impact at Hormuz?
```

Expected output:

```
Reports insurance.warRiskPercent and multiplier with an interpretation of the level, plus
globalTradeImpact (percent of world oil at risk, daily cost, affected regions, alternative routes).
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-hormuz-strait
- Skill page: https://superagentskill.com/marketplace/fin-hormuz-strait
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-hormuz-strait`.
