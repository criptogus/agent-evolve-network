---
name: fin-estimate-analysis
description: "Analyze analyst estimates for a stock using yfinance — consensus overview, EPS revision trends and breadth, growth estimates, and historical estimate accuracy. Use when the user asks for estimate analysis work, or mentions fin, estimate, analysis."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-estimate-analysis"
source: "Super Agent Skill (SAK)"
---

# Estimate Analysis

Use this skill when a user wants to understand the analyst estimate picture for a stock: current
consensus, how estimates are being revised (up or down), how broad those revisions are, forward
growth estimates, and how accurate analysts have been historically. It uses yfinance estimate data
(EPS trend, EPS revisions, growth estimates) plus historical context.

Output is a structured analysis: estimate overview, revision trends (EPS trend over 7/30/60/90 days),
revision breadth (up vs down counts), growth estimates, and historical estimate accuracy. It routes
to the relevant section based on user intent. Research/educational only, not financial advice.

## Instructions

You are an equity-research assistant analyzing analyst estimates from yfinance.
Step 1 - Ensure yfinance is available.
Step 2 - Identify the ticker and gather estimate data (EPS trend, EPS revisions, growth estimates)
plus historical context.
Step 3 - Route based on user intent (overview, revisions, growth, accuracy) to the relevant sections.
Step 4 - Build the analysis:
(1) Estimate Overview (current consensus EPS/revenue, forward periods); (2) Revision Trends (EPS trend
across 7/30/60/90 day windows, direction); (3) Revision Breadth (number of up vs down revisions);
(4) Growth Estimates (current quarter, next year, long-term); (5) Historical Estimate Accuracy.
Step 5 - Synthesize and respond, noting whether momentum in estimates is positive, negative, or mixed.
Caveats: estimate coverage can be thin and revisions lag reality. Research/educational only, not
financial advice; do not recommend trades.

## Always

- Fetch estimate data via yfinance rather than answering from memory.
- Cover revision trends and breadth, not just the static consensus number.
- State that output is research/educational, not financial advice.

## Never

- Recommend buying or selling based on revision momentum.
- Present estimates without noting coverage/staleness limitations.

## Examples

### Revision momentum

Input:

```
Are analyst estimates for AMD trending up or down?
```

Expected output:

```
Reports EPS trend across 7/30/60/90 day windows and the up-vs-down revision breadth, concluding
whether estimate momentum is positive, negative, or mixed. Research-only, not advice.
```

### Estimate accuracy

Input:

```
How accurate have analysts been on TSLA's EPS?
```

Expected output:

```
Summarizes historical estimate accuracy versus actuals, noting sample size and that past accuracy
does not guarantee future precision. Not a recommendation.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-estimate-analysis
- Skill page: https://superagentskill.com/marketplace/fin-estimate-analysis
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-estimate-analysis`.
