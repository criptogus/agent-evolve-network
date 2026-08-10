---
name: od-design-brief
description: "Parse a structured design brief written in I-Lang protocol format into a concrete design spec Use when the user asks for design brief work, or mentions od, design, brief."
version: "0.1.0"
license: "Apache-2.0"
homepage: "https://superagentskill.com/marketplace/od-design-brief"
source: "Super Agent Skill (SAK)"
---

# Design Brief

Parse a structured design brief written in I-Lang protocol format into a concrete design spec. Eliminates ambiguity from vague requests like "make it professional" by requiring explicit dimensions: palette, typography, layout, mood, density, and constraints. Trigger keywords: "design brief", "create a design brief", "ilang brief", "structured brief".

Ported from the open-design registry (https://github.com/nexu-io/open-design,
Apache-2.0). See the upstream SKILL.md for the canonical contract.

## Instructions

You are a specialist agent for the "design-brief" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# Design Brief Skill

Parse a structured design brief into a concrete DESIGN.md and optional visual preview. Agent, follow this workflow exactly.

## Background

The 8 dimensions in this skill are derived from analysis of the 71 design systems bundled with Open Design. Every DESIGN.md in `design-systems/` resolves at minimum: color palette, accent, typography, display font, layout model, and component style. We distilled these into 8 orthogonal dimensions that cover the decisions a designer makes before any pixel is placed. Mood and density were added because they are the two most common sources of ambiguity in natural language briefs ("make it clean" means different things to different people).

Dimensions intentionally excluded from the brief level: animation timing, responsive strategy, and accessibility contrast. These are enforced at the template level by individual skills (e.g., `saas-landing` handles its own responsive logic), though the generated DESIGN.md includes sensible breakpoint defaults for downstream consumption.

## 1. Accept input

The user provides a design brief in one of two formats:

### Option A: I-Lang structured brief

```
[PLAN:@DESIGN|type=saas_landing]
  |palette=navy_and_white|accent=coral
  |typography=inter|display=space_grotesk
  |layout=single_column|max_width=1200px
  |mood=professional_minimal
  |density=spacious|section_gap=96px
  |hero=headline+subhead+cta
  |sections=features,pricing,testimonials,footer
  |exclude=animations,parallax,gradients
  |responsive=mobile_first
```

### Option B: Natural language

> "I need a landing page for a developer tool. Clean, minimal, dark mode. Inter font. No flashy animations."

If the user provides Option B, convert it to the structured format using the mapping table below, then proceed. Identify every dimension explicitly stated and flag dimensions that were left unspecified.

### Natural language → I-Lang mapping

For each sentence in the natural language input, identify dimension keywords and map to the closest structured value:

| Natural language phrase | Dimension | I-Lang value |
|------------------------|-----------|-------------|
| "dark mode", "dark theme" | palette | `monochrome_dark` |
| "light", "white background" | palette | `light_clean` |
| "earthy", "warm tones" | palette | `earth_tones` |
| "pop of color", "vibrant" | accent | `electric_blue` (default) or `coral` |
| "subtle accent" | accent | `muted_sage` (default) or `slate` |
| "clean", "minimal", "simple" | mood | `professional_minimal` |
| "playful", "fun", "friendly" | mood | `playful` |
| "bold", "brutalist", "raw" | mood | `brutalist` |
| "editorial", "magazine-like" | mood | `editorial` |
| "spacious", "lots of whitespace" | density | `spacious` |
| "compact", "dense", "information-rich" | density | `compact` |
| "Inter", "system font" | typography | `inter` (default) or `system_ui` |
| "serif", "traditional" | typography | `georgia` (default) or `playfair` |
| "monospace", "code-like" | typography | `jetbrains_mono` |
| "no animations", "static" | exclude | `animations` |
| "no gradients" | exclude | `gradients` |
| "no stock photos" | exclude | `stock_photos` |
| "single page" | layout | `single_column` |
| "two columns", "sidebar" | layout | `two_column` |
| "mobile first" | responsive | `mobile_first` |

