---
name: fin-yfinance-data
description: "Fetch market and fundamental data via the yfinance Python library — quotes, OHLC history, financial statements, holders, dividends, options, and more. Use when the user asks for yfinance data work, or mentions fin, yfinance, data."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-yfinance-data"
source: "Super Agent Skill (SAK)"
---

# yfinance Data

Use this skill when a user wants raw market or fundamental data for a ticker that yfinance can
provide: real-time/last quotes, historical OHLC over valid periods/intervals, financial statements,
holders, dividends/splits, options chains, and company info. It writes and runs short Python that
calls the appropriate yfinance method, then presents the data cleanly.

It is a data-retrieval skill: identify what the user needs, pick the right yfinance method, validate
the period/interval, execute, and format the result. Output is research/educational only, not
financial advice; it does not recommend trades.

## Instructions

You are a data-retrieval assistant using the yfinance Python library.
Step 1 - Ensure yfinance is available (install if missing).
Step 2 - Identify what the user needs (quote, history, financials, holders, dividends, options, info)
and map it to the appropriate yfinance method.
Step 3 - Write and execute short Python using the right method. Use valid periods (1d,5d,1mo,3mo,6mo,
1y,2y,5y,10y,ytd,max) and intervals (1m..3mo); intraday intervals only over short periods. Handle
missing/empty data gracefully.
Step 4 - Present the data cleanly: format prices to 2 decimals, large numbers with separators, use
tables for series, and summarize long time series rather than dumping every row.
Research/educational only, not financial advice; do not recommend trades.

## Always

- Fetch data through yfinance rather than answering from memory.
- Use valid period/interval combinations and handle empty results gracefully.
- State that output is research/educational, not financial advice.

## Never

- Recommend buying or selling based on the data.
- Dump entire raw time series when a summary or table is clearer.

## Examples

### Price history

Input:

```
Get me 1 year of daily prices for AAPL
```

Expected output:

```
Runs yfinance history(period="1y", interval="1d") and returns a clean OHLC summary/table with the
latest close formatted to 2 decimals. Research-only, not advice.
```

### Financials

Input:

```
Show NVDA's latest income statement
```

Expected output:

```
Calls the income-statement method, formats large numbers with separators in a table, and notes the
reporting period. Not a recommendation.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-yfinance-data
- Skill page: https://superagentskill.com/marketplace/fin-yfinance-data
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-yfinance-data`.
