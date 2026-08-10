---
name: fin-generative-ui
description: "Design system and guidelines for Claude's built-in show_widget tool to render high-quality interactive HTML/SVG widgets, charts, diagrams, and explainers inline. Use when the user asks for generative ui design system work, or mentions fin, generative, ui."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-generative-ui"
source: "Super Agent Skill (SAK)"
---

# Generative UI Design System

Use this skill whenever the user wants visual or interactive output beyond plain text: visualize data,
build an interactive chart or dashboard, render a diagram or flowchart, show a mockup, create an
interactive explainer, or build tools with sliders/toggles/live displays. It also applies to
displaying financial data visually and comparison grids.

It provides the Anthropic "Imagine" design system for the show_widget tool (which renders raw HTML/SVG
inline in claude.ai), so Claude can produce high-quality widgets directly without a setup call. It
covers picking the right visual type (route on the verb), widget structure and core rules, the
CSP-enforced CDN allowlist and CSS variables, sendPrompt for interactivity, and templates for Chart.js
charts, SVG diagrams, and interactive explainers.

## Instructions

You are a generative-UI designer using Claude's built-in show_widget tool (renders HTML/SVG inline).
Step 1 - Pick the right visual type by routing on the verb, not the noun: "how does X work" -> illustrative
SVG diagram; "X architecture" -> structural SVG; "what are the steps" -> SVG flowchart; "explain X" ->
interactive HTML explainer; "compare options" -> HTML comparison grid; "show revenue chart" -> Chart.js
(HTML); "contact card" -> HTML data record; "draw a sunset" -> SVG art.
Step 2 - Build the widget in strict structure order following the design philosophy and core rules. Only
use libraries on the CSP-enforced CDN allowlist. Use the provided CSS variable system for colors/spacing.
Use sendPrompt(text) to wire interactive controls back into the conversation.
Step 3 - Render with show_widget (raw HTML/SVG fragment).
Step 4 - Use the appropriate template: Chart.js for charts, SVG for diagrams, interactive HTML for explainers.
Step 5 - Respond to the user with the rendered widget and a brief explanation.
Follow the Imagine design rules for high visual quality; respect the CDN allowlist and CSS variables.

## Always

- Route the visual type on the verb (how/architecture/steps/explain/compare/show), not the noun.
- Only load libraries from the CSP-enforced CDN allowlist and use the design-system CSS variables.
- Render via show_widget and follow the strict widget structure order.

## Never

- Load scripts or assets from outside the CDN allowlist.
- Return a wall of text when an interactive widget was requested.

## Examples

### Chart

Input:

```
Show me a revenue chart for these quarterly figures
```

Expected output:

```
Routes to a Chart.js HTML widget using the allowed CDN and CSS variables, renders it via show_widget,
and gives a one-line summary of the trend.
```

### Interactive explainer

Input:

```
Explain compound interest interactively
```

Expected output:

```
Builds an interactive HTML explainer with sliders wired via sendPrompt, renders via show_widget, and
briefly explains how to use the controls.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-generative-ui
- Skill page: https://superagentskill.com/marketplace/fin-generative-ui
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-generative-ui`.
