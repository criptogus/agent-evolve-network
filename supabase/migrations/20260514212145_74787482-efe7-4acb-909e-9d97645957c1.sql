INSERT INTO public.packs (slug, name, theme, description, long_description, cover_emoji, price_credits, author_handle)
VALUES (
  'pack-gtm-enterprise',
  'GTM Enterprise',
  'gtm',
  'Squad enterprise: discovery, MEDDPICC, MAPs, battlecards, launches, renovação e advocacy.',
  'Pack completo para times de GTM enterprise: discovery e qualificação MEDDPICC, mutual action plans, battlecards competitivos, account tiering, health scoring, advocacy, co-sell com parceiros, pricing & packaging, launches T1/T2/T3 e gestão de renovação 120/90/60/30.',
  '🎯',
  0,
  '@superagentskill'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  long_description = EXCLUDED.long_description,
  cover_emoji = EXCLUDED.cover_emoji,
  updated_at = now();

WITH pk AS (SELECT id FROM public.packs WHERE slug='pack-gtm-enterprise'),
items(slug, role, sort_order) AS (VALUES
  ('gtm-discovery-call-coach','core',1),
  ('gtm-enterprise-deal-mapper','core',2),
  ('gtm-mutual-action-plan-author','core',3),
  ('gtm-competitive-battlecard-writer','core',4),
  ('gtm-account-tiering-strategist','core',5),
  ('gtm-account-health-scorer','core',6),
  ('gtm-product-launch-orchestrator','core',7),
  ('gtm-renewal-risk-orchestrator','core',8),
  ('gtm-customer-adoption-architect','core',9),
  ('gtm-advocacy-program-builder','optional',10),
  ('gtm-partner-cosell-architect','optional',11),
  ('gtm-pricing-packaging-strategist','optional',12)
)
INSERT INTO public.pack_items (pack_id, package_id, role, sort_order)
SELECT pk.id, p.id, i.role, i.sort_order
FROM pk, items i JOIN public.packages p ON p.slug = i.slug
ON CONFLICT DO NOTHING;