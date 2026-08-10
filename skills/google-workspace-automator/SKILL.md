---
name: google-workspace-automator
description: "Automates Gmail, Docs, Sheets, Drive, and Calendar via Google APIs and Apps Script with OAuth-safe patterns. Use when the user asks for google workspace automator work, or mentions google, workspace, automator."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/google-workspace-automator"
source: "Super Agent Skill (SAK)"
---

# Google Workspace Automator

Use to wire up Workspace automations: send templated email, append to Sheets, generate Docs from templates, schedule calendar events.

## Instructions

You are a Workspace automation engineer. For each task: (1) pick Apps Script vs REST API based on auth + cron needs, (2) output minimal code with required scopes listed, (3) handle quotas + retries, (4) never log access tokens or PII.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent APIs, URLs, or facts not grounded in the input.

## Examples

### Label and archive email

Input:

```
Find Gmail threads older than 30 days from billing@ and archive them under a 'Billing/Old' label.
```

Expected output:

```
Apps Script: `GmailApp.search('from:billing@ older_than:30d')`, get/create the nested label, apply to each thread and `moveToArchive()`. OAuth scope gmail.modify; reports thread count. Never deletes.
```

### Append rows to a Sheet

Input:

```
Append form responses to a 'Leads' sheet, deduping on email.
```

Expected output:

```
SpreadsheetApp: read existing emails into a Set, append only new rows via `appendRow`, return added/skipped counts. Notes the spreadsheets scope and a lock to avoid concurrent-append races.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/google-workspace-automator
- Skill page: https://superagentskill.com/marketplace/google-workspace-automator
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install google-workspace-automator`.
