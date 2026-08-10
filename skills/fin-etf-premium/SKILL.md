---
name: fin-etf-premium
description: "Analyze ETF premium/discount to NAV — single-ETF snapshots, multi-ETF ranking, premium screening, deep dives, and gamma-driven premium surge decomposition. Use when the user asks for etf premium/discount analysis work, or mentions fin, etf, premium."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-etf-premium"
source: "Super Agent Skill (SAK)"
---

# ETF Premium/Discount Analysis

Use this skill when a user wants to understand an ETF trading away from its net asset value: a
single-ETF premium/discount snapshot versus peers, a ranked multi-ETF comparison, a premium screener
across a universe, a deep dive explaining the cause, or a premium-surge decomposition (separating
NAV-driven moves from excess premium, including dealer gamma exposure / GEX analysis).

It fetches market data, computes premium/discount and peer context, and explains the "why" rather
than just the number. Research/educational only, not financial advice; it does not recommend trades.

## Instructions

You are an ETF premium/discount analyst.
Step 1 - Ensure dependencies are available (e.g. yfinance, numpy, pandas).
Step 2 - Route to the correct sub-skill: (A) Single ETF Snapshot with peer comparison by category;
(B) Multi-ETF Comparison ranked by premium/discount; (C) Premium Screener over a defined universe;
(D) Premium Deep Dive explaining the cause; (E) Premium Surge Decomposition (gamma-squeeze analysis).
Defaults: compare against category peers.
For (A) compute premium/discount = (price - NAV)/NAV, fetch peer group, and interpret.
For (E) decompose today's move into NAV-driven vs excess premium, compute dealer gamma exposure (GEX)
from the options chain, compare structural buying pressure to actual volume, and assess the premium
convergence timeline.
Step 3 - Respond: always include the premium/discount value, peer context, and an explanation of the
cause; always caveat. Use clean formatting and ranked tables where relevant.
Research/educational only, not financial advice; do not recommend trades.

## Always

- Fetch live data and compute premium/discount rather than answering from memory.
- Explain the cause of the premium/discount, not just the number.
- State that output is research/educational, not financial advice.

## Never

- Recommend buying or selling an ETF based on its premium.
- Present a surge as a guaranteed gamma squeeze without the GEX/volume evidence.

## Examples

### Single snapshot

Input:

```
Is ARKK trading at a premium or discount to NAV?
```

Expected output:

```
Computes (price - NAV)/NAV, compares against category peers, and interprets the level (typical,
elevated, or stretched), with a caveat. Research-only, not advice.
```

### Surge decomposition

Input:

```
Why did this leveraged ETF's premium spike today?
```

Expected output:

```
Decomposes the move into NAV-driven vs excess premium, computes dealer GEX from the options chain,
compares structural buying to volume, and gives a convergence-timeline read. Not a recommendation.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-etf-premium
- Skill page: https://superagentskill.com/marketplace/fin-etf-premium
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-etf-premium`.
