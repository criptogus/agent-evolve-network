-- Import skills ported from nexu-io/open-design (Apache-2.0)
do $$
declare
  v_pkg_id uuid;
begin

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-ad-creative', 'Ad Creative', 'skill', '@open-design', true,
     'Generate and iterate ad creative including headlines, descriptions, and primary text', 'Generate and iterate ad creative including headlines, descriptions, and primary text. Useful for paid social and search ad iteration.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "ad-creative" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# ad-creative

> Curated from Corey Haines.

## What it does

Generate and iterate ad creative including headlines, descriptions, and primary text. Useful for paid social and search ad iteration.

## Source

- Upstream: https://github.com/coreyhaines31/skills
- Category: `marketing-creative`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/coreyhaines31/skills
```

Then ask the agent to invoke this skill by name (`ad-creative`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-artifacts-builder', 'Artifacts Builder', 'skill', '@open-design', true,
     'Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui).', 'Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui).',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "artifacts-builder" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# artifacts-builder

> Curated from ComposioHQ awesome-claude-skills.

## What it does

Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui).

## Source

- Upstream: https://github.com/ComposioHQ/awesome-claude-skills/tree/master/artifacts-builder
- Category: `web-artifacts`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/ComposioHQ/awesome-claude-skills/tree/master/artifacts-builder
```

