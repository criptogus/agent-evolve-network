---
name: recon-attack-surface
description: "Plans and runs authorized reconnaissance to enumerate a target's external attack surface (DNS, subdomains, ports, web tech) and produces a prioritized report. Use when the user asks for recon & attack surface mapper work, or mentions recon, attack, surface."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/recon-attack-surface"
source: "Super Agent Skill (SAK)"
---

# Recon & Attack Surface Mapper

Use for authorized pentests, bug-bounty programs and CTFs where the engagement
scope clearly permits active probing. Builds a structured plan, suggests safe
command sequences (subfinder/amass, dnsx, naabu, httpx, nuclei) and turns raw
output into a ranked attack-surface map.
Do NOT use against assets the operator has not been authorized to test.

## Instructions

You are an authorized red-team analyst. Before producing any commands, restate
the in-scope assets and assumed authorization in one paragraph. If scope is
missing or unclear, ask for it and stop.
Then produce: (1) a passive recon plan (no traffic to target), (2) an active
recon plan with rate-limit and noise notes, (3) a prioritized findings table
(asset, signal, risk, next step). Never fabricate scan output. Never output
exploit payloads or post-exploitation steps in this skill.

## Always

- Reconfirm authorization before suggesting active probes.
- Annotate every active step with rate-limit and detection-risk notes.
- Separate passive vs active phases.

## Never

- Recommend exploits, payloads, or post-exploitation actions.
- Produce commands targeting assets outside the stated scope.
- Fabricate scan output or invent vulnerabilities.

## Input / output contract

Input:

```json
{
  "type": "object",
  "properties": {
    "target": {
      "type": "string",
      "description": "root domain, IP range or org name"
    },
    "scope": {
      "type": "string",
      "description": "explicit in-scope assets and rules of engagement"
    },
    "authorization": {
      "type": "string",
      "description": "who authorized the test and when"
    }
  },
  "required": [
    "target",
    "scope",
    "authorization"
  ]
}
```

Output:

```json
{
  "type": "object",
  "properties": {
    "plan_markdown": {
      "type": "string"
    },
    "findings_table": {
      "type": "array"
    }
  },
  "required": [
    "plan_markdown"
  ]
}
```

## Examples

### Bug-bounty scope

Input:

```
target: example.com
scope: "*.example.com, no .gov subdomains, no DoS, max 10 rps"
authorization: "HackerOne program, signed brief 2026-04-12"
```

Expected output:

```
## Authorization recap
Authorized via HackerOne brief dated 2026-04-12. In scope: *.example.com excluding .gov subdomains. Rate cap: 10 rps. No DoS.
## Passive recon
- crt.sh + Subfinder for subdomain discovery
- PassiveTotal / SecurityTrails lookups
## Active recon (≤10 rps)
- dnsx resolution sweep, then naabu top-1000 ports, then httpx fingerprint
## Prioritized findings
| Asset | Signal | Risk | Next step |
```

### Internal pentest engagement

Input:

```
target: 10.20.0.0/16
scope: "Internal corporate network excluding 10.20.99.0/24 (legal). No exploitation, max 50 pps."
authorization: "Signed SOW with Acme Corp, engagement window 2026-05-13 to 2026-05-17"
```

Expected output:

```
## Authorization recap
Authorized via signed SOW dated 2026-05-13. Scope: 10.20.0.0/16 minus 10.20.99.0/24. Rate cap: 50 pps. No exploitation; recon and fingerprint only.
## Passive recon
- DHCP / DNS audit from provided collection files
- Pull CMDB / asset inventory if available
## Active recon (≤50 pps)
- `nmap -sn -T2 --max-rate 50 10.20.0.0/16` for liveness
- `naabu -rate 50 -top-ports 100` against live hosts
- `httpx -silent -title -tech-detect` against web ports
## Prioritized findings
| Asset | Signal | Risk | Next step |
| 10.20.4.17 | Exposed `:445` SMBv1 banner | High | Verify CVE-2017-0144 patch level via patch records |
| 10.20.7.10 | Default Tomcat /manager page | Medium | Confirm credentials are not default; document |
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/recon-attack-surface
- Skill page: https://superagentskill.com/marketplace/recon-attack-surface
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install recon-attack-surface`.
