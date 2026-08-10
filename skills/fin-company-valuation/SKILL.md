---
name: fin-company-valuation
description: "Estimate a public company's intrinsic value via DCF, relative multiples, and sum-of-parts, then triangulate to a blended implied share price with upside/downside. Use when the user asks for company valuation work, or mentions fin, company, valuation."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-company-valuation"
source: "Super Agent Skill (SAK)"
---

# Company Valuation

Use this skill whenever a user asks what a public company is worth: "valuation of NVDA", "fair
value of TSLA", "build a DCF for MSFT", "is X overvalued/undervalued", "EV/EBITDA target", "SOTP",
or any ticker in the context of computing intrinsic or relative valuation. By default it runs all
three methods (DCF + relative + SOTP when 2+ segments exist) and presents a blended implied price
with a WACC x terminal-growth sensitivity table and Bull/Base/Bear scenarios.

It detects the richest available data path (yfinance, Funda CLI, etc.) at runtime. Do not answer
valuation questions from memory — always run the workflow. Output is research/educational, not
financial advice; it is not a price target or buy/sell recommendation.

## Instructions

You are a valuation analyst. Triangulate a company's intrinsic value via three methods and blend
to an implied share price. Always run the workflow; never answer from memory.
Step 1 - Detect data source/deps (yfinance, Funda CLI) and pick the richest available path.
Step 2 - Choose methods and set defaults: DCF always; relative always; SOTP when 2+ distinct
reporting segments exist.
Step 3 - Pull data (financials, consensus, peers, segments).
Step 4 - DCF: project 5-year FCFF (revenue growth fading from Y1 toward terminal g; margins at 3y
median), discount at WACC, compute terminal value by both perpetuity-growth and exit-multiple and
use the midpoint, then bridge enterprise to equity and per-share value.
Step 5 - Relative: apply peer-median P/E, EV/Revenue, EV/EBITDA.
Step 6 - SOTP (multi-segment only): value each segment at pure-play peer multiples.
Step 7 - Triangulate: blend the implied prices, build a 5x5 WACC x terminal-growth sensitivity grid,
and Bull/Base/Bear scenarios; compute upside/downside vs current market price.
Step 8 - Respond with the blended implied price, sensitivity table, scenarios, key assumptions, and caveats.
Disclaimer: Research/educational output. Not financial advice; not a price target or buy/sell call.

## Always

- Run the full workflow and fetch live data; never value from memory.
- Default to DCF + relative + SOTP (when 2+ segments) and present a blended implied price.
- Include a WACC x terminal-growth sensitivity table, scenarios, and assumptions.
- State that output is research/educational and not financial advice.

## Never

- Present the implied price as a price target or buy/sell recommendation.
- Skip the sensitivity table or scenario analysis.

## Examples

### Intrinsic valuation

Input:

```
What is NVDA worth? Build a DCF.
```

Expected output:

```
Pulls data, builds a 5-year FCFF DCF (WACC, midpoint terminal value), adds relative and SOTP,
and returns a blended implied price with upside/downside vs market, a WACC x g sensitivity grid,
Bull/Base/Bear scenarios, and assumptions. Disclaimer: research-only, not advice.
```

### Relative check

Input:

```
Is TSLA overvalued on an EV/EBITDA basis?
```

Expected output:

```
Applies peer-median EV/EBITDA (plus P/E, EV/Revenue) to derive an implied price, compares with
the DCF and current price, and frames upside/downside with caveats. Not a recommendation.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-company-valuation
- Skill page: https://superagentskill.com/marketplace/fin-company-valuation
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-company-valuation`.
