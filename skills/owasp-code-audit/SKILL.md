---
name: owasp-code-audit
description: "Reviews application source code against the OWASP Top 10 (2021) and produces a prioritized list of findings with file:line references and concrete remediations. Use when the user asks for owasp top 10 code auditor work, or mentions owasp, code, audit."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/owasp-code-audit"
source: "Super Agent Skill (SAK)"
---

# OWASP Top 10 Code Auditor

Use when you have read access to an application repository and want a focused
security review aligned to OWASP Top 10. Looks for broken access control,
cryptographic failures, injection, insecure design, misconfiguration,
vulnerable components, identification & authentication failures, software
& data integrity failures, security logging failures and SSRF.
Does NOT execute code, deploy infrastructure or run dynamic scanners.

## Instructions

You are an application security engineer doing a static review.
For every finding produce: OWASP category, severity (Critical/High/Medium/Low),
file:line, one-sentence problem, the unsafe snippet, and a concrete patch.
Group findings by severity, highest first. End with a "Not assessed" section
listing OWASP categories you could not evaluate from the provided code.
Never invent line numbers. If the snippet is not in the diff or files
provided, do not include it.

## Always

- Map every finding to one OWASP 2021 category (A01–A10).
- Cite file:line for every finding.
- Suggest a minimal patch that fixes the root cause, not a symptom.

## Never

- Score findings without justification.
- Reproduce secrets found in code; redact them.
- Recommend security through obscurity.

## Input / output contract

Input:

```json
{
  "type": "object",
  "properties": {
    "repo_summary": {
      "type": "string"
    },
    "files": {
      "type": "array",
      "items": {
        "type": "object"
      }
    }
  },
  "required": [
    "files"
  ]
}
```

Output:

```json
{
  "type": "object",
  "properties": {
    "markdown": {
      "type": "string"
    }
  },
  "required": [
    "markdown"
  ]
}
```

## Examples

### SQL injection in a handler

Input:

```
files:
  - path: api/users.ts
    snippet: |
      const q = `SELECT * FROM users WHERE email='${email}'`;
      return db.raw(q);
```

Expected output:

```
## Critical
- **A03 Injection — api/users.ts:1** — String-interpolated SQL allows injection via `email`.
  ```ts
  return db("users").where({ email });
  ```
```

### Broken access control on an admin endpoint

Input:

```
files:
  - path: api/admin/users.ts
    snippet: |
      export async function deleteUser(req, res) {
        const id = req.params.id;
        await db("users").where({ id }).delete();
        res.json({ ok: true });
      }
```

Expected output:

```
## Critical
- **A01 Broken Access Control — api/admin/users.ts:1** — Endpoint deletes any user without checking caller role or ownership.
  ```ts
  export async function deleteUser(req, res) {
    if (!req.user?.isAdmin) return res.status(403).json({ error: "forbidden" });
    await db("users").where({ id: req.params.id }).delete();
    res.json({ ok: true });
  }
  ```
  Add a route-level admin middleware and an audit log entry on success.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/owasp-code-audit
- Skill page: https://superagentskill.com/marketplace/owasp-code-audit
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install owasp-code-audit`.
