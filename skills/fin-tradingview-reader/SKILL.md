---
name: fin-tradingview-reader
description: "Read the TradingView desktop app via opencli for quotes, options chains, screeners, news, watchlists, alerts, and chart state, read-only. Use when the user asks for tradingview reader work, or mentions fin, tradingview, reader."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-tradingview-reader"
source: "Super Agent Skill (SAK)"
---

# TradingView Reader

Use this skill to pull market data from a user's logged-in TradingView desktop app: spot quotes,
options chains and expiries (IV/greeks), screener results across stocks/crypto/forex/futures/bonds,
gainers/losers, news headlines and bodies, watchlists (including colored-flag lists), alerts (active,
fired, offline, log), symbol search, chart state, and screenshots.

It connects via opencli plus a CDP attach to TradingView.app (Chrome DevTools Protocol). The user
must have TradingView.app installed and be logged in; the tradingview plugin handles relaunching with
the debug port. It is strictly READ-ONLY — no trades, no watchlist edits, no alert creation/deletion,
no chart writes. Filter chains/screeners aggressively before presenting. Research-only, not financial advice.

## Instructions

You are a read-only TradingView desktop reader using opencli over CDP.
Step 1 - Ensure setup: run `opencli tradingview status`. If opencli is missing, install with
`npm install -g @jackwener/opencli` (Node >= 21). If the plugin is missing, install with
`opencli plugin install github:himself65/finance-skills/tradingview` and `opencli tradingview launch`
(warn the user to save chart layouts first, as launch relaunches the app with --remote-debugging-port=9222).
Step 2 - Map the request to a command: quote, options-chain (use --expiry and --strikes-around-spot N to
avoid 3000-row dumps), options-expiries, screener (--columns is critical; include name and any filter/sort
field; --filter is single-quoted JSON of {left,operation,right} clauses), search, news (narrow with
--symbol/--category/--section before raising --limit), watchlists, alerts, chart-state, screenshot.
Step 3 - Execute with `-f json` for programmatic use. Default --exchange NASDAQ for US equities; require
explicit exchange for ETFs/non-US. Prefer `search` over guessing ambiguous tickers.
Step 4 - Present: lead with the structure summary (spot, expiry, ATM strike, IV regime for chains; match
count and filters for screeners). Filter to ATM +/- ~6 strikes; cap screeners to top 20 unless asked.
Highlight IV skew. Summarize watchlists by counts; group alerts by status. Never expose CDP target IDs,
cookies, or layout IDs unless asked.
NEVER call any write operation (no trades, watchlist edits, alert create/delete, chart writes).
Research-only, not financial advice.

## Always

- Run `opencli tradingview status` to confirm CDP connectivity before data calls when uncertain.
- Filter options chains (expiry, strikes-around-spot) and screeners before presenting.
- Keep sessions private; do not expose CDP IDs, cookies, or layout IDs unless asked.

## Never

- Invoke any write operation — no trades, watchlist edits, alert changes, or chart writes.
- Dump full unfiltered chains or screeners.
- Present data as financial advice or a trade recommendation.

## Examples

### Options chain

Input:

```
Show me the SNDK puts for the 2026-05-22 expiry
```

Expected output:

```
Runs `opencli tradingview options-chain --ticker SNDK --expiry 2026-05-22 --type put -f json`,
leads with spot/ATM/IV regime, then an ATM-banded table. Research-only, not advice.
```

### Screener

Input:

```
TradingView screen for US stocks with RSI below 30 by volume
```

Expected output:

```
Runs the screener with --columns including name/close/RSI|60/volume, single-quoted JSON --filter,
--sort volume:desc, reports match count and filters, then top 20 rows.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-tradingview-reader
- Skill page: https://superagentskill.com/marketplace/fin-tradingview-reader
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-tradingview-reader`.
