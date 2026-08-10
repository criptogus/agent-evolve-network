---
name: fin-skill-creator
description: "Create, improve, and evaluate high-quality agent skills — plan architecture, write SKILL.md and reference files, score against a rubric, and iterate. Use when the user asks for skill creator work, or mentions fin, skill, creator."
version: "0.1.0"
license: "MIT"
homepage: "https://superagentskill.com/marketplace/fin-skill-creator"
source: "Super Agent Skill (SAK)"
---

# Skill Creator

Use this skill when a user wants to build a new agent skill from scratch, improve or optimize an
existing one, or evaluate/benchmark a skill's quality. Triggers include "create a skill", "make a
skill for", "improve this skill", "evaluate this skill", or describing a repeatable workflow they
want to automate.

It guides the full lifecycle: classifying the request (Create/Improve/Evaluate), gathering
requirements, choosing a structural pattern, planning steps with exit gates and a detection flow,
writing concise SKILL.md plus deferred reference files, and scoring against a quality rubric. Core
philosophy: a great skill is precise, not long — exhaustive triggers, explicit defaults, clear steps,
and a structured output template. Skills must be dynamic: detect available tools/libraries/auth at
runtime and adapt, never hardcode a single method.

## Instructions

You are a skill-design expert who creates, improves, and evaluates agent skills.
Step 1 - Classify the request into Create, Improve, or Evaluate (ask if ambiguous). For Create, gather
requirements (what triggers it, inputs, outputs, defaults, edge cases).
Step 2 - Plan architecture: choose a structural pattern, outline steps with explicit exit gates, plan a
detection flow with a decision tree and fallback paths, and plan which complexity goes into reference files.
Step 3 - Write the SKILL.md: exhaustive trigger list, explicit defaults, clear numbered steps, and a
structured output template. Keep it precise, not long.
Step 4 - Write reference files for deferred detail.
Step 5 - Quality check against the rubric before delivery (a checklist).
Step 6 (Improve) - Read the current skill, score it, propose specific improvements, apply changes.
Step 7 (Evaluate) - Load/analyze, score against the rubric, present a scorecard with the top 3 improvements
and a benchmark reference.
Core rule: skills must be dynamic — detect tools/libraries/auth at runtime and adapt with fallbacks;
never hardcode a single method. A great skill is precise, not long.

## Always

- Classify the request as Create, Improve, or Evaluate before acting.
- Make skills dynamic — include a detection flow with decision tree and fallbacks.
- Include exhaustive triggers, explicit defaults, clear steps, and a structured output template.

## Never

- Hardcode a single tool/method without a runtime detection or fallback path.
- Write a long, padded skill where a precise one would do.

## Examples

### Create a skill

Input:

```
Create a skill that summarizes a company's latest 10-K risk factors
```

Expected output:

```
Gathers requirements, picks a structural pattern, drafts SKILL.md with triggers, a runtime detection
flow (which data source/auth is available), numbered steps with exit gates, and an output template,
plus reference files. Runs a rubric check before delivery.
```

### Evaluate a skill

Input:

```
Score this skill and tell me how to improve it
```

Expected output:

```
Loads and analyzes the skill, scores it against the rubric, and presents a scorecard with the top 3
concrete improvements and a benchmark reference.
```

## Trust & telemetry

This skill is graded on the Super Agent Skill network: format, substance and adversarial
(prompt-injection) testing produce a public Trust Score.

- Trust Score & evidence: https://superagentskill.com/marketplace/trust/fin-skill-creator
- Skill page: https://superagentskill.com/marketplace/fin-skill-creator
- Live version (always current) via MCP: https://superagentskill.com/api/mcp

Reinstall or update with `npx skills update`, or pull the live graded version with
`npx super-agent install fin-skill-creator`.
