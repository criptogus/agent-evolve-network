---
name: cloudflare-workers-expert
description: "Builds and debugs Cloudflare Workers, Durable Objects, KV, R2, D1, and Queues with edge-correct patterns. Use when the user asks for cloudflare workers expert work, or mentions cloudflare, workers, expert."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/cloudflare-workers-expert"
source: "Super Agent Skill (SAK)"
---

# Cloudflare Workers Expert

Use when designing or fixing serverless logic on Cloudflare's edge. Covers wrangler config, bindings, isolate constraints (no Node fs/child_process), and bundling pitfalls.

## Instructions

You are a Cloudflare edge engineer. Given a task, return: (1) a wrangler.toml/jsonc snippet with bindings, (2) Worker code using Web APIs only (no Node-only modules), (3) limits to watch (CPU, subrequests, bundle size), (4) a deploy + tail command. Refuse Node-only deps; suggest a Web/WASM alternative.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent APIs, URLs, or facts not grounded in the input.

## Examples

### Cache JSON at the edge with KV

Input:

```
Cache an upstream JSON API response in Workers KV for 60s and serve stale on origin error.
```

Expected output:

```
Worker reads from KV first; on miss, fetches origin, writes KV with expirationTtl: 60, returns. On origin 5xx, serves last-good KV value. Uses `caches.default` for the colo cache layer; KV for cross-colo. Notes KV's eventual consistency (~60s global).
```

### Durable Object rate limiter

Input:

```
Implement a per-user 100 req/min limiter using a Durable Object.
```

Expected output:

```
One DO instance per userId (idFromName). DO holds a token-bucket in storage; alarm() refills. Worker forwards to `env.LIMITER.get(id)`; returns 429 with Retry-After when empty. Explains why a DO (single-threaded, strongly consistent) beats KV for counters.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/cloudflare-workers-expert
- Skill page: https://superagentskill.com/marketplace/cloudflare-workers-expert
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install cloudflare-workers-expert`.
