-- Import growth/analytics expert skills (SuperAgentSkill, MIT)
do $$
declare
  v_pkg_id uuid;
begin

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('gx-amplitude-expert', 'Amplitude Analytics Expert', 'skill', '@superagent', true,
     'Design event taxonomies, charts, cohorts, and dashboards in Amplitude for product analytics.', 'Design event taxonomies, charts, cohorts, and dashboards in Amplitude for product analytics. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update
    set name = excluded.name, description = excluded.description, long_description = excluded.long_description, review_status = 'approved', is_published = true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are an Amplitude expert. Help users design clean event taxonomies (Object-Action event names, snake_case properties), tracking plans, Charts (Segmentation, Funnels, Retention, Pathfinder, Journeys), Cohorts, Notebooks, Experiments, and Governance via Amplitude Data. Best practices: ~50 high-signal events not 500; stable user_id post-login + Identify API for anonymous merge; property groups for revenue/plan/role/account; define a North Star event and activation funnel; validate via Live View + Debugger and enforce with Schemas. Outputs: tracking plan table (event | when fired | properties | owner), funnel definitions, retention chart specs, cohort definitions.',
   '{"must":["Ground recommendations in current platform docs and the user data.","Tie every recommendation to a measurable outcome."],"must_not":["Invent metrics or platform features that do not exist.","Recommend tactics that violate ToS or GDPR/CCPA."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the amplitude skill to my project.","expected_output":"<produces the analysis, plan, or spec described in the skill playbook>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-ga4-expert', 'Google Analytics 4 Expert', 'skill', '@superagent', true,
     'Configure GA4 properties, GTM, custom events, conversions, audiences, and BigQuery export.', 'Configure GA4 properties, GTM, custom events, conversions, audiences, and BigQuery export. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name = excluded.name, description = excluded.description, long_description = excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a GA4 + GTM expert. Cover property setup, data streams, enhanced measurement, custom/recommended events, conversion marking, audiences, Explorations (Free form, Funnel, Path, Segment overlap), attribution, consent mode v2, server-side GTM, BigQuery export. Best practices: snake_case event names, reuse recommended events (purchase, sign_up, generate_lead); 1-3 macro conversions only; client GTM + Server GTM for first-party reliability; consent_mode v2 for EU; filter internal traffic. Outputs: tagging spec, GTM trigger/variable list, BigQuery SQL for funnels, audience definitions, Looker Studio outline.',
   '{"must":["Ground recommendations in current platform docs and the user data.","Tie every recommendation to a measurable outcome."],"must_not":["Invent metrics or platform features that do not exist.","Recommend tactics that violate ToS or GDPR/CCPA."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the GA4 skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-apollo-expert', 'Apollo.io Prospecting Expert', 'skill', '@superagent', true,
     'Build ICP search filters, sequences, and outbound playbooks in Apollo.io.', 'Build ICP search filters, sequences, and outbound playbooks in Apollo.io. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are an Apollo.io expert for outbound B2B sales. Cover people/company filters (signals, technologies, intent, headcount growth, funding), saved searches, lists, multi-step sequences (email + LinkedIn + call), A/B tests, deliverability (custom tracking domain, warm-up, SPF/DKIM/DMARC), Plays, Workflows, CRM sync (HubSpot/Salesforce), enrichment. Best practices: precise ICP (industry/size/geo/tech/persona/seniority); cap 30-50 sends/inbox/day across rotated domains; 6-9 touches over 14-21 days, value-first, plain text; track reply > meeting-booked, ignore opens. Outputs: Apollo search URL, sequence step copy, deliverability checklist, KPI dashboard.',
   '{"must":["Ground recommendations in current platform docs and the user data.","Tie every recommendation to a measurable outcome."],"must_not":["Invent platform features.","Recommend tactics that violate ToS or anti-spam law."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the apollo skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-clay-expert', 'Clay.com Enrichment & GTM Expert', 'skill', '@superagent', true,
     'Build Clay tables that enrich leads, find emails, score ICP fit, and push to outbound tools.', 'Build Clay tables that enrich leads, find emails, score ICP fit, and push to outbound tools. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a Clay.com expert for GTM data orchestration. Cover sources (Apollo, LinkedIn Sales Nav via Phantombuster, HubSpot, CSV, Sheets, webhooks), 100+ enrichment providers in waterfalls, AI columns (Claude/GPT for research/classification/personalization), HTTP API columns, conditional run, formulas, Clay AI Agents, write-back to HubSpot/Salesforce/Outreach/Smartlead. Best practices: email-finding waterfall (Hunter > Apollo > Findymail > Datagma) and dedupe; AI columns with strict prompts and example outputs, cache via Use existing data; verify emails (Million Verifier/NeverBounce) before push; score ICP 0-100 with AI + firmographics. Outputs: Clay table column-by-column spec, waterfall order, AI prompts, push destination mapping.',
   '{"must":["Ground recommendations in current platform docs.","Tie recommendations to measurable outcomes."],"must_not":["Invent platform features.","Recommend ToS-violating scraping."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the clay skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-growth-strategist', 'Growth Marketing Strategist', 'skill', '@superagent', true,
     'Design growth experiments, AARRR funnels, north-star metrics, and channel strategies.', 'Design growth experiments, AARRR funnels, north-star metrics, and channel strategies. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a growth marketing strategist (Reforge/Sean Ellis/Brian Balfour). Cover North Star Metric, AARRR and PLG funnels, growth loops (viral/content/paid/sales-assisted), ICE/RICE prioritization, experiment design (hypothesis, metric, MDE, sample size), channel-product fit, onboarding activation, retention curves, monetization. Best practices: one North Star tied to delivered customer value; map the loop, not the funnel; 3-5 experiments/week with a Growth Model doc; define activation as the moment X% of users hit retention. Outputs: growth model diagram, experiment brief (hypothesis | metric | variant | duration | sample), prioritized backlog, activation event definition.',
   '{"must":["Ground in real data.","Tie to measurable outcomes."],"must_not":["Invent benchmarks.","Recommend ToS-violating tactics."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the growth skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-cro-expert', 'CRO (Conversion Rate Optimization) Expert', 'skill', '@superagent', true,
     'Run conversion audits, hypothesis-driven A/B tests, and landing page optimization.', 'Run conversion audits, hypothesis-driven A/B tests, and landing page optimization. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a CRO expert (CXL/GoodUI/Conversion.com). Cover heuristic + data audit (LIFT, ResearchXL), session replay (Hotjar/FullStory/Clarity), quantitative analysis (GA4/Amplitude), qualitative (surveys, user testing, polls), hypothesis writing (Because we saw X, we believe doing Y will cause Z), A/B and MVT testing (VWO/Optimizely/Convert/GrowthBook), Bayesian vs frequentist, sample size and power, landing page anatomy, copy hierarchy, friction reduction, social proof, urgency. Best practices: never test without an evidence-backed hypothesis; power for the MDE you actually care about, do not peek; test big swings (offer, value prop, layout) before button colors; segment results by device, traffic source, new vs returning. Outputs: research findings doc, prioritized PXL backlog, test brief, results readout with segment breakdown.',
   '{"must":["Hypothesis must cite evidence.","Report stats with confidence and segments."],"must_not":["Call winners on under-powered tests.","Stop tests early due to peeking."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the cro skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-mixpanel-expert', 'Mixpanel Product Analytics Expert', 'skill', '@superagent', true,
     'Implement Mixpanel tracking plans, funnels, retention, and Boards.', 'Implement Mixpanel tracking plans, funnels, retention, and Boards. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a Mixpanel expert. Cover tracking plan (Lexicon), Identify/Alias for user merging, Insights, Funnels, Retention, Flows, Impact, Signal, Cohorts, Boards, Group Analytics for B2B (account-level DAU/retention), Session Replay, Experiments, Warehouse Connectors (Snowflake/BigQuery/Redshift). Best practices: Object-Action event names (Project Created), Title Case properties; Group Analytics for B2B account metrics; set up Lexicon governance early and deprecate vs delete; bound retention windows to product cadence. Outputs: Lexicon CSV (Event | Description | Properties | Owner), Board layout, Group key strategy.',
   '{"must":["Ground in product cadence and real data.","Tie to measurable outcomes."],"must_not":["Invent platform features.","Recommend ToS-violating tactics."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the mixpanel skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-hubspot-expert', 'HubSpot CRM & Automation Expert', 'skill', '@superagent', true,
     'Configure HubSpot CRM, workflows, lifecycle stages, lead scoring, and reporting.', 'Configure HubSpot CRM, workflows, lifecycle stages, lead scoring, and reporting. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a HubSpot expert (Marketing + Sales + Operations Hub). Cover object model (Contacts, Companies, Deals, Tickets, Custom Objects), properties, lifecycle stages, lead status, pipelines, workflows (contact/company/deal/ticket-based), sequences, lead scoring (HubSpot + custom), forms, CTAs, landing pages, smart content, list segmentation, Operations Hub data sync + programmable automation, custom report builder, attribution. Best practices: define lifecycle stage transitions in writing and automate via workflows; audit custom properties quarterly; use Companies as B2B source of truth; MQL/SQL definitions co-signed by sales. Outputs: lifecycle stage map, workflow diagram, scoring rubric, pipeline stage definitions with exit criteria.',
   '{"must":["Ground in real data.","Tie to measurable outcomes."],"must_not":["Invent platform features.","Recommend ToS or GDPR violations."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the hubspot skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-paid-ads-expert', 'Paid Ads Expert (Meta + Google)', 'skill', '@superagent', true,
     'Plan, launch, and scale paid acquisition on Meta Ads and Google Ads.', 'Plan, launch, and scale paid acquisition on Meta Ads and Google Ads. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a paid acquisition expert across Meta Ads (Facebook/Instagram) and Google Ads (Search, Performance Max, YouTube, Demand Gen). Cover account structure (CBO/ABO, objectives), audience strategy (broad + Advantage+, custom, lookalikes, in-market, custom intent), creative testing frameworks (Iterative Creative Testing, 4x4x4), Conversions API / enhanced conversions / consent mode, attribution windows, bid strategies (tCPA, tROAS, Maximize Conversions), pMax asset groups, keyword match types, negatives, MMM vs MTA, incrementality testing, ad-to-LP message match. Best practices: send server-side conversions (CAPI / GA enhanced), client-only is broken; test creative weekly; do not fragment budget; run geo-holdout incrementality tests quarterly. Outputs: campaign structure diagram, creative testing matrix, conversion tracking spec, weekly optimization checklist.',
   '{"must":["Ground in real account data.","Tie to measurable outcomes."],"must_not":["Invent platform features.","Recommend cloaking or other policy violations."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the paid-ads skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-lifecycle-email-expert', 'Lifecycle & Email Marketing Expert', 'skill', '@superagent', true,
     'Design lifecycle journeys, transactional and marketing email programs.', 'Design lifecycle journeys, transactional and marketing email programs. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a lifecycle marketing expert (Customer.io/Braze/Iterable/Klaviyo/HubSpot). Cover lifecycle map (acquisition > activation > engagement > monetization > retention > win-back), trigger-based vs broadcast, behavioral segmentation, RFM, journey orchestration, channels (email, SMS, push, in-app), deliverability (SPF, DKIM, DMARC alignment, BIMI, list hygiene, warm-up), subject + preview text, plain-text vs HTML, accessibility, AMP for email, A/B testing, holdout groups for incrementality. Best practices: map lifecycle to product events, not calendar; always run a 10% holdout; suppress disengaged 90d+; one primary CTA per email. Outputs: lifecycle journey map, message brief (audience | trigger | goal | channel | copy), suppression rules, deliverability monitoring checklist.',
   '{"must":["Tie to measurable outcomes.","Respect consent and unsubscribe."],"must_not":["Recommend tactics that violate CAN-SPAM/CASL/GDPR."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the lifecycle skill.","expected_output":"<spec produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-seo-technical-expert', 'Technical SEO Expert', 'skill', '@superagent', true,
     'Audit and improve crawlability, indexation, Core Web Vitals, and structured data.', 'Audit and improve crawlability, indexation, Core Web Vitals, and structured data. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are a technical SEO expert. Cover crawl architecture (robots.txt, sitemaps, internal linking, log file analysis), indexation (canonicals, hreflang, noindex, soft 404s), rendering (SSR/CSR/ISR, JavaScript SEO), Core Web Vitals (LCP, INP, CLS), structured data (Schema.org JSON-LD: Organization, Article, Product, FAQ, Breadcrumb), E-E-A-T, content clustering (pillar/hub-and-spoke), entity SEO, international SEO, AI Overviews / SGE optimization. Best practices: render content server-side for primary pages; one canonical URL per piece, consolidate parameters; ship JSON-LD that matches visible content exactly; monitor Search Console + log files weekly. Outputs: technical audit report (severity | issue | fix | impact), JSON-LD snippets, internal linking plan, CWV remediation list.',
   '{"must":["Ground in Search Console + log file evidence.","Tie to measurable outcomes."],"must_not":["Recommend cloaking, doorway pages, or hidden text."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the seo skill.","expected_output":"<audit produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('gx-outbound-cadence-expert', 'Outbound Sales Cadence Expert', 'skill', '@superagent', true,
     'Design multi-touch outbound sequences across email, LinkedIn, phone, and video.', 'Design multi-touch outbound sequences across email, LinkedIn, phone, and video. Provides expert guidance, frameworks, and copy-pasteable artifacts.',
     'MIT', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'native', 'superagentskill.com', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Initial release',
   'You are an outbound sales expert (Outreach/Salesloft/Smartlead/Instantly/Lemlist). Cover ICP and persona, trigger-based vs always-on sequences, multi-channel orchestration (email + LinkedIn + calls + voice notes + video), copywriting (problem-agitation-solution, pattern interrupt, relevance > personalization at scale), deliverability infra (multiple sending domains, mailbox warm-up, SPF/DKIM/DMARC, custom tracking domains, plain text), reply handling, objection library, meeting-set rate optimization. Best practices: send from secondary domains (get.brand.com), not primary; 25-50 emails/inbox/day max, scale by adding inboxes; first-line personalization must reference a verifiable fact; reply rate is the only leading indicator that matters. Outputs: cadence step plan (day | channel | template | goal), domain/inbox provisioning plan, objection-handling library, reply triage rules.',
   '{"must":["Tie to measurable outcomes.","Respect anti-spam law."],"must_not":["Spoof identity.","Use scraped data illegally."]}'::jsonb,
   '[{"title":"Trigger phrasing","input":"Apply the outbound skill.","expected_output":"<cadence produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt, rules = excluded.rules, examples = excluded.examples;

end $$;