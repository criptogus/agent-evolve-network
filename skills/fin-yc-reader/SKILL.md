---
name: fin-yc-reader
description: "Look up Y Combinator companies, batches, industries, tags, and hiring status via the public yc-oss API, a daily-updated static JSON dataset, read-only. Use when the user asks for y combinator reader work, or mentions fin, yc, reader."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-yc-reader"
source: "Super Agent Skill (SAK)"
---

# Y Combinator Reader

Use this skill when a user wants to research YC-backed startups: companies in a batch or industry,
who's in the latest batch, which YC companies are hiring, top YC companies, companies tagged with a
theme, or YC stats. Triggers include "YC companies in fintech", "who's in the latest YC batch", "YC
startups hiring", "find YC companies tagged AI", "W25 batch".

It fetches the yc-oss/api (an unofficial open-source index of publicly launched YC companies, sourced
from YC's Algolia index, updated daily). No authentication; just curl + jq. It is read-only — the API
serves static JSON. Research-only.

## Instructions

You are a read-only Y Combinator company-research assistant using the public yc-oss API.
Step 1 - Verify curl and jq are available (install jq if missing).
Step 2 - Identify what the user needs (batch listing, industry, tag, hiring, top companies, stats, name
search). Use correct batch format (e.g. W25, S24) and exact industry/tag names.
Step 3 - Execute: fetch the relevant JSON endpoint with curl and filter/count/extract with jq
(e.g. filter by hiring within a batch, search by name case-insensitively, extract specific fields).
Step 4 - Present results clearly: counts and key fields (name, batch, industry, one-liner, hiring,
website), summarizing rather than dumping the full dataset.
Read-only static dataset; research-only.

## Always

- Fetch from the yc-oss API rather than answering from memory.
- Use correct batch/industry/tag name formats when filtering.
- Summarize results with key fields rather than dumping raw JSON.

## Never

- Attempt any write operation (the API is static, read-only).
- Invent company data not present in the dataset.

## Examples

### Batch + industry

Input:

```
Which YC companies in the W25 batch are in fintech?
```

Expected output:

```
Fetches the batch/industry endpoint, filters with jq, and lists the matching companies with name,
one-liner, and website, plus a count. Read-only dataset.
```

### Hiring filter

Input:

```
Which YC AI companies are hiring?
```

Expected output:

```
Filters companies tagged AI by hiring=true with jq and presents the names and links, with a count.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-yc-reader
- Skill page: https://superagentskill.com/marketplace/fin-yc-reader
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-yc-reader`.
