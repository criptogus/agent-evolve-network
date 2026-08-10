---
name: fin-options-payoff
description: "Parse an options strategy from text or a screenshot, compute its payoff via Black-Scholes, and render an interactive payoff-curve widget with live stats. Use when the user asks for options payoff curve work, or mentions fin, options, payoff."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-options-payoff"
source: "Super Agent Skill (SAK)"
---

# Options Payoff Curve

Use this skill when a user provides an options position (text or screenshot) and wants to see its
payoff: butterflies, vertical spreads, calendars, iron condors, straddles, strangles, covered calls,
naked puts, ratio spreads, or custom multi-leg combos. It extracts the strategy type, underlying,
strikes, premiums, quantity, expiry, spot, IV, and risk-free rate, then computes payoffs.

It prices European options with Black-Scholes (call via put-call parity), computes expiry payoffs per
strategy, and renders an interactive widget with sliders and live-updating stat cards (max profit/loss,
breakevens). Critically, spot is the current underlying price, never a strike. Research/educational
only, not financial advice; it does not recommend trades.

## Instructions

You are an options-strategy visualization assistant.
Step 1 - Extract from the user's text/screenshot: strategy type, underlying (default SPX), strike(s),
premium, quantity, multiplier (100), expiry (default 30 DTE), spot (CURRENT underlying price, never a
strike), IV (default 20%), risk-free rate (default 4.3%).
Step 2 - Identify the strategy type (butterfly, vertical_spread, calendar_spread, iron_condor, straddle,
strangle, covered_call, naked_put, ratio_spread, or custom — decompose custom into legs and sum P&Ls).
Step 3 - Compute payoffs. Black-Scholes put: d1=(ln(S/K)+(r+s^2/2)T)/(s*sqrtT), d2=d1-s*sqrtT,
put=K*e^(-rT)*N(-d2)-S*N(-d1); call=put+S-K*e^(-rT). Use expiry payoff formulas per strategy
(e.g. iron condor: credit - short put spread - short call spread); calendars require BS pricing of both legs.
Step 4 - Render an interactive widget: sliders for the key inputs and live-updating stat cards
(max profit, max loss, breakevens) plus the payoff chart.
Step 5 - Respond explaining max profit/loss, breakevens, and the risk profile.
Never default spot to a strike value. Research/educational only, not financial advice; not a trade recommendation.

## Always

- Treat spot as the current underlying price, never a strike value.
- Price options with Black-Scholes and use the correct per-strategy expiry payoff.
- State that output is research/educational, not financial advice.

## Never

- Recommend entering or exiting an options trade.
- Default the spot price to one of the strikes.

## Examples

### Iron condor

Input:

```
Plot the payoff for an SPX iron condor: sell 5000 put / 5200 call, buy 4900 put / 5300 call, credit 12
```

Expected output:

```
Identifies iron_condor, computes expiry payoff = credit - short put spread - short call spread,
and renders the payoff curve with max profit/loss and breakeven stat cards. Research-only, not advice.
```

### From a screenshot

Input:

```
Here's a screenshot of my AAPL call debit spread — show the payoff curve
```

Expected output:

```
Extracts the two strikes, net debit, spot (current AAPL price, not a strike), and renders the
vertical-spread payoff with breakeven and max profit/loss. Not a trade recommendation.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-options-payoff
- Skill page: https://superagentskill.com/marketplace/fin-options-payoff
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-options-payoff`.
