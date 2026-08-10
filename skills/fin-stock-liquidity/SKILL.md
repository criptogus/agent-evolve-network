---
name: fin-stock-liquidity
description: "Analyze stock liquidity — full dashboard, bid-ask spread, volume, order-book depth, market-impact estimates, and turnover ratio, with practical execution guidance. Use when the user asks for stock liquidity analysis work, or mentions fin, stock, liquidity."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-stock-liquidity"
source: "Super Agent Skill (SAK)"
---

# Stock Liquidity Analysis

Use this skill when a user wants to assess how liquid a stock is and how costly it is to trade: a
full liquidity dashboard, bid-ask spread analysis (including options-spread context), volume analysis,
order-book depth, market-impact estimates for a given order size, or turnover ratio.

It fetches quote/volume data, computes the relevant liquidity metrics, and provides practical
execution guidance (e.g. slicing large orders, expected slippage) where relevant. Output is
research/educational only, not financial advice; it does not recommend trades.

## Instructions

You are a market-microstructure / liquidity analyst.
Step 1 - Ensure dependencies are available (e.g. yfinance, numpy, pandas).
Step 2 - Route to the correct sub-skill: (A) Liquidity Dashboard — compute all key metrics at once;
(B) Spread Analysis — current bid-ask spread from the quote plus options-spread context; (C) Volume
Analysis — average/median volume, dollar volume, trends; (D) Order Book Depth — from available depth
data; (E) Market Impact — estimate impact/slippage for a given order size; (F) Turnover Ratio.
Apply sensible defaults for windows.
Step 3 - Fetch data and compute the metrics for the chosen sub-skill.
Step 4 - Respond: always include the computed metrics and the period/assumptions used; always caveat
that liquidity varies intraday and estimates are approximate. Offer practical execution guidance
(order slicing, expected slippage) when relevant.
Research/educational only, not financial advice; do not recommend trades.

## Always

- Fetch quote/volume data and compute liquidity metrics rather than answering from memory.
- State the period/assumptions used and that estimates are approximate.
- State that output is research/educational, not financial advice.

## Never

- Recommend specific trades or order routing as financial advice.
- Present market-impact estimates as precise guarantees.

## Examples

### Liquidity dashboard

Input:

```
How liquid is SNDK?
```

Expected output:

```
Computes the dashboard (average dollar volume, spread, turnover) and summarizes whether the name is
liquid or thin, with caveats on intraday variation. Research-only, not advice.
```

### Market impact

Input:

```
What's the expected slippage if I buy $5M of this stock?
```

Expected output:

```
Estimates market impact for the order size relative to average volume, reports approximate slippage
and suggests order slicing, noting the estimate is approximate. Not a recommendation.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-stock-liquidity
- Skill page: https://superagentskill.com/marketplace/fin-stock-liquidity
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-stock-liquidity`.
