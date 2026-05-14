
-- Skills data: slug, name, description, goal
with new_skills(slug, name, description, goal) as (
  values
  -- Customer Support
  ('cs-cx-strategy','Customer Experience (CX) Strategist','Designs end-to-end CX programs, NPS/CSAT/CES measurement, voice-of-customer loops, and journey maps.','Define CX strategy, measurement framework (NPS/CSAT/CES), VoC program, and journey maps that reduce churn and increase satisfaction.'),
  ('cs-zendesk-expert','Zendesk & Helpdesk Expert','Configures Zendesk/Intercom/Freshdesk: triggers, automations, macros, SLAs, knowledge base, and routing.','Set up and optimize helpdesk platforms (Zendesk, Intercom, Freshdesk) with workflows, SLAs, macros, KB, and intelligent routing.'),
  ('cs-conversational-ai','Conversational AI & Support Bot Designer','Designs AI chatbots and copilots for tier-1 deflection, escalation, and seamless human handoff.','Design conversational AI flows that deflect tier-1 tickets, escalate appropriately, and hand off to humans without friction.'),

  -- Logistics
  ('lg-supply-chain','Supply Chain Strategist','Plans S&OP, sourcing, supplier management, lead-time optimization, and resilience strategies.','Build resilient supply chain strategies covering S&OP, sourcing, supplier risk, and lead-time optimization.'),
  ('lg-last-mile','Last-Mile Delivery Expert','Optimizes routing, carrier mix, delivery SLAs, returns flow, and unit economics for last-mile.','Design last-mile delivery operations: routing, carriers, SLAs, returns, and per-order unit economics.'),
  ('lg-warehouse-ops','Warehouse & Fulfillment Ops','Designs WMS workflows, slotting, picking strategies, KPIs, and 3PL relationships.','Design warehouse and fulfillment operations: layout, slotting, picking, KPIs (UPH, accuracy), and 3PL governance.'),

  -- E-commerce
  ('ec-shopify-expert','Shopify & Headless Commerce Expert','Architects Shopify (Plus), Hydrogen, and headless commerce stacks with apps, themes, and checkout.','Architect Shopify Plus / headless commerce: themes, apps, Hydrogen, checkout extensibility, B2B, and performance.'),
  ('ec-marketplace-strategy','Marketplace Strategist (Amazon, MELI, etc.)','Optimizes listings, Buy Box, ads, FBA/Full operations across Amazon, Mercado Livre, and others.','Win on marketplaces (Amazon, Mercado Livre): listings, Buy Box, sponsored ads, FBA/Full ops, account health.'),
  ('ec-checkout-cro','Checkout & Funnel CRO Specialist','Diagnoses and optimizes PDP-to-thank-you funnels: friction, payments, trust, A/B tests.','Increase ecommerce conversion across PDP→cart→checkout via friction reduction, trust, payment options, and A/B tests.'),

  -- Inventory Management
  ('im-inventory-planning','Inventory Planner','Sets safety stock, reorder points, ABC/XYZ analysis, and working-capital optimization.','Plan inventory: safety stock, reorder points, ABC/XYZ classification, MOQ negotiation, working capital efficiency.'),
  ('im-demand-forecasting','Demand Forecasting Expert','Builds statistical and ML demand forecasts (ARIMA, Prophet, ML) with accuracy KPIs (MAPE, bias).','Forecast demand using statistical and ML models (ARIMA, Prophet, gradient boosting) and govern accuracy (MAPE, WAPE, bias).'),
  ('im-wms-expert','WMS & Stock Accuracy Expert','Implements cycle counts, barcode/RFID, lot/serial control, and WMS integrations (NetSuite, SAP, Bling).','Implement WMS practices for stock accuracy: cycle counts, barcode/RFID, lot/serial, integrations with ERPs.'),

  -- Innovation Management
  ('iv-innovation-strategy','Innovation Strategy Lead','Builds horizon 1/2/3 portfolios, innovation theses, and stage-gate / lean experimentation processes.','Define innovation strategy: H1/H2/H3 portfolio, theses, stage-gates, lean experiments, and corporate venturing.'),
  ('iv-design-thinking','Design Thinking Facilitator','Runs empathize→ideate→prototype→test sprints with crisp artifacts and decisions.','Facilitate Design Thinking sprints (empathize, define, ideate, prototype, test) with high-signal artifacts.'),
  ('iv-jobs-to-be-done','Jobs-to-be-Done (JTBD) Researcher','Conducts JTBD interviews, writes job statements, opportunity scoring, and switch analysis.','Run JTBD research: interviews, job statements, forces of progress, opportunity scoring, switch analysis.'),

  -- Digital Product Management
  ('pm-product-strategy','Digital Product Strategist','Defines vision, North Star metric, strategy stack, and OKRs for digital products.','Craft product vision, North Star metric, strategy stack (Lenny/Reforge style), and OKRs that drive outcomes.'),
  ('pm-product-discovery','Continuous Product Discovery (Teresa Torres)','Runs opportunity solution trees, weekly customer interviews, assumption tests.','Run continuous discovery: OSTs, weekly interviews, assumption mapping, and assumption tests (Torres method).'),
  ('pm-product-analytics','Product Analytics & Experimentation Lead','Instruments events, builds funnels/retention/cohorts, runs A/B tests with statistical rigor.','Instrument product analytics, build funnels/retention/cohort views, and run A/B tests with statistical rigor.')
),
inserted_pkg as (
  insert into public.packages (slug, name, type, description, long_description, author_handle, author_verified, source_kind, review_status, is_published)
  select slug, name, 'skill'::package_type, description, description, '@superagentskill', true, 'native', 'approved', true
  from new_skills
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    long_description = excluded.long_description,
    review_status = 'approved',
    is_published = true
  returning id, slug
),
inserted_ver as (
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  select
    p.id,
    '0.1.0',
    'stable',
    'Initial release.',
    'You are a world-class expert in ' || s.name || '. Goal: ' || s.goal || ' Always: (1) clarify the user goal and constraints, (2) propose a concrete plan with deliverables, (3) execute step-by-step with examples and code/snippets, (4) self-critique against best practices, (5) cite trade-offs. Prefer measurable outcomes (KPIs, accessibility, performance) over opinions. Respect the existing design system, brand voice, and analytics taxonomy when present.',
    '{}'::jsonb,
    '[]'::jsonb,
    '[{"model":"claude-3-7-sonnet"},{"model":"gpt-5"},{"model":"gemini-2.5-pro"},{"model":"cursor"}]'::jsonb
  from inserted_pkg p
  join new_skills s on s.slug = p.slug
  on conflict do nothing
  returning 1
)
select count(*) from inserted_pkg;

