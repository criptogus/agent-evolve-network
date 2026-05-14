
insert into public.packs (slug, name, description, long_description, theme, cover_emoji, author_handle, price_credits, is_published, review_status)
values
  ('pack-design-system','Design System Pro','Brand, color, design reviews and creative direction in one bundle.','Curated set of expert design skills covering brand guidelines, color theory, design briefs, design review and creative direction.','design','🎨','@superagentskill',0,true,'approved'),
  ('pack-frontend-motion','Frontend & Motion','Production frontend, shadcn/ui, GSAP and Three.js animation skills.','Bundle for engineers and design engineers — shadcn/ui patterns, frontend design, GSAP core + ScrollTrigger, Three.js and canvas design.','frontend','⚡','@superagentskill',0,true,'approved'),
  ('pack-creative-marketing','Creative Marketing','Ad creative, copywriting, brainstorming and CRO playbooks.','Generates ads, landing copy, FAQ pages, paywall flows, brand naming and decks. Wires creative direction with conversion best practices.','marketing','✍️','@superagentskill',0,true,'approved'),
  ('pack-growth-analytics','Growth Analytics','Amplitude, GA4 and Mixpanel experts in one stack.','Instrumentation, dashboards, funnels and retention analyses across the three most-used product analytics platforms.','analytics','📊','@superagentskill',0,true,'approved'),
  ('pack-growth-gtm','Outbound GTM','Apollo, Clay, HubSpot and outbound cadence experts.','Prospecting, enrichment, CRM hygiene and multi-touch outbound cadences for B2B GTM teams.','gtm','🚀','@superagentskill',0,true,'approved'),
  ('pack-growth-strategy','Growth Strategy','Growth strategist, CRO, paid ads, lifecycle and technical SEO.','End-to-end growth bundle covering strategy, CRO experiments, paid acquisition (Meta+Google), lifecycle/email, and technical SEO.','growth','📈','@superagentskill',0,true,'approved')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  long_description = excluded.long_description,
  theme = excluded.theme,
  cover_emoji = excluded.cover_emoji,
  is_published = true,
  review_status = 'approved',
  updated_at = now();

with mapping(pack_slug, pkg_slug, role, sort_order) as (values
  ('pack-design-system','od-brand-guidelines','core',1),
  ('pack-design-system','od-color-expert','core',2),
  ('pack-design-system','od-design-brief','core',3),
  ('pack-design-system','od-design-review','core',4),
  ('pack-design-system','od-design-consultation','core',5),
  ('pack-design-system','od-design-md','core',6),
  ('pack-design-system','od-web-design-guidelines','core',7),
  ('pack-design-system','od-ui-ux-pro-max','core',8),
  ('pack-design-system','od-creative-director','core',9),
  ('pack-frontend-motion','od-frontend-design','core',1),
  ('pack-frontend-motion','od-shadcn-ui','core',2),
  ('pack-frontend-motion','od-gsap-core','core',3),
  ('pack-frontend-motion','od-gsap-scrolltrigger','core',4),
  ('pack-frontend-motion','od-threejs','core',5),
  ('pack-frontend-motion','od-canvas-design','core',6),
  ('pack-frontend-motion','od-artifacts-builder','optional',7),
  ('pack-creative-marketing','od-ad-creative','core',1),
  ('pack-creative-marketing','od-copywriting','core',2),
  ('pack-creative-marketing','od-marketing-psychology','core',3),
  ('pack-creative-marketing','od-paywall-upgrade-cro','core',4),
  ('pack-creative-marketing','od-brainstorming','optional',5),
  ('pack-creative-marketing','od-domain-name-brainstormer','optional',6),
  ('pack-creative-marketing','od-faq-page','optional',7),
  ('pack-creative-marketing','od-enhance-prompt','optional',8),
  ('pack-creative-marketing','od-pptx-generator','optional',9),
  ('pack-growth-analytics','gx-amplitude-expert','core',1),
  ('pack-growth-analytics','gx-ga4-expert','core',2),
  ('pack-growth-analytics','gx-mixpanel-expert','core',3),
  ('pack-growth-gtm','gx-apollo-expert','core',1),
  ('pack-growth-gtm','gx-clay-expert','core',2),
  ('pack-growth-gtm','gx-hubspot-expert','core',3),
  ('pack-growth-gtm','gx-outbound-cadence-expert','core',4),
  ('pack-growth-strategy','gx-growth-strategist','core',1),
  ('pack-growth-strategy','gx-cro-expert','core',2),
  ('pack-growth-strategy','gx-paid-ads-expert','core',3),
  ('pack-growth-strategy','gx-lifecycle-email-expert','core',4),
  ('pack-growth-strategy','gx-seo-technical-expert','core',5)
)
insert into public.pack_items (pack_id, package_id, role, sort_order)
select pk.id, pg.id, m.role, m.sort_order
from mapping m
join public.packs pk on pk.slug = m.pack_slug
join public.packages pg on pg.slug = m.pkg_slug
on conflict (pack_id, package_id) do update set
  role = excluded.role,
  sort_order = excluded.sort_order;
