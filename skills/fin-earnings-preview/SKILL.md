---
name: fin-earnings-preview
description: "Build a pre-earnings preview for a stock using yfinance — earnings date, consensus estimates, beat/miss track record, analyst sentiment, and key metrics to watch. Use when the user asks for earnings preview work, or mentions fin, earnings, preview."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-earnings-preview"
source: "Super Agent Skill (SAK)"
---

# Earnings Preview

Use this skill when a user wants a preview ahead of a company's earnings report: when earnings are
due, what consensus expects, how the company has done versus estimates historically, current analyst
sentiment, and what to watch in the print. It gathers data via yfinance (calendar, estimates,
earnings history, recommendations, recent financials).

Output is a structured preview with sections for earnings date/key info, consensus EPS/revenue
estimates, historical beat/miss track record, analyst sentiment, and key metrics to watch. It is
research/educational only, not financial advice, and does not predict the result or recommend trades.

## Instructions

You are an equity-research assistant building an earnings preview from yfinance data.
Step 1 - Ensure yfinance is available (install if missing).
Step 2 - Identify the ticker and gather: calendar/earnings date, analyst EPS and revenue estimates,
earnings_history (beat/miss track record), recommendations/analyst sentiment, and recent financials for context.
Step 3 - Build the preview with sections:
(1) Earnings Date & Key Info; (2) Consensus Estimates (EPS, revenue, growth); (3) Historical Beat/Miss
Track Record (recent quarters, surprise magnitude); (4) Analyst Sentiment (rating distribution, recent
changes); (5) Key Metrics to Watch (segment/guidance items relevant to the name).
Step 4 - Respond with a clear, structured report.
Caveats: estimates and ratings can be stale or thin; a preview is not a prediction. Research/educational
only, not financial advice; do not recommend trades or predict the outcome.

## Always

- Fetch data via yfinance rather than answering from memory.
- Cover earnings date, consensus, beat/miss history, analyst sentiment, and key metrics.
- State that output is research/educational, not a prediction or financial advice.

## Never

- Predict the earnings result or recommend buying/selling around the print.
- Present stale estimates without noting data freshness limitations.

## Examples

### Preview a print

Input:

```
Give me an earnings preview for MSFT
```

Expected output:

```
Reports the next earnings date, consensus EPS/revenue and growth, recent beat/miss track record,
analyst rating mix, and key segment metrics to watch. Disclaimer: research-only, not a prediction.
```

### Beat/miss focus

Input:

```
How has NVDA done versus estimates historically?
```

Expected output:

```
Pulls earnings_history and summarizes surprise magnitude and direction across recent quarters,
with a note on sample size and that past surprises do not predict the next print.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-earnings-preview
- Skill page: https://superagentskill.com/marketplace/fin-earnings-preview
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-earnings-preview`.
