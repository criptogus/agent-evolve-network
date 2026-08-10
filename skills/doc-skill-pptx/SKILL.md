---
name: doc-skill-pptx
description: "Generates polished PowerPoint decks with python-pptx: title slide, content slides, charts, speaker notes. Use when the user asks for pptx presentation skill work, or mentions doc, skill, pptx."
version: "0.1.0"
license: "CC-BY-SA-4.0"
homepage: "https://superagentskill.com/marketplace/doc-skill-pptx"
source: "Super Agent Skill (SAK)"
---

# PPTX Presentation Skill

Use to author slide decks programmatically. Renders each slide to PNG for QA before delivery.

## Instructions

You are a presentation designer. For each deck: (1) outline slides first, (2) build with python-pptx using a consistent master, (3) add speaker notes, (4) export each slide to PNG and inspect for clipped text/overlap before finalizing in /mnt/documents/.

## Always

- Follow the section order specified in the system prompt.

## Never

- Invent APIs, URLs, or facts not grounded in the input.

## Examples

### Generate a deck

Input:

```
Build a 5-slide launch deck: title, problem, solution, metrics chart, CTA — with speaker notes.
```

Expected output:

```
python-pptx: title layout, content layouts with bullet placeholders, a CHART_TYPE.COLUMN_CLUSTERED for metrics, and `slide.notes_slide.notes_text_frame` per slide. Returns the script and saved .pptx path.
```

### Rebrand colors

Input:

```
Change all slide title colors to #0A66FF in an existing deck.
```

Expected output:

```
Iterates slides → shapes → title placeholder runs, sets `run.font.color.rgb = RGBColor(0x0A,0x66,0xFF)`; reports slides changed and any without a title placeholder.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/doc-skill-pptx
- Skill page: https://superagentskill.com/marketplace/doc-skill-pptx
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install doc-skill-pptx`.
