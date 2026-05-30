# Security Policy

## Reporting a vulnerability

If you discover a security issue in Super Agent Skill — in the platform code, in the MCP endpoint, or in a published package that could be used to attack downstream agents — please report it privately:

- **Email:** contact@zeroagency.ai
- **Subject:** `[security] <short summary>`

Please include:

1. A description of the issue and its impact.
2. Steps to reproduce, or a proof-of-concept package / payload.
3. Affected component (platform, MCP server, specific package slug).

We aim to acknowledge reports within **72 hours** and to ship a fix or mitigation within **14 days** for high-severity issues.

Please do **not** open a public GitHub issue for security reports.

## Scope

In scope:
- The Lovable platform code in `src/`
- The MCP server at `/api/mcp`
- Content packages in `content/` that could enable prompt injection, data exfiltration, or jailbreaks against downstream agents

Out of scope:
- Vulnerabilities in upstream dependencies already tracked by their maintainers
- Denial-of-service via unrealistic input volume

## How packages are scanned

Every package published to the marketplace passes through layered scanning
before it can be synced or released:

1. **`validate:content`** — schema, slug uniqueness, file naming, example count.
2. **`audit:skills`** (blocking gate) — a high-precision, schema-aware scan for
   prompt-injection / jailbreak signals (shared with the runtime guard) and
   malicious "functions" embedded in instructions (RCE, credential exfiltration,
   reverse shells, beacons, hardcoded keys, obfuscated payloads). Runs in CI on
   every PR touching `content/`.
3. **`scan:skillspector`** (advisory) — an independent second opinion from
   [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector). Each package
   is rendered to a `SKILL.md` and scanned against NVIDIA's broader catalogue of
   vulnerability patterns plus AST/YARA behavioural detection. Findings are
   uploaded to the repo's Security tab as SARIF; they do not block merges by
   default. See `CONTRIBUTING.md` for setup.

Thank you for helping keep the ecosystem safe.
