# @superagentskill/sdk

Official TypeScript SDK for the [Super Agent Skill](https://superagentskill.com) MCP server.

```bash
npm install @superagentskill/sdk
```

## Usage

```ts
import { SuperAgentSkill, idempotencyKey } from "@superagentskill/sdk";

const sas = new SuperAgentSkill({
  token: process.env.SAS_TOKEN, // optional for read tools, required for writes
});

// Strongly-typed tool calls
const out = await sas.call("search_registry", { query: "cardiology", limit: 5 });
//    ^? { query: string; count: number; items: Package[] }

// Idempotent writes — retry-safe
await sas.call("upload_packages", {
  files: [{ name: "triage.md", content: "# Cardiology triage" }],
  idempotency_key: idempotencyKey(["triage", "v1"]),
});

// Rate-limit aware (parsed from X-RateLimit-* headers)
console.log(sas.lastRateLimit);
// → { limit: 100, remaining: 87, resetAtUnix: 1716508800, window: "day" }
```

## What's handled for you

- **Headers** — sets `Accept: application/json, text/event-stream` (the 406 footgun) automatically.
- **Auth** — Bearer header from `token`. On 401, throws `MCPUnauthorizedError` with the recovery URLs from the server hint.
- **Retries** — 3 attempts by default. 429s honour `Retry-After`; 5xx and network errors use exponential backoff.
- **Rate-limit visibility** — `sas.lastRateLimit` is populated after every call so you can self-regulate before hitting the ceiling.
- **Idempotency keys** — pass `idempotency_key` to write tools (`upload_packages`, `request_primitive`) and retries replay the original response instead of double-charging quota or duplicating drafts. The `idempotencyKey()` helper builds a stable key from any tuple.
- **Strongly typed** — every tool has typed input + output via `ToolMap`. Adding a new tool means updating one file.

## Tools

| Tool                | Read | Auth |
|---------------------|:----:|:----:|
| `list_packages`     |  ✓   |      |
| `search_registry`   |  ✓   |      |
| `get_package`       |  ✓   |      |
| `get_methodology`   |  ✓   |      |
| `review_skill`      |  ✓   |      |
| `report_execution`  |  ✓   |      |
| `upload_packages`   |  ✗   |  ✓   |
| `request_primitive` |  ✗   |  ✓   |

## Errors

```ts
import { MCPUnauthorizedError, MCPRateLimitedError } from "@superagentskill/sdk";

try {
  await sas.call("upload_packages", { files: [...] });
} catch (e) {
  if (e instanceof MCPUnauthorizedError) {
    console.error("Authorize at", e.authorizationUrl);
  } else if (e instanceof MCPRateLimitedError) {
    console.warn("Retry after", e.retryAfterSeconds, "s");
  } else throw e;
}
```

## Health check

```ts
const h = await sas.health();
// → { ok: true, version: "1.5.0", uptime_seconds: 41234, db: { ok: true, ping_ms: 12 }, ... }
```

## License

MIT
