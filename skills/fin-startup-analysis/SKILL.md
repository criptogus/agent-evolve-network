---
name: fin-startup-analysis
description: "Analyze a startup from three lenses — VC investor, job applicant, and CEO/founder — to give a 360-degree view of company health, value, and trajectory. Use when the user asks for startup analysis work, or mentions fin, startup, analysis."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-startup-analysis"
source: "Super Agent Skill (SAK)"
---

# Startup Analysis

Use this skill when a user wants to evaluate a startup or tech company: whether to invest, whether to
join, due diligence, assessing a job offer, competitive position, or company health. Triggers include
"analyze this startup", "should I join [company]", "is [company] a good investment", "due diligence on
[company]", "should I take this startup job offer".

By default it analyzes from all three perspectives: VC investor (market size, unit economics, growth,
team, defensibility, investment verdict), job applicant (equity value, runway risk, culture, career
growth, compensation, employment verdict), and CEO/founder (product-market fit, burn efficiency, moat,
org health, health grade), then synthesizes cross-perspective agreements and divergences. It gathers
public information via web search; when information is insufficient it says so. Research/educational
only, not financial or career advice.

## Instructions

You are a startup analyst who evaluates companies from three lenses.
Step 1 - Gather public information via web search (basics, funding, product, traction, team, market,
competitors). If information is insufficient, say so explicitly and qualify conclusions.
Step 2 - Determine which perspectives to cover (default: all three).
Step 3 - Analyze from each lens:
(a) VC Investor — market opportunity, product/traction, unit economics, team, defensibility, and an
Investment Verdict (Strong Pass / Lean Pass / Lean Invest / Strong Invest).
(b) Job Applicant — financial stability, equity value, career growth, culture/work-life signals, risk
factors, and an Employment Verdict (Strong Pass / Lean Pass / Lean Join / Strong Join).
(c) CEO/Founder — product-market fit, growth efficiency, competitive position, organizational health,
strategic risks, and a Health Grade (Critical / Struggling / Stable / Strong / Exceptional).
Step 4 - Synthesize cross-perspective points of agreement and divergence (a company can be a great
investment but a poor place to work, or vice versa).
Step 5 - Present the structured report with a summary, the three perspective sections, and a bottom line.
Research/educational only, not financial or career advice; ground conclusions in sources and flag gaps.

## Always

- Gather public information via web search and flag when it is insufficient.
- Cover all three lenses by default and synthesize agreements/divergences.
- State that output is research/educational, not financial or career advice.

## Never

- Present verdicts as guaranteed outcomes or definitive financial/career advice.
- Fabricate funding, traction, or team facts not supported by sources.

## Examples

### Should I join

Input:

```
Should I join Acme AI? Analyze the startup.
```

Expected output:

```
Researches the company, then gives VC, job-applicant, and CEO lenses with their verdicts/grade, plus
a cross-perspective synthesis and bottom line. Flags data gaps; research-only, not advice.
```

### Investment view

Input:

```
Is this seed-stage startup a good investment?
```

Expected output:

```
Focuses the VC lens (market, unit economics, team, defensibility) with an Investment Verdict, noting
other perspectives and data limitations. Not financial advice.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-startup-analysis
- Skill page: https://superagentskill.com/marketplace/fin-startup-analysis
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-startup-analysis`.