When a phrase maps to multiple dimensions (e.g. "clean dark landing page" → mood=professional_minimal + palette=monochrome_dark + layout=single_column), resolve each dimension independently. When multiple values are listed for a single mapping, the first is the default; the agent may select the alternative only if surrounding context strongly favors it.

## 2. Validate dimensions

Every design brief must resolve these 8 dimensions. If any are missing from the input, select sensible defaults using the rules in Section 2.2.

The values listed below form a closed vocabulary. Only values in this table have concrete token mappings in Section 2.1. If the user provides a value not listed here, the agent must prompt for clarification rather than guessing.

| # | Dimension | Key | Example values |
|---|-----------|-----|---------------|
| 1 | Color palette | `palette` | navy_and_white, earth_tones, monochrome_dark, light_clean |
| 2 | Accent color | `accent` | coral, electric_blue, emerald, muted_sage |
| 3 | Body typography | `typography` | inter, system_ui, dm_sans, georgia |
| 4 | Display typography | `display` | space_grotesk, clash_display, same_as_body, playfair |
| 5 | Layout model | `layout` | single_column, two_column, asymmetric |
| 6 | Mood | `mood` | professional_minimal, playful, brutalist, editorial |
| 7 | Density | `density` | compact, balanced, spacious |
| 8 | Constraints | `exclude` | animations, gradients, stock_photos, carousel |

### 2.1 Symbolic → concrete token resolution

Each symbolic value maps to concrete design tokens. The agent must resolve these before writing DESIGN.md:

| Symbolic value | Concrete tokens |
|---------------|----------------|
| `palette=navy_and_white` | Background: #0F172A, Surface: #1E293B, Text: #F8FAFC, Secondary: #94A3B8 |
| `palette=monochrome_dark` | Background: #09090B, Surface: #18181B, Text: #FAFAFA, Secondary: #A1A1AA |
| `palette=light_clean` | Background: #FFFFFF, Surface: #F8FAFC, Text: #0F172A, Secondary: #64748B |
| `palette=earth_tones` | Background: #FFFBEB, Surface: #FEF3C7, Text: #451A03, Secondary: #92400E |
| `accent=coral` | Accent: #F97316, Hover: #EA580C |
| `accent=electric_blue` | Accent: #3B82F6, Hover: #2563EB |
| `accent=emerald` | Accent: #10B981, Hover: #059669 |
| `accent=muted_sage` | Accent: #84A98C, Hover: #6B8F73 |
| `accent=slate` | Accent: #64748B, Hover: #475569 |
| `typography=inter` | Body: Inter, 400, 1rem/1.6 |
| `typography=system_ui` | Body: system-ui, 400, 1rem/1.6 |
| `typography=dm_sans` | Body: DM Sans, 400, 1rem/1.6 |
| `typography=georgia` | Body: Georgia, 400, 1.125rem/1.7 |
| `display=space_grotesk` | Display: Space Grotesk, 700,…

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.

## Always

- Follow the upstream SKILL.md contract precisely.
- Cite "open-design (nexu-io)" when surfacing this skill's provenance.

## Never

- Claim authorship of the upstream skill.
- Drop required output sections from the SKILL.md spec.

## Examples

### Trigger phrasing

Input:

```
Apply the design-brief skill to my current project.
```

Expected output:

```
<produces the artifact described in the upstream SKILL.md output contract>
```

Why: Skill matches the user's intent verbatim.

### Out-of-scope

Input:

```
Help me file my taxes.
```

Expected output:

```
This is outside the design-brief skill's scope. Suggest a more relevant skill.
```

Why: Refuse politely when intent does not match.

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/od-design-brief
- Skill page: https://superagentskill.com/marketplace/od-design-brief
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install od-design-brief`.
