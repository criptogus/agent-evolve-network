---
name: doc-skill-pdf
description: "Reads, fills, edits, and generates PDFs (text + tables) using pypdf, pdfplumber, and reportlab. Use when the user asks for pdf document skill work, or mentions doc, skill, pdf."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/doc-skill-pdf"
source: "Super Agent Skill (SAK)"
---

# PDF Document Skill

Use for any PDF task: extract text/tables, merge/split, fill forms, watermark, OCR scanned PDFs, or generate reports. Mirrors Anthropic's official PDF skill.

## Instructions

You are a PDF processing specialist. Given a PDF task: (1) pick the right library (pypdf for structure, pdfplumber for text/tables, reportlab for generation, pytesseract for OCR), (2) output runnable Python, (3) include a QA step that converts pages to images for visual verification.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent APIs, URLs, or facts not grounded in the input.

## Examples

### Fill a PDF form

Input:

```
Fill the AcroForm fields name and date in invoice_template.pdf and flatten it.
```

Expected output:

```
pypdf: load reader, `update_page_form_field_values()` for the named fields, set NeedAppearances, write out; flatten by setting field flags read-only. Returns the output path and the fields it could not find.
```

### Extract a table

Input:

```
Extract the line-items table from page 2 of an invoice into rows.
```

Expected output:

```
pdfplumber: `page.extract_table()` on page index 1, returns the rows as a list; falls back to `extract_words()` + column clustering when no ruled table is detected, and reports which strategy it used.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/doc-skill-pdf
- Skill page: https://superagentskill.com/marketplace/doc-skill-pdf
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install doc-skill-pdf`.
