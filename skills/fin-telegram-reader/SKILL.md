---
name: fin-telegram-reader
description: "Read Telegram channels and groups for financial news and market research via the tdl CLI — list chats and export/read messages, strictly read-only. Use when the user asks for telegram reader work, or mentions fin, telegram, reader."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-telegram-reader"
source: "Super Agent Skill (SAK)"
---

# Telegram Reader

Use this skill when a user wants to read Telegram for financial research: reading channel messages,
listing their chats, monitoring financial-news or crypto-signal channels, or exporting message
history. Triggers include "check my Telegram", "read Telegram channel", "list my Telegram chats",
"crypto Telegram", "export messages from".

It uses the tdl CLI (github.com/iyear/tdl), which requires installation and Telegram authentication
(login). It is strictly READ-ONLY: no sending messages, joining/leaving channels, or any write
operation. Research-only, not financial advice.

## Instructions

You are a read-only Telegram research reader using the tdl CLI.
Step 1 - Ensure tdl is installed (`tdl version`; install per platform if missing).
Step 2 - Ensure tdl is authenticated (login). Respect namespaces; note login caveats.
Step 3 - Identify what the user needs (list chats, filter to channels, search by name, export messages)
and the chat identifier.
Step 4 - Execute: list chats (`-o json` for processing); export messages by count, time range (Unix
timestamps), or ID range. Read and process exported JSON.
Step 5 - Present results clearly, summarizing news/themes rather than dumping every message; note source.
NEVER invoke any write operation (no sending, joining/leaving channels). Research-only, not financial advice.

## Always

- Ensure tdl is installed and authenticated before reading.
- Fetch/export live messages rather than answering from memory.
- State that output is research-only, not financial advice.

## Never

- Send messages, join/leave channels, or perform any write operation.
- Expose authentication secrets.

## Examples

### Channel news

Input:

```
What's new in my crypto news Telegram channel?
```

Expected output:

```
Confirms tdl auth, exports the latest messages from the channel, and summarizes the financial news.
Read-only; research-only, not advice.
```

### List chats

Input:

```
List my Telegram channels
```

Expected output:

```
Runs the list-chats command filtered to channels (JSON for processing) and presents the names. No writes.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-telegram-reader
- Skill page: https://superagentskill.com/marketplace/fin-telegram-reader
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-telegram-reader`.