-- Create 6 new thematic packs
insert into public.packs (slug, name, theme, description, long_description, cover_emoji, author_handle, is_published, review_status)
values
  ('pack-customer-support','Customer Support Excellence','support','CX strategy, helpdesk, and conversational AI.','Build a world-class support org: CX strategy, helpdesk tooling, and AI deflection.','💬','@superagentskill',true,'approved'),
  ('pack-logistics','Logistics & Supply Chain','logistics','Supply chain, last-mile, and warehouse operations.','Plan and run resilient logistics: supply chain, last-mile, and warehouse ops.','🚚','@superagentskill',true,'approved'),
  ('pack-ecommerce','E-commerce Operator','ecommerce','Shopify, marketplaces, and checkout CRO.','Operate and grow ecommerce on Shopify, marketplaces, and via checkout CRO.','🛒','@superagentskill',true,'approved'),
  ('pack-inventory','Inventory & Stock Mastery','inventory','Planning, demand forecasting, and WMS accuracy.','Master inventory: planning, forecasting, and stock accuracy.','📦','@superagentskill',true,'approved'),
  ('pack-innovation','Innovation Management','innovation','Innovation strategy, design thinking, and JTBD.','Run a modern innovation function: strategy, design thinking, and JTBD.','💡','@superagentskill',true,'approved'),
  ('pack-product-mgmt','Digital Product Management','product','Strategy, continuous discovery, and product analytics.','Lead modern digital products: strategy, discovery (Torres), and analytics/experimentation.','🧭','@superagentskill',true,'approved')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  long_description = excluded.long_description,
  cover_emoji = excluded.cover_emoji;

-- Link new skills to packs
with mapping(pack_slug, pkg_slug, role, sort_order) as (
  values
    ('pack-customer-support','cs-cx-strategy','core',1),
    ('pack-customer-support','cs-zendesk-expert','core',2),
    ('pack-customer-support','cs-conversational-ai','core',3),
    ('pack-logistics','lg-supply-chain','core',1),
    ('pack-logistics','lg-last-mile','core',2),
    ('pack-logistics','lg-warehouse-ops','core',3),
    ('pack-ecommerce','ec-shopify-expert','core',1),
    ('pack-ecommerce','ec-marketplace-strategy','core',2),
    ('pack-ecommerce','ec-checkout-cro','core',3),
    ('pack-inventory','im-inventory-planning','core',1),
    ('pack-inventory','im-demand-forecasting','core',2),
    ('pack-inventory','im-wms-expert','core',3),
    ('pack-innovation','iv-innovation-strategy','core',1),
    ('pack-innovation','iv-design-thinking','core',2),
    ('pack-innovation','iv-jobs-to-be-done','core',3),
    ('pack-product-mgmt','pm-product-strategy','core',1),
    ('pack-product-mgmt','pm-product-discovery','core',2),
    ('pack-product-mgmt','pm-product-analytics','core',3),
    -- cross-links
    ('pack-ecommerce','im-inventory-planning','optional',10),
    ('pack-ecommerce','lg-last-mile','optional',11),
    ('pack-product-mgmt','iv-jobs-to-be-done','optional',10),
    ('pack-product-mgmt','iv-design-thinking','optional',11)
)
insert into public.pack_items (pack_id, package_id, role, sort_order)
select p.id, pk.id, m.role, m.sort_order
from mapping m
join public.packs p on p.slug = m.pack_slug
join public.packages pk on pk.slug = m.pkg_slug
on conflict (pack_id, package_id) do update set
  role = excluded.role,
  sort_order = excluded.sort_order;
