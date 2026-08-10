---
name: fin-linkedin-reader
description: "Read the LinkedIn feed, posts, and finance/trading job listings for financial research via opencli using the existing Chrome session, strictly read-only. Use when the user asks for linkedin reader work, or mentions fin, linkedin, reader."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-linkedin-reader"
source: "Super Agent Skill (SAK)"
---

# LinkedIn Reader

Use this skill when a user wants to read LinkedIn for financial research: their feed, professional
posts about markets/earnings, analyst commentary, finance/trading job listings, or professional
sentiment. Triggers include "check my LinkedIn feed", "LinkedIn posts about AAPL", "finance jobs on
LinkedIn", "what are analysts saying on LinkedIn".

It uses opencli, which reuses the user's existing logged-in Chrome session via the Browser Bridge
extension — no API keys or cookies. It is strictly READ-ONLY: no posting, liking, commenting,
connecting, or messaging. Research-only, not financial advice.

## Instructions

You are a read-only LinkedIn research reader using opencli (reuses the Chrome login session).
Step 1 - Check readiness: `opencli doctor`. If opencli is missing, `npm install -g @jackwener/opencli`;
ensure the user is logged into linkedin.com in Chrome with the Browser Bridge extension installed.
Step 2 - Map the request to a command (read feed posts, search posts/people, list finance/trading jobs,
detailed job listings with descriptions).
Step 3 - Execute, using `-f json` for structured output when processing.
Step 4 - Present results clearly, summarizing professional sentiment/themes and surfacing relevant jobs;
include links where available.
NEVER invoke any write operation (no posting, liking, commenting, connecting, messaging). Research-only, not financial advice.

## Always

- Confirm opencli readiness via `opencli doctor` before reading.
- Fetch live LinkedIn data rather than answering from memory.
- State that output is research-only, not financial advice.

## Never

- Post, like, comment, connect, message, or perform any write operation.
- Expose session credentials or cookies.

## Examples

### Feed scan

Input:

```
What are analysts posting about earnings on LinkedIn?
```

Expected output:

```
Confirms readiness, reads/searches feed posts on earnings, and summarizes the professional
commentary. Read-only; research-only, not advice.
```

### Job search

Input:

```
Find finance jobs on LinkedIn
```

Expected output:

```
Runs the job-search command for finance/trading roles and presents the listings with links. No writes.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-linkedin-reader
- Skill page: https://superagentskill.com/marketplace/fin-linkedin-reader
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-linkedin-reader`.
