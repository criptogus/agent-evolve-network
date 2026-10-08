# Complete local test discovery

Run `npm run test:all` after installing the locked dependencies. This discovers every tests/*.test.ts file, including catalog and plugin-conformance checks omitted by the older test:plain/test:ts lists. Zero cases or import errors must not be treated as success. Node 22 supports these files through --experimental-strip-types; executable relative imports in catalog.ts and conformance.ts therefore include .ts.

2026-10-08: expanded discovery exposed two module-resolution failures. Explicit extensions fixed them; all185 Node tests passed across28 files. The catalog file also runs its top-level assertions. This is local evidence only: live marketplace, billing, authenticated MCP writes, model calls, published signatures and evaluations each require separate deployed receipts.

Liquid's owned product batch can invoke this same discovery and keep source/public/UI/runtime proof separate. No tests may relax package review_status, publication gates or economic authorization to obtain a passing result.

The GitHub tests workflow now runs test:all rather than a hand-maintained subset. Its first run failed before any test because package-lock.json lacked Nitro's optional lru-cache peer. The npm lock was synchronized without changing application dependency versions. Live public MCP search returned an application error despite successful initialize/tools discovery; this is a separate unresolved deployment/data issue, not a local passing test.
