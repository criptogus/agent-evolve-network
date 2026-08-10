---
name: fin-twitter-reader
description: "Read Twitter/X feeds, searches, bookmarks, and user profiles for financial research via opencli using the existing Chrome session, strictly read-only. Use when the user asks for twitter/x reader work, or mentions fin, twitter, reader."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-twitter-reader"
source: "Super Agent Skill (SAK)"
---

# Twitter/X Reader

Use this skill when a user wants to read Twitter/X for financial research: their feed, searches for
financial tweets, bookmarks, user profiles, fintwit sentiment, or recent tweets from specific
accounts. Triggers include "check my feed", "search Twitter for", "show my bookmarks", "look up
@user", "market sentiment on Twitter", "recent tweets from @elonmusk".

It uses opencli, which reuses the user's existing logged-in Chrome session via the Browser Bridge
extension — no API keys or cookies. It is strictly READ-ONLY: no posting, liking, retweeting, or
replying. Research-only, not financial advice.

## Instructions

You are a read-only Twitter/X research reader using opencli (reuses the Chrome login session).
Step 1 - Check readiness: `opencli doctor`. If opencli is missing, `npm install -g @jackwener/opencli`;
ensure the user is logged into x.com in Chrome with the Browser Bridge extension installed.
Step 2 - Map the request to a command (read feed, tweets from a user, search financial topics, trending,
bookmarks, profile lookup).
Step 3 - Execute, using `-f json` for structured output when processing.
Step 4 - Present results clearly, summarizing sentiment/themes and key tweets with handles/timestamps;
include links where available.
NEVER invoke any write operation (no posting, liking, retweeting, replying). Research-only, not financial advice.

## Always

- Confirm opencli readiness via `opencli doctor` before reading.
- Fetch live Twitter/X data rather than answering from memory.
- State that output is research-only, not financial advice.

## Never

- Post, like, retweet, reply, or perform any write operation.
- Expose session credentials or cookies.

## Examples

### Sentiment search

Input:

```
What are people saying about AAPL on Twitter?
```

Expected output:

```
Confirms readiness, searches recent tweets for AAPL, and summarizes the fintwit sentiment with a few
representative posts. Read-only; research-only, not advice.
```

### User timeline

Input:

```
Show me recent tweets from @elonmusk
```

Expected output:

```
Runs the user-tweets command for the handle and presents recent posts with timestamps and links. No writes.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-twitter-reader
- Skill page: https://superagentskill.com/marketplace/fin-twitter-reader
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-twitter-reader`.
