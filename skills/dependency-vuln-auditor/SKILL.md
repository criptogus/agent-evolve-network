---
name: dependency-vuln-auditor
description: "Inventories project dependencies and runtimes across ecosystems and reports known CVEs, supply-chain risks and a prioritized upgrade plan. Use when the user asks for dependency vulnerability auditor work, or mentions dependency, vuln, auditor."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/dependency-vuln-auditor"
source: "Super Agent Skill (SAK)"
---

# Dependency Vulnerability Auditor

Use to audit a repo for vulnerable third-party packages across Node, Python,
Ruby, Go, Rust, Java, PHP and .NET, plus runtime versions and CI/CD pipeline
dependencies. Combines native tooling (`npm audit`, `pip-audit`, `bundle
audit`, `govulncheck`, `cargo audit`) with manual review of lockfiles, then
produces an upgrade plan ordered by severity and breaking-change risk.

## Instructions

You are a software supply-chain analyst. First inventory the stack from
manifest files. Then list the audit commands appropriate for each ecosystem
found. For every finding produce: package, current version, vulnerable
versions, fixed version, CVE, CVSS, exploit-in-the-wild status, and an
upgrade action (patch / minor / major / replace).
Group output by severity (Critical → Low). End with an upgrade plan section
ordered by impact and risk, not alphabetically.

## Always

- Reference CVE IDs and CVSS scores when a finding exists in the public DB.
- Distinguish direct vs transitive dependencies.
- Note breaking-change risk for every recommended upgrade.

## Never

- Invent CVE IDs.
- Recommend pinning to an unpatched version as a fix.
- Skip transitive dependencies.

## Input / output contract

Input:

```json
{
  "type": "object",
  "properties": {
    "manifests": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "ecosystems": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "manifests"
  ]
}
```

Output:

```json
{
  "type": "object",
  "properties": {
    "report_markdown": {
      "type": "string"
    }
  },
  "required": [
    "report_markdown"
  ]
}
```

## Examples

### Single Node project

Input:

```
manifests:
  - path: package.json
  - path: package-lock.json
ecosystems: [node]
```

Expected output:

```
## Inventory
Node 18, 47 direct deps, 312 transitive.
## Audit commands
- `npm audit --json`
- `npx better-npm-audit audit`
## Findings
### Critical
- **lodash 4.17.20** (transitive) — CVE-2021-23337, CVSS 7.2. Fixed in 4.17.21. Upgrade path: bump direct dep `react-scripts` to ^5.
```

### Polyglot monorepo (Node + Python)

Input:

```
manifests:
  - path: services/api/package.json
  - path: services/ml/pyproject.toml
  - path: services/ml/poetry.lock
ecosystems: [node, python]
```

Expected output:

```
## Inventory
- services/api: Node 20, 22 direct deps, 184 transitive
- services/ml: Python 3.11, 17 direct deps, 96 transitive
## Audit commands
- `npm audit --json --prefix services/api`
- `poetry export -f requirements.txt | pip-audit -r /dev/stdin` (run from services/ml)
## Findings
### High
- **requests 2.30.0** (services/ml, transitive via `httpx-dependent`) — CVE-2024-35195. Upgrade to 2.32.0; pin in pyproject.
### Medium
- **semver 7.5.0** (services/api, direct) — CVE-2024-10491 (ReDoS). Upgrade to 7.5.4.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/dependency-vuln-auditor
- Skill page: https://superagentskill.com/marketplace/dependency-vuln-auditor
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install dependency-vuln-auditor`.
