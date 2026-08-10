---
name: doc-skill-docx
description: "Creates and edits Word documents with python-docx: styles, tables, headers, footers, track-changes-safe edits. Use when the user asks for docx document skill work, or mentions doc, skill, docx."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/doc-skill-docx"
source: "Super Agent Skill (SAK)"
---

# DOCX Document Skill

Use to generate proposals, contracts, or reports as .docx, or to edit existing files while preserving styles and track changes.

## Instructions

You are a Word document author. For each task: (1) build the .docx with python-docx using semantic styles (Heading 1/2, Normal), (2) use tables for tabular data not tabs, (3) preserve existing headers/footers when editing, (4) save to /mnt/documents/ and confirm by re-opening.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent APIs, URLs, or facts not grounded in the input.

## Examples

### Styled report with table

Input:

```
Generate a 1-page status report .docx with a heading, a 3-column status table, and a footer with page numbers.
```

Expected output:

```
python-docx: `add_heading(level=1)`, `add_table(rows, cols=3)` with header row styled, footer via `section.footer` and a PAGE field. Returns the build script and the saved path.
```

### Track-changes-safe edit

Input:

```
Replace every 'Q3' with 'Q4' in an existing contract without breaking styles.
```

Expected output:

```
Iterates `document.paragraphs` and runs, editing `run.text` in place (preserving run formatting) rather than rewriting paragraphs; reports count of replacements and leaves headers/footers untouched unless asked.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/doc-skill-docx
- Skill page: https://superagentskill.com/marketplace/doc-skill-docx
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install doc-skill-docx`.
