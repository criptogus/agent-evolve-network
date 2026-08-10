---
name: fin-opencli-reader
description: "Generic read-only fallback to read any source opencli supports (Yahoo Finance, Bloomberg, Reddit, HackerNews, arXiv, Eastmoney, Xueqiu, and 90+ more). Use when the user asks for opencli generic reader work, or mentions fin, opencli, reader."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-opencli-reader"
source: "Super Agent Skill (SAK)"
---

# opencli Generic Reader

Use this skill as a generic read-only fallback to read any source in opencli's adapter registry (90+
sites: Yahoo Finance, Bloomberg, Reuters, Barchart, Reddit, HackerNews, Substack, Medium, arXiv,
Google Scholar, Eastmoney, Xueqiu, Weibo, YouTube, and more) when no dedicated finance-skill covers
it. Triggers include "use opencli to read", "grab the HackerNews frontpage", "read r/wallstreetbets",
"fetch Eastmoney hot stocks", "search arXiv for".

Prefer the dedicated readers (twitter, linkedin, discord, telegram, yc) when the source matches one of
them. If the source is not in opencli's registry, stop and tell the user — never fall back to ad-hoc
scraping. Strictly READ-ONLY: never invoke write commands (post, like, comment, send, upvote,
subscribe, follow, delete). Research-only.

## Instructions

You are a generic read-only reader using opencli's adapter registry (90+ sites).
Step 1 - Decide whether to use this skill: defer to the dedicated reader for Twitter/X, LinkedIn,
Discord, Telegram, and Y Combinator. Use this skill for any other opencli-supported source. If the
source is not in opencli's registry, stop and tell the user it isn't covered — do not scrape ad hoc.
Step 2 - Ensure opencli is ready (install with `npm install -g @jackwener/opencli` if missing).
Step 3 - Discover the right command from the registry (machine-readable JSON), filter to the site, and
read site-level/command-level help for args, flags, and defaults.
Step 4 - Check the adapter's strategy (PUBLIC vs COOKIE) before running.
Step 5 - Execute the read command with universal flags (`-f json` for processing). On failure, re-run
with diagnostic context.
Step 6 - Present results clearly, summarizing rather than dumping; include links/sources.
NEVER invoke any write command (post, like, comment, send, save, upvote, subscribe, follow, delete,
reply-dm). Research-only, not financial advice.

## Always

- Defer to a dedicated reader when the source matches one (twitter/linkedin/discord/telegram/yc).
- Confirm the source is in opencli's registry and check its PUBLIC/COOKIE strategy before reading.
- State that output is research-only, not financial advice.

## Never

- Invoke any write command (post, like, comment, send, upvote, subscribe, follow, delete).
- Fall back to ad-hoc scraping when opencli does not cover the source.

## Examples

### HackerNews frontpage

Input:

```
Grab the HackerNews front page with opencli
```

Expected output:

```
Ensures opencli is ready, discovers the hackernews command, runs the top/frontpage read with -f json,
and summarizes the headlines with links. Read-only; research-only.
```

### Unsupported source

Input:

```
Read my company's internal wiki with opencli
```

Expected output:

```
Checks the registry, finds no adapter, and tells the user the source isn't covered rather than
attempting ad-hoc scraping.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-opencli-reader
- Skill page: https://superagentskill.com/marketplace/fin-opencli-reader
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-opencli-reader`.
