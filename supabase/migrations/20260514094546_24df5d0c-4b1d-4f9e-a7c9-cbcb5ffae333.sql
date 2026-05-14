
-- 1) Insert packages (idempotent on slug)
insert into public.packages
  (slug, name, type, description, long_description, license, latest_version,
   author_handle, author_verified, is_published, review_status, source_kind, scopes, price_credits)
values
  -- Design / Frontend (sd-*)
  ('sd-design-tokens','Design Tokens Architect','skill',
   'Author and govern design tokens (color, type, spacing, radius, motion) with multi-brand theming.',
   'Defines a tokens architecture (primitive → semantic → component) using Style Dictionary / W3C DTCG. Generates CSS variables, Tailwind theme, and Figma variables. Enforces accessibility contrast and dark/light parity.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sd-a11y-expert','Accessibility (WCAG) Expert','skill',
   'Audits and fixes UI for WCAG 2.2 AA: contrast, focus, ARIA, keyboard nav, screen readers.',
   'Performs heuristic + automated a11y audits (axe rules), rewrites components with proper roles/labels, validates focus order, color contrast, and motion-reduced variants. Emits a prioritized remediation plan.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sd-motion-framer','Motion Design (Framer Motion)','skill',
   'Production-grade UI motion with Framer Motion: variants, layout animations, gesture states.',
   'Authors performant motion systems using Framer Motion. Handles enter/exit transitions, shared layout, drag/gesture, scroll-linked animations, and prefers-reduced-motion. Outputs reusable motion primitives.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sd-tailwind-expert','Tailwind CSS Expert','skill',
   'Idiomatic Tailwind v4 with semantic tokens, container queries, and design-system discipline.',
   'Refactors UI to Tailwind v4 with @theme tokens, semantic utilities, container queries, dark mode, and arbitrary variants. Eliminates magic numbers and ensures consistency with design tokens.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sd-figma-to-code','Figma-to-Code','skill',
   'Translate Figma frames into React + Tailwind components mapped to your design system.',
   'Reads Figma node trees, maps styles to existing tokens/components, generates accessible React + Tailwind code. Detects auto-layout, variants, and breakpoints; flags missing tokens instead of inlining hex values.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sd-typography','Typography Expert','skill',
   'Type scales, pairings, optical sizing, and variable-font setups for the web.',
   'Builds modular type scales, font pairings, fluid clamp() sizes, OpenType features, variable-font axes, and loading strategies (font-display, preconnect). Outputs CSS + Tailwind tokens.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sd-iconography','Iconography Expert','skill',
   'Curate, draw, and ship cohesive icon sets (SVG, sprite, font, lucide-style).',
   'Designs and audits icon systems for stroke, weight, grid, optical alignment. Exports clean SVGs, sprite sheets or tree-shakable React components. Ensures semantic alt/title and a11y.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sd-dark-mode','Dark Mode & Theming Expert','skill',
   'Multi-theme color systems with OKLCH, contrast safety and brand parity.',
   'Builds light/dark/high-contrast themes using OKLCH lightness pairs, semantic surfaces, and elevation. Validates contrast across themes and generates token diffs for design and code.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sd-microinteractions','Microinteractions Expert','skill',
   'Tasteful micro-feedback: hover, press, focus, success, empty, loading and error states.',
   'Designs and codes microinteractions for state transitions with timing/easing curves, sound-off haptic-style feedback, and reduced-motion fallbacks. Outputs reusable primitives for buttons, inputs, toasts.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),

  -- Growth / Marketing (sg-*)
  ('sg-posthog-expert','PostHog Product Analytics Expert','skill',
   'Event taxonomies, funnels, retention, session replays and experiments in PostHog.',
   'Designs PostHog tracking plans, autocapture rules, feature flags and experiments. Builds funnels, paths, retention, and session-replay workflows. Wires server + client SDK best practices.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sg-segment-cdp','Segment CDP Expert','skill',
   'Tracking plans, sources/destinations, Protocols and Reverse ETL with Segment.',
   'Designs unified event schemas, configures sources/destinations, validates with Protocols, and orchestrates Reverse ETL/Personas. Aligns with downstream analytics, CRM and ad platforms.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sg-customerio','Customer.io Lifecycle Expert','skill',
   'Behavioral campaigns, broadcasts, journeys and transactional in Customer.io.',
   'Builds segmented campaigns, journeys, broadcasts and transactional templates. Integrates with data pipelines, sets up Liquid templating, and instruments deliverability + engagement metrics.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sg-intercom-expert','Intercom Expert','skill',
   'Onboarding tours, in-app messages, Series, Fin AI, and lifecycle automation in Intercom.',
   'Designs onboarding flows, Series journeys, banners/posts/tours, and Fin AI workflows. Wires events, custom data attributes and outbound messages to KPIs.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sg-linkedin-outbound','LinkedIn Outbound Expert','skill',
   'Compliant LinkedIn prospecting, multi-touch sequences and reply handling.',
   'Designs LinkedIn ICP filters, connection + InMail sequences, multi-channel cadences with email, and reply/objection playbooks. Avoids spammy patterns and tracks SSI.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sg-tiktok-ads','TikTok Ads Expert','skill',
   'TikTok Ads Manager: creatives, hooks, Spark Ads, audiences and optimization.',
   'Builds TikTok-native creatives (hook/retention/CTA), structures campaigns (CBO/ABO), uses Spark Ads, lookalikes, and conversion API. Iterates with creative testing frameworks.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sg-youtube-ads','YouTube Ads Expert','skill',
   'Performance Max-style YouTube campaigns, creative briefs and remarketing.',
   'Plans YouTube ad strategy across Demand Gen, Video Action and bumpers. Briefs creatives by funnel stage, sets up audiences, conversions and brand-lift studies.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sg-landing-cro','Landing Page CRO Expert','skill',
   'High-converting landing pages: message-market fit, hierarchy, proof and friction removal.',
   'Audits and rewrites landing pages with clear value props, social proof, objection handling, layered CTAs and form optimization. Outputs experiment briefs with hypothesis + KPI.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0),
  ('sg-ab-testing','A/B Testing & Experimentation Expert','skill',
   'Hypothesis-driven experiments, power analysis, guardrails and decision frameworks.',
   'Defines hypotheses, primary/guardrail metrics, sample size and MDE. Builds experiment briefs, prevents peeking/SRM, and interprets results with bayesian/frequentist trade-offs.',
   'MIT','0.1.0','@superagentskill',true,true,'approved','native',
   ARRAY['agent:upgrade','registry:read'],0)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  long_description = excluded.long_description,
  is_published = true,
  review_status = 'approved',
  updated_at = now();

-- 2) Insert one published version per new package (system_prompt required)
insert into public.package_versions (package_id, version, status, system_prompt, compatibility, notes)
select p.id, '0.1.0', 'stable',
  'You are a world-class expert in ' || p.name || '. ' ||
  'Goal: ' || p.description || ' ' ||
  'Always: (1) clarify the user goal and constraints, (2) propose a concrete plan with deliverables, ' ||
  '(3) execute step-by-step with examples and code/snippets, (4) self-critique against best practices, ' ||
  '(5) cite trade-offs. Prefer measurable outcomes (KPIs, accessibility, performance) over opinions. ' ||
  'Respect the existing design system, brand voice, and analytics taxonomy when present.',
  '[{"model":"claude-3-7-sonnet"},{"model":"gpt-5"},{"model":"gemini-2.5-pro"},{"model":"cursor"}]'::jsonb,
  'Initial release.'
from public.packages p
where p.slug in (
  'sd-design-tokens','sd-a11y-expert','sd-motion-framer','sd-tailwind-expert',
  'sd-figma-to-code','sd-typography','sd-iconography','sd-dark-mode','sd-microinteractions',
  'sg-posthog-expert','sg-segment-cdp','sg-customerio','sg-intercom-expert',
  'sg-linkedin-outbound','sg-tiktok-ads','sg-youtube-ads','sg-landing-cro','sg-ab-testing'
)
and not exists (
  select 1 from public.package_versions v where v.package_id = p.id and v.version = '0.1.0'
);

-- 3) Link new skills to existing thematic packs
with mapping(pack_slug, pkg_slug, role, sort_order) as (values
  -- Design System Pro (sd-*)
  ('pack-design-system','sd-design-tokens','core',10),
  ('pack-design-system','sd-a11y-expert','core',11),
  ('pack-design-system','sd-typography','core',12),
  ('pack-design-system','sd-iconography','core',13),
  ('pack-design-system','sd-dark-mode','core',14),
  -- Frontend & Motion (sd-*)
  ('pack-frontend-motion','sd-tailwind-expert','core',8),
  ('pack-frontend-motion','sd-motion-framer','core',9),
  ('pack-frontend-motion','sd-figma-to-code','core',10),
  ('pack-frontend-motion','sd-microinteractions','optional',11),
  -- Growth Analytics (sg-*)
  ('pack-growth-analytics','sg-posthog-expert','core',4),
  ('pack-growth-analytics','sg-segment-cdp','core',5),
  ('pack-growth-analytics','sg-ab-testing','core',6),
  -- Outbound GTM
  ('pack-growth-gtm','sg-linkedin-outbound','core',5),
  -- Growth Strategy
  ('pack-growth-strategy','sg-tiktok-ads','core',6),
  ('pack-growth-strategy','sg-youtube-ads','core',7),
  ('pack-growth-strategy','sg-landing-cro','core',8),
  ('pack-growth-strategy','sg-customerio','core',9),
  ('pack-growth-strategy','sg-intercom-expert','core',10)
)
insert into public.pack_items (pack_id, package_id, role, sort_order)
select pk.id, pg.id, m.role, m.sort_order
from mapping m
join public.packs pk on pk.slug = m.pack_slug
join public.packages pg on pg.slug = m.pkg_slug
on conflict (pack_id, package_id) do update set
  role = excluded.role,
  sort_order = excluded.sort_order;