Then ask the agent to invoke this skill by name (`artifacts-builder`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-brainstorming', 'Brainstorming', 'skill', '@open-design', true,
     'Transform rough ideas into fully-formed designs through structured questioning and alternative exploration', 'Transform rough ideas into fully-formed designs through structured questioning and alternative exploration. Useful early in concept work.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "brainstorming" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# brainstorming

> Curated from @obra.

## What it does

Transform rough ideas into fully-formed designs through structured questioning and alternative exploration. Useful early in concept work.

## Source

- Upstream: https://github.com/obra/superpowers
- Category: `creative-direction`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/obra/superpowers
```

Then ask the agent to invoke this skill by name (`brainstorming`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-brand-guidelines', 'Brand Guidelines', 'skill', '@open-design', true,
     'Apply Anthropic''s official brand colors and typography to artifacts for consistent visual identity and professional design standards', 'Apply Anthropic''s official brand colors and typography to artifacts for consistent visual identity and professional design standards. A reference for shaping your own.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "brand-guidelines" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# brand-guidelines

> Curated from Anthropic''s official skills repository.

## What it does

Apply Anthropic''s official brand colors and typography to artifacts for consistent visual identity and professional design standards. A reference for shaping your own.

## Source

- Upstream: https://github.com/anthropics/skills/tree/main/brand-guidelines
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/anthropics/skills/tree/main/brand-guidelines
```

Then ask the agent to invoke this skill by name (`brand-guidelines`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-canvas-design', 'Canvas Design', 'skill', '@open-design', true,
     'Create beautiful visual art in PNG and PDF documents using design philosophy and aesthetic principles for posters, illustrations, and static pieces.', 'Create beautiful visual art in PNG and PDF documents using design philosophy and aesthetic principles for posters, illustrations, and static pieces.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "canvas-design" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# canvas-design

> Curated from Anthropic''s official skills repository.

## What it does

Create beautiful visual art in PNG and PDF documents using design philosophy and aesthetic principles for posters, illustrations, and static pieces.

## Source

- Upstream: https://github.com/anthropics/skills/tree/main/canvas-design
- Category: `image-generation`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/anthropics/skills/tree/main/canvas-design
```

Then ask the agent to invoke this skill by name (`canvas-design`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-color-expert', 'Color Expert', 'skill', '@open-design', true,
     'Color science expert skill with 286K words of reference material covering OKLCH/OKLAB, palette generation, accessibility/contrast, color naming, pigment mixing, and historical color theory.', 'Color science expert skill with 286K words of reference material covering OKLCH/OKLAB, palette generation, accessibility/contrast, color naming, pigment mixing, and historical color theory.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "color-expert" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# color-expert

> Curated from @meodai.

## What it does

Color science expert skill with 286K words of reference material covering OKLCH/OKLAB, palette generation, accessibility/contrast, color naming, pigment mixing, and historical color theory.

## Source

- Upstream: https://github.com/meodai/skill.color-expert
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/meodai/skill.color-expert
```

Then ask the agent to invoke this skill by name (`color-expert`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-copywriting', 'Copywriting', 'skill', '@open-design', true,
     'Write and rewrite marketing copy for landing pages, homepages, and ads', 'Write and rewrite marketing copy for landing pages, homepages, and ads. Useful as a copy chief partner during launches.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "copywriting" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# copywriting

> Curated from Corey Haines.

## What it does

Write and rewrite marketing copy for landing pages, homepages, and ads. Useful as a copy chief partner during launches.

## Source

- Upstream: https://github.com/coreyhaines31/skills
- Category: `marketing-creative`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/coreyhaines31/skills
```

Then ask the agent to invoke this skill by name (`copywriting`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-creative-director', 'Creative Director', 'skill', '@open-design', true,
     'AI creative director with recursive self-assessment: 20+ methodologies (SIT, TRI', 'AI creative director with recursive self-assessment: 20+ methodologies (SIT, TRI',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "creative-director" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# creative-director

> Curated from @smixs.

## What it does

AI creative director with recursive self-assessment: 20+ methodologies (SIT, TRIZ, Bisociation, SCAMPER, Synectics), 3-axis evaluation calibrated against Cannes/D&AD/HumanKind, 5-phase process from brief to presentation.

## Source

- Upstream: https://github.com/smixs/creative-director-skill
- Category: `creative-direction`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/smixs/creative-director-skill
```

Then ask the agent to invoke this skill by name (`creative-director`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-design-brief', 'Design Brief', 'skill', '@open-design', true,
     'Parse a structured design brief written in I-Lang protocol format into a concrete design spec', 'Parse a structured design brief written in I-Lang protocol format into a concrete design spec. Eliminates ambiguity from vague requests like "make it professional" by requiring explicit dimensions: palette, typography, layout, mood, density, and constraints. Trigger keywords: "design brief", "create a design brief", "ilang brief", "structured brief".',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "design-brief" skill, ported from the open-design project (nexu-io/open-design).

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

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-design-consultation', 'Design Consultation', 'skill', '@open-design', true,
     'Build a complete design system from scratch with creative risks and realistic product mockups', 'Build a complete design system from scratch with creative risks and realistic product mockups. Useful for kickoff workshops and brand-from-zero work.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "design-consultation" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# design-consultation

> Curated from Garry Tan (gstack).

## What it does

Build a complete design system from scratch with creative risks and realistic product mockups. Useful for kickoff workshops and brand-from-zero work.

## Source

- Upstream: https://github.com/garrytan/gstack
- Category: `creative-direction`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/garrytan/gstack
```

Then ask the agent to invoke this skill by name (`design-consultation`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-design-md', 'Design Md', 'skill', '@open-design', true,
     'Create and manage DESIGN.md files', 'Create and manage DESIGN.md files. Useful for capturing design direction, tokens, and visual rules in a single source of truth.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "design-md" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# design-md

> Curated from Google Labs (Stitch).

## What it does

Create and manage DESIGN.md files. Useful for capturing design direction, tokens, and visual rules in a single source of truth.

## Source

- Upstream: https://github.com/google-labs-code/skills
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/google-labs-code/skills
```

Then ask the agent to invoke this skill by name (`design-md`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-design-review', 'Design Review', 'skill', '@open-design', true,
     'Designer Who Codes: visual audit then fixes with atomic commits and before/after screenshots', 'Designer Who Codes: visual audit then fixes with atomic commits and before/after screenshots. Useful for tightening shipped UI before launch.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "design-review" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# design-review

> Curated from Garry Tan (gstack).

## What it does

Designer Who Codes: visual audit then fixes with atomic commits and before/after screenshots. Useful for tightening shipped UI before launch.

## Source

- Upstream: https://github.com/garrytan/gstack
- Category: `creative-direction`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/garrytan/gstack
```

Then ask the agent to invoke this skill by name (`design-review`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-domain-name-brainstormer', 'Domain Name Brainstormer', 'skill', '@open-design', true,
     'Generate creative domain name ideas and check availability across multiple TLDs including .com, .io, .dev, and .ai.', 'Generate creative domain name ideas and check availability across multiple TLDs including .com, .io, .dev, and .ai.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "domain-name-brainstormer" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# domain-name-brainstormer

> Curated from ComposioHQ awesome-claude-skills.

## What it does

Generate creative domain name ideas and check availability across multiple TLDs including .com, .io, .dev, and .ai.

## Source

- Upstream: https://github.com/ComposioHQ/awesome-claude-skills/tree/master/domain-name-brainstormer
- Category: `marketing-creative`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/ComposioHQ/awesome-claude-skills/tree/master/domain-name-brainstormer
```

Then ask the agent to invoke this skill by name (`domain-name-brainstormer`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-enhance-prompt', 'Enhance Prompt', 'skill', '@open-design', true,
     'Improve prompts with design specs and UI/UX vocabulary', 'Improve prompts with design specs and UI/UX vocabulary. Useful for design-to-code workflows and clarifying requests for visual output.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "enhance-prompt" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# enhance-prompt

> Curated from Google Labs (Stitch).

## What it does

Improve prompts with design specs and UI/UX vocabulary. Useful for design-to-code workflows and clarifying requests for visual output.

## Source

- Upstream: https://github.com/google-labs-code/skills
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/google-labs-code/skills
```

Then ask the agent to invoke this skill by name (`enhance-prompt`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-faq-page', 'Faq Page', 'skill', '@open-design', true,
     'A Frequently Asked Questions (FAQ) page with collapsible accordion sections, search functionality, and category filtering', 'A Frequently Asked Questions (FAQ) page with collapsible accordion sections, search functionality, and category filtering. Use when the brief asks for "FAQ", "help center", "questions", or "support page".',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "faq-page" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# FAQ Page Skill

Produce a single FAQ page with collapsible accordion sections, search, and category filtering.

## Workflow

1. **Read the active DESIGN.md** (injected above). Use the component tokens for
   interactive elements (accordion headers, search input, category pills).
2. **Pick the domain** from the brief (e.g., SaaS product, e-commerce, service)
   and write 12–18 real FAQ entries across 3–4 categories.
   - **Edge cases**:
     - If the brief provides fewer than 8 FAQs, ask for more content or generate
       realistic questions based on the domain.
     - For 1–5 FAQs, skip categories and search; show a simple list.
     - For very long answers (>100 words), break into paragraphs or bullet points
       to maintain readability.
3. **Sections**, in order:
   - **Header** — page title ("Frequently Asked Questions" or "Help Center"),
     optional subtitle (1 sentence explaining what users can find here).
   - **Search bar** — prominent search input with placeholder text and icon.
     Functional JS to filter questions in real-time.
   - **Category filters** — 3–4 pill-style buttons to filter by category
     (e.g., "Billing", "Account", "Technical", "General"). "All" selected by default.
   - **FAQ accordion** — collapsible question/answer pairs:
     - Question as clickable header with expand/collapse icon (chevron or plus/minus).
     - Answer hidden by default, expands on click with smooth animation.
     - Each entry has `data-category` attribute for filtering.
   - **Footer CTA** — "Still have questions?" section with contact link or
     support email.
4. **Write** a single HTML document:
   - `<!doctype html>` through `</html>`, CSS and JS inline.
   - Accordion uses semantic HTML (`<details>` and `<summary>` for progressive
     enhancement, or custom JS with proper ARIA attributes).
   - Search filters questions by matching text in question or answer.
   - Category filters show/hide questions based on `data-category`.
   - Smooth transitions for expand/collapse (max-height or grid-template-rows).
   - `data-od-id` on header, search, categories, accordion container, footer.
5. **Self-check**:
   - Questions are specific and realistic (not generic placeholders).
   - Answers are concise (2–4 sentences) but complete.
   - Keyboard navigation works (Tab through questions, Enter to expand).
   - Search is case-insensitive and filters by matching text.
   - Only one accordion item expanded at a time (optional, depends on UX preference).
   - Mobile-friendly (accordion headers are tappable, search is usable).

## Output contract

Emit between `<artifact>` tags:

```
<artifact identifier="faq-page" type="text/html" title="FAQ Page">
<!doctype html>
<html>...</html>
</artifact>
```

One sentence before the artifact, nothing after.

## Example questions by category

**Billing**
- How do I update my payment method?
- What payment methods do you accept?
- Can I get a refund?
- How do I cancel my subscription?

**Account**
- How do I reset my password?
- Can I change my email address?
- How do I delete my account?
- What happens to my data after I cancel?

**Technical**
- What browsers do you support?
- Is there a mobile app?
- How do I export my data?
- What are your API rate limits?

**General**
- What is [Product Name]?
- How do I get started?
- Do you offer customer support?
- Where can I find your terms of service?

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-frontend-design', 'Frontend Design', 'skill', '@open-design', true,
     'Frontend design and UI/UX development tools for shipping production-ready interfaces with strong typographic and layout discipline.', 'Frontend design and UI/UX development tools for shipping production-ready interfaces with strong typographic and layout discipline.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "frontend-design" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# frontend-design

> Curated from Anthropic''s official skills repository.

## What it does

Frontend design and UI/UX development tools for shipping production-ready interfaces with strong typographic and layout discipline.

## Source

- Upstream: https://github.com/anthropics/skills/tree/main/frontend-design
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/anthropics/skills/tree/main/frontend-design
```

Then ask the agent to invoke this skill by name (`frontend-design`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-gsap-core', 'Gsap Core', 'skill', '@open-design', true,
     'Core GSAP API with gsap.to(), from(), fromTo(), easing, duration, stagger, and defaults', 'Core GSAP API with gsap.to(), from(), fromTo(), easing, duration, stagger, and defaults. Production-grade web animation primitives.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "gsap-core" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# gsap-core

> Curated from GreenSock (GSAP).

## What it does

Core GSAP API with gsap.to(), from(), fromTo(), easing, duration, stagger, and defaults. Production-grade web animation primitives.

## Source

- Upstream: https://github.com/greensock/skills
- Category: `animation-motion`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/greensock/skills
```

Then ask the agent to invoke this skill by name (`gsap-core`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-gsap-scrolltrigger', 'Gsap Scrolltrigger', 'skill', '@open-design', true,
     'GSAP ScrollTrigger for scroll-linked animations, pinning, scrub, and refresh handling', 'GSAP ScrollTrigger for scroll-linked animations, pinning, scrub, and refresh handling. Useful for editorial sites and product pages.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "gsap-scrolltrigger" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# gsap-scrolltrigger

> Curated from GreenSock (GSAP).

## What it does

GSAP ScrollTrigger for scroll-linked animations, pinning, scrub, and refresh handling. Useful for editorial sites and product pages.

## Source

- Upstream: https://github.com/greensock/skills
- Category: `animation-motion`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/greensock/skills
```

Then ask the agent to invoke this skill by name (`gsap-scrolltrigger`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-marketing-psychology', 'Marketing Psychology', 'skill', '@open-design', true,
     'Apply psychological principles and behavioral science to copy and design', 'Apply psychological principles and behavioral science to copy and design. Useful for tightening hooks, framing, and pricing presentation.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "marketing-psychology" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# marketing-psychology

> Curated from Corey Haines.

## What it does

Apply psychological principles and behavioral science to copy and design. Useful for tightening hooks, framing, and pricing presentation.

## Source

- Upstream: https://github.com/coreyhaines31/skills
- Category: `marketing-creative`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/coreyhaines31/skills
```

Then ask the agent to invoke this skill by name (`marketing-psychology`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-paywall-upgrade-cro', 'Paywall Upgrade Cro', 'skill', '@open-design', true,
     'Design and optimize upgrade screens, paywalls, and upsell modals', 'Design and optimize upgrade screens, paywalls, and upsell modals. Useful for SaaS conversion design and pricing-page experiments.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "paywall-upgrade-cro" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# paywall-upgrade-cro

> Curated from Corey Haines.

## What it does

Design and optimize upgrade screens, paywalls, and upsell modals. Useful for SaaS conversion design and pricing-page experiments.

## Source

- Upstream: https://github.com/coreyhaines31/skills
- Category: `marketing-creative`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/coreyhaines31/skills
```

Then ask the agent to invoke this skill by name (`paywall-upgrade-cro`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-pptx-generator', 'Pptx Generator', 'skill', '@open-design', true,
     'Create and edit PowerPoint presentations from scratch with PptxGenJS — MiniMax''s production-tested deck pipeline.', 'Create and edit PowerPoint presentations from scratch with PptxGenJS — MiniMax''s production-tested deck pipeline.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "pptx-generator" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# pptx-generator

> Curated from the MiniMax AI team.

## What it does

Create and edit PowerPoint presentations from scratch with PptxGenJS — MiniMax''s production-tested deck pipeline.

## Source

- Upstream: https://github.com/MiniMax-AI/skills
- Category: `slides`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/MiniMax-AI/skills
```

Then ask the agent to invoke this skill by name (`pptx-generator`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-shadcn-ui', 'Shadcn Ui', 'skill', '@open-design', true,
     'Build UI components with shadcn/ui', 'Build UI components with shadcn/ui. Pairs with the Stitch design loop to ship structured, accessible components quickly.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "shadcn-ui" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# shadcn-ui

> Curated from Google Labs (Stitch).

## What it does

Build UI components with shadcn/ui. Pairs with the Stitch design loop to ship structured, accessible components quickly.

## Source

- Upstream: https://github.com/google-labs-code/skills
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/google-labs-code/skills
```

Then ask the agent to invoke this skill by name (`shadcn-ui`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-threejs', 'Threejs', 'skill', '@open-design', true,
     'Three.js skills for creating 3D elements and interactive experiences in the browser — scenes, materials, controls, and post-processing.', 'Three.js skills for creating 3D elements and interactive experiences in the browser — scenes, materials, controls, and post-processing.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "threejs" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# threejs

> Curated from CloudAI-X.

## What it does

Three.js skills for creating 3D elements and interactive experiences in the browser — scenes, materials, controls, and post-processing.

## Source

- Upstream: https://github.com/CloudAI-X/threejs-skills
- Category: `3d-shaders`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/CloudAI-X/threejs-skills
```

Then ask the agent to invoke this skill by name (`threejs`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-ui-ux-pro-max', 'Ui Ux Pro Max', 'skill', '@open-design', true,
     'UI/UX design patterns and best practices', 'UI/UX design patterns and best practices. Pattern library + heuristic checks for shipping clean, usable interfaces.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "ui-ux-pro-max" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# ui-ux-pro-max

> Curated from @nextlevelbuilder.

## What it does

UI/UX design patterns and best practices. Pattern library + heuristic checks for shipping clean, usable interfaces.

## Source

- Upstream: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
```

Then ask the agent to invoke this skill by name (`ui-ux-pro-max`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-web-design-guidelines', 'Web Design Guidelines', 'skill', '@open-design', true,
     'Web design guidelines and standards by the Vercel engineering team', 'Web design guidelines and standards by the Vercel engineering team. Covers layout, typography, color, motion, and accessibility for product UI.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        long_description = excluded.long_description,
        review_status = 'approved',
        is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "web-design-guidelines" skill, ported from the open-design project (nexu-io/open-design).

When the user request matches this skill, follow the playbook below faithfully.

Reference body (open-design SKILL.md):

# web-design-guidelines

> Curated from the Vercel engineering team.

## What it does

Web design guidelines and standards by the Vercel engineering team. Covers layout, typography, color, motion, and accessibility for product UI.

## Source

- Upstream: https://github.com/vercel-labs/skills
- Category: `design-systems`

## How to use

This catalogue entry advertises the skill in Open Design so the agent
discovers it during planning. To run the full upstream workflow with
its original assets, scripts, and references, install the upstream
bundle into your active agent''s skills directory:

```bash
# Inspect the upstream README for exact paths
open https://github.com/vercel-labs/skills
```

Then ask the agent to invoke this skill by name (`web-design-guidelines`) or with
one of the trigger phrases listed in this skill''s frontmatter.

Always: produce the artifact described in the SKILL.md output contract. Never: invent capabilities or claim affiliation with nexu-io.',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update
    set system_prompt = excluded.system_prompt;
end $$;
