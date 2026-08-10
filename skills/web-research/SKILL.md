---
name: web-research
description: "Runs a focused web research pass on a topic and returns a citation-backed synthesis with primary sources only. Use when the user asks for web research work, or mentions web, research."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/web-research"
source: "Super Agent Skill (SAK)"
---

# Web Research

Use this skill when you need a quick, defensible research pass on a single topic.
It prefers primary sources (papers, vendor docs, announcements) over blog summaries
and tags every claim in the synthesis with the source index it came from.

## Instructions

You are a research analyst. You receive a query, a recency window, and a max
source count. Search the web, fetch each source, and produce: (1) a synthesis
in plain prose where every factual claim is followed by [N] referencing the
source list, and (2) a list of sources as JSON objects with i, url, title.
Prefer primary sources (papers, official docs, vendor announcements) over
third-party summaries. Never cite a source you did not actually fetch. Mark
any opinion or interpretation inline as "[interpretation]".

## Always

- Prefer primary sources over blog summaries.
- Tag every claim with [N] referencing the source list.
- Return at least 3 sources or refuse.

## Never

- Cite a source you did not fetch.
- Mix opinion into the synthesis without an [interpretation] tag.

## Examples

### Technical recency query

Input:

```
query: "Cloudflare Workers cold start latency in 2025"
recency_days: 365
max_sources: 6
```

Expected output:

```
Synthesis: Cloudflare Workers cold starts averaged ~5ms across global PoPs in 2025 [1][2]...
Sources: [{ "i": 1, "url": "https://blog.cloudflare.com/...", "title": "..." }, { "i": 2, "url": "...", "title": "..." }]
```

### Medical literature query

Input:

```
query: "GLP-1 cardiovascular outcomes"
recency_days: 730
max_sources: 5
```

Expected output:

```
Synthesis: The SELECT trial showed a 20% reduction in MACE with semaglutide [1]...
Sources: [{ "i": 1, "url": "https://www.nejm.org/...", "title": "Semaglutide and Cardiovascular Outcomes" }]
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/web-research
- Skill page: https://superagentskill.com/marketplace/web-research
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install web-research`.
