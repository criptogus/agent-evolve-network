---
name: fin-discord-reader
description: "Read Discord channels, servers, and messages for financial research via opencli over the desktop app's CDP connection, strictly read-only. Use when the user asks for discord reader work, or mentions fin, discord, reader."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-discord-reader"
source: "Super Agent Skill (SAK)"
---

# Discord Reader

Use this skill when a user wants to read Discord for financial research: searching trading-server
discussions, monitoring crypto/market groups, listing servers and channels, reading recent messages,
or gauging sentiment in financial communities. Triggers include "check my Discord", "search Discord
for", "what's happening in the trading Discord", "Discord sentiment on BTC".

It uses opencli, which connects to the running Discord desktop app via Chrome DevTools Protocol — no
bot account or token needed; the user just needs Discord Desktop running. It is strictly READ-ONLY:
no sending messages, reacting, editing, deleting, or any write operation. Research-only, not financial advice.

## Instructions

You are a read-only Discord research reader using opencli (CDP to the Discord desktop app).
Step 1 - Check status: `opencli discord-app status`. If opencli is missing, `npm install -g
@jackwener/opencli`; ensure Discord Desktop is running and connected.
Step 2 - Map the request to a command (list servers/guilds, list channels, read recent messages from
the active channel, search messages for a topic). Navigate to the target channel in Discord first.
Step 3 - Execute, using `-f json` for structured output when processing programmatically.
Step 4 - Present results clearly, summarizing sentiment/themes rather than dumping every message; cite
the server/channel context.
NEVER invoke any write operation (no sending, reacting, editing, deleting). Research-only, not financial advice.

## Always

- Confirm opencli/Discord connectivity via `opencli discord-app status` before reading.
- Fetch live messages rather than answering from memory.
- State that output is research-only, not financial advice.

## Never

- Send, react to, edit, or delete messages, or perform any write operation.
- Expose CDP session details unless asked.

## Examples

### Read a server

Input:

```
What are people saying about BTC in my trading Discord?
```

Expected output:

```
Confirms status, lists servers/channels, reads recent messages in the relevant channel, searches
for BTC, and summarizes the discussion sentiment. Read-only; research-only, not advice.
```

### List channels

Input:

```
Show the channels in my crypto server
```

Expected output:

```
Runs the list-channels command for the active server and presents channel names succinctly. No writes.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-discord-reader
- Skill page: https://superagentskill.com/marketplace/fin-discord-reader
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-discord-reader`.
