
-- Insert 3 themed packs
insert into public.packs (slug, name, theme, description, long_description, cover_emoji, price_credits, is_published, review_status)
values
  (
    'pack-gtm-ia',
    'Go-to-Market com IA',
    'gtm',
    'Skills para pesquisa de ICP, proposta de valor, mensagens comerciais, canais, rotina de vendas e priorização de experimentos de crescimento.',
    'Bundle completo para um time de GTM rodando com agentes: descoberta de ICP, posicionamento (April Dunford), planejamento de lançamento em 90 dias, máquina de outbound (SDR), playbooks de paid e CRO, battlecards e modelagem de mercado. Tudo customizável para sua vertical e ICP.',
    '🎯',
    0,
    true,
    'approved'
  ),
  (
    'pack-marketing-conteudo-ia',
    'Marketing e conteúdo com IA',
    'content',
    'Skills para transformar briefing, pesquisa e repertório executivo em artigos, posts, roteiros, newsletters e materiais ricos com voz própria.',
    'Pack editorial end-to-end: pillar architect, SEO/GEO writer, guardião da voz da marca, calendário, repurpose, otimização técnica e visibilidade em LLMs (GEO). Inclui playbooks de SEO content engine, Instagram e social launch week. Anchored em E-E-A-T, AIDA e Hook–Promise–Payoff.',
    '✍️',
    0,
    true,
    'approved'
  ),
  (
    'pack-operacoes-autonomas',
    'Operações autônomas',
    'ops',
    'Skills para desenhar agentes, guardrails, rotinas, evidências e loops de melhoria sem criar automação solta ou risco operacional.',
    'Pack para quem opera agentes em produção: orquestração, delegação, hand-off, health, memória, recuperação de erro, audit logging, eval designer e postmortems. Inclui guardrails para governança de IA, mudanças em cloud, segurança e proteção de dados.',
    '⚙️',
    0,
    true,
    'approved'
  )
on conflict (slug) do update set
  name = excluded.name,
  theme = excluded.theme,
  description = excluded.description,
  long_description = excluded.long_description,
  cover_emoji = excluded.cover_emoji,
  is_published = true,
  review_status = 'approved';

-- Items per pack (only insert pairs where the package exists)
with mapping(pack_slug, package_slug, role, sort_order) as (
  values
    -- Go-to-Market com IA
    ('pack-gtm-ia','cmo-positioning-strategist','core',1),
    ('pack-gtm-ia','cmo-gtm-planner','core',2),
    ('pack-gtm-ia','market-sizing','core',3),
    ('pack-gtm-ia','battlecard-builder','core',4),
    ('pack-gtm-ia','gx-growth-strategist','core',5),
    ('pack-gtm-ia','gx-outbound-cadence-expert','core',6),
    ('pack-gtm-ia','gx-paid-ads-expert','core',7),
    ('pack-gtm-ia','gx-cro-expert','core',8),
    ('pack-gtm-ia','pl-icp-discovery','core',9),
    ('pack-gtm-ia','pl-outbound-sdr-machine','core',10),
    ('pack-gtm-ia','pl-gtm-launch-90d','core',11),
    ('pack-gtm-ia','pl-pmf-validation','optional',12),
    ('pack-gtm-ia','pl-account-based-marketing','optional',13),
    ('pack-gtm-ia','saas-cold-outreach','optional',14),

    -- Marketing e conteúdo com IA
    ('pack-marketing-conteudo-ia','brand-voice-guardian','core',1),
    ('pack-marketing-conteudo-ia','blog-pillar-architect','core',2),
    ('pack-marketing-conteudo-ia','blog-seo-geo-writer','core',3),
    ('pack-marketing-conteudo-ia','content-calendar-planner','core',4),
    ('pack-marketing-conteudo-ia','content-repurposer','core',5),
    ('pack-marketing-conteudo-ia','geo-answer-engine','core',6),
    ('pack-marketing-conteudo-ia','geo-llm-visibility','core',7),
    ('pack-marketing-conteudo-ia','gx-seo-technical-expert','core',8),
    ('pack-marketing-conteudo-ia','od-copywriting','core',9),
    ('pack-marketing-conteudo-ia','viral-short-video-writer','core',10),
    ('pack-marketing-conteudo-ia','x-thread-writer','optional',11),
    ('pack-marketing-conteudo-ia','pl-seo-content-engine','core',12),
    ('pack-marketing-conteudo-ia','pl-instagram-content-engine','optional',13),
    ('pack-marketing-conteudo-ia','pl-social-launch-week','optional',14),

    -- Operações autônomas
    ('pack-operacoes-autonomas','coding-agent-orchestrator','core',1),
    ('pack-operacoes-autonomas','agent-task-delegation','core',2),
    ('pack-operacoes-autonomas','agent-handoff-protocols','core',3),
    ('pack-operacoes-autonomas','agent-memory-management','core',4),
    ('pack-operacoes-autonomas','agent-error-recovery','core',5),
    ('pack-operacoes-autonomas','agent-health-monitoring','core',6),
    ('pack-operacoes-autonomas','agent-audit-logging','core',7),
    ('pack-operacoes-autonomas','ai-eval-designer','core',8),
    ('pack-operacoes-autonomas','cto-incident-postmortem','core',9),
    ('pack-operacoes-autonomas','guardrail-ai-governance-model-risk','core',10),
    ('pack-operacoes-autonomas','guardrail-cloud-infrastructure-change','core',11),
    ('pack-operacoes-autonomas','guardrail-cybersecurity-dual-use','optional',12),
    ('pack-operacoes-autonomas','guardrail-privacy-data-protection-law','optional',13)
)
insert into public.pack_items (pack_id, package_id, role, sort_order)
select pk.id, pg.id, m.role, m.sort_order
from mapping m
join public.packs pk on pk.slug = m.pack_slug
join public.packages pg on pg.slug = m.package_slug
on conflict (pack_id, package_id) do update set
  role = excluded.role,
  sort_order = excluded.sort_order;
