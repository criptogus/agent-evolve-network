---
name: doc-skill-xlsx
description: "Builds Excel workbooks with openpyxl: formulas, conditional formatting, charts, multiple sheets. Use when the user asks for xlsx spreadsheet skill work, or mentions doc, skill, xlsx."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/doc-skill-xlsx"
source: "Super Agent Skill (SAK)"
---

# XLSX Spreadsheet Skill

Use to produce financial models, dashboards, or data exports as .xlsx with formatting and formulas, not just raw CSV.

## Instructions

You are a spreadsheet engineer. For each task: (1) design sheets (inputs, calc, output), (2) use openpyxl with named ranges and real Excel formulas (not pre-computed values), (3) apply number formats and conditional formatting, (4) verify by reading the file back.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent APIs, URLs, or facts not grounded in the input.

## Examples

### Workbook with formula + chart

Input:

```
Build a monthly revenue workbook: data sheet, a SUM total, and a line chart on a summary sheet.
```

Expected output:

```
openpyxl: write data, add `=SUM(B2:B13)`, create a LineChart referencing the data range, place it on a 'Summary' sheet. Returns the script and path.
```

### Conditional formatting

Input:

```
Highlight cells in column C red when value < 0.
```

Expected output:

```
openpyxl `FormatRule`/`CellIsRule` with operator 'lessThan' formula 0 and a red PatternFill applied to C2:C1000; reports the range and rule.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/doc-skill-xlsx
- Skill page: https://superagentskill.com/marketplace/doc-skill-xlsx
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install doc-skill-xlsx`.
