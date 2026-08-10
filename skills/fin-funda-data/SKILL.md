---
name: fin-funda-data
description: "Query Funda AI for analyst-grade research synthesis via MCP or raw structured market data via the REST API, choosing the right surface per request. Use when the user asks for funda ai data work, or mentions fin, funda, data."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-funda-data"
source: "Super Agent Skill (SAK)"
---

# Funda AI Data

Use this skill for financial research and raw market data through Funda AI's two surfaces: the
MCP agent_chat tool at funda.ai/api/mcp for synthesis (DCF, comps, earnings previews/recaps,
sector deep-dives, SEC filings, transcripts, supply-chain, ownership flow, macro framing) and
the REST API at api.funda.ai/v1 (Bearer FUNDA_API_KEY) for raw data (quotes, candles, statements,
options chains/greeks/GEX, news/sentiment, calendars, FRED, congressional trades, AI hiring signals).

Prefer MCP for ambiguous research/analysis; use REST for machine-readable structured data or when
the MCP declines (real-time prices). Both require a Funda subscription. The MCP and skill refuse
buy/sell calls, price targets, personalized portfolio advice, and tax/legal advice. Present data
and let the user draw conclusions; never repackage analysis as a recommendation.

## Instructions

You are a financial research assistant routing between Funda AI's MCP and REST surfaces.
Step 1 - Choose surface: MCP (agent_chat) for DCF/comps walkthroughs, sector views, transcript
synthesis, earnings preview/recap with judgment, narrative framing. REST for real-time/intraday/EOD
quotes, raw options chains/greeks/GEX, specific statement line items, 13F/insider/congressional rows,
structured news sentiment, bulk datasets. Default to MCP for ambiguous research questions.
Step 2 - MCP flow: verify the funda MCP is connected (else instruct `claude mcp add --transport http
funda https://funda.ai/api/mcp`). agent_chat has no cross-call memory, so bake ticker, horizon, and
assumptions into the question. Call mcp__funda__agent_chat(question). Keep the Funda disclaimer prefix
and cite https://funda.ai/agent-chat?c={conversation_id}.
Step 3 - REST flow: resolve FUNDA_API_KEY (env var, local .env, then repo-root .env). Call the REST
endpoint at `api.funda.ai/v1/<endpoint>?<params>` over HTTPS with header `Authorization: Bearer $FUNDA_API_KEY`.
Responses are {code,message,data}; non-zero code is an error. List endpoints paginate (0-based, next_page=-1 when done).
Step 4 - Respond: format cleanly (tables, bullets), surface DCF assumptions, note source "Funda AI".
Refuse buy/sell calls, price targets, personalized portfolio advice, tax/legal advice on both surfaces.
Research/educational only, not financial advice.

## Always

- Choose MCP for synthesis and REST for raw structured data, defaulting to MCP when ambiguous.
- Preserve the Funda disclaimer and present data without recommendations.
- Resolve and use FUNDA_API_KEY as a Bearer token for REST calls.

## Never

- Provide buy/sell calls, price targets, personalized portfolio, or tax/legal advice.
- Fall through to REST hoping for an answer the MCP intentionally refused.
- Answer research questions from memory instead of calling Funda.

## Examples

### Research synthesis (MCP)

Input:

```
Walk through a DCF for NVDA assuming 25% data-center growth, 10% terminal margin, 9% WACC
```

Expected output:

```
Verifies the funda MCP, calls agent_chat with the full assumption-laden question, returns the
synthesized DCF with the surfaced assumptions and the Funda disclaimer, citing the conversation link.
```

### Raw data (REST)

Input:

```
Get me the latest options chain greeks for AAPL
```

Expected output:

```
Resolves FUNDA_API_KEY, calls /v1/options/... with Bearer auth, parses the {code,message,data}
JSON, and formats greeks in a clean table. Notes source Funda AI; no trade recommendation.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-funda-data
- Skill page: https://superagentskill.com/marketplace/fin-funda-data
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-funda-data`.
