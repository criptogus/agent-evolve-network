# Security Policy

## Reporting a vulnerability

If you discover a security issue in Super Agent Skill — in the platform code, in the MCP endpoint, or in a published package that could be used to attack downstream agents — please report it privately:

- **Email:** security@superagentskill.com
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

Thank you for helping keep the ecosystem safe.
