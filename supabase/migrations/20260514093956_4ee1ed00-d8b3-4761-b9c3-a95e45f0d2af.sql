do $$
declare
  v_pkg_id uuid;
begin

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-domain-name-brainstormer', 'Domain Name Brainstormer', 'skill', '@open-design', true,
     'Generate creative domain name ideas and check availability across multiple TLDs (.com, .io, .dev, .ai).', 'Generate creative domain name ideas and check availability across multiple TLDs including .com, .io, .dev, and .ai.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the domain-name-brainstormer skill, ported from open-design (nexu-io, ComposioHQ awesome-claude-skills). Generate 20-40 creative domain candidates grouped by approach (literal, metaphor, portmanteau, invented), check availability across .com/.io/.dev/.ai, and recommend the top 5 with rationale.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip required sections."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the domain-name-brainstormer skill.","expected_output":"<candidates + availability + top 5>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-enhance-prompt', 'Enhance Prompt', 'skill', '@open-design', true,
     'Improve prompts with design specs and UI/UX vocabulary.', 'Improve prompts with design specs and UI/UX vocabulary. Useful for design-to-code workflows and clarifying requests for visual output.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the enhance-prompt skill, ported from open-design (nexu-io, Google Labs / Stitch). Take a vague design request and rewrite it with precise UI/UX vocabulary, dimensions, tokens, and references. Output: enhanced prompt + the deltas you added.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Add unstated requirements without flagging them."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the enhance-prompt skill.","expected_output":"<enhanced prompt produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-faq-page', 'FAQ Page', 'skill', '@open-design', true,
     'Build a Frequently Asked Questions page with collapsible accordions, search, and category filtering.', 'A Frequently Asked Questions (FAQ) page with collapsible accordion sections, search functionality, and category filtering. Use when the brief asks for FAQ, help center, questions, or support page.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the faq-page skill, ported from open-design (nexu-io). Read the active DESIGN.md, write 12-18 realistic FAQs across 3-4 categories, and produce a single accordion page with search and category filtering. For 1-5 FAQs skip categories and search; for very long answers split into paragraphs/bullets.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip required sections."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the faq-page skill.","expected_output":"<FAQ page produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-frontend-design', 'Frontend Design', 'skill', '@open-design', true,
     'Translate a design brief into production frontend code (HTML/CSS/React) with tokens and components.', 'Translate a design brief or DESIGN.md into production frontend code (HTML/CSS/React/Tailwind) with proper tokens, components, and accessibility.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the frontend-design skill, ported from open-design (nexu-io). Read the active DESIGN.md and emit production-ready frontend code: tokens (CSS variables), primitive components (Button, Input, Card), and a sample page. Respect accessibility (focus states, contrast, semantic HTML).',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Hardcode values that should reference tokens."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the frontend-design skill.","expected_output":"<tokens + components + page produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-gsap-core', 'GSAP Core', 'skill', '@open-design', true,
     'Build performant GSAP animations: timelines, eases, stagger, and best practices.', 'Build performant GSAP animations using timelines, eases, stagger, and tween best practices. Useful for hero animations, micro-interactions, and SVG motion.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the gsap-core skill, ported from open-design (nexu-io). Build performant GSAP animations: timelines, custom eases, stagger, From/To/FromTo, callback hooks, and prefers-reduced-motion handling. Output: complete code snippet ready to drop into the project.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Animate properties that trigger layout (left/top) when transform/opacity will do."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the gsap-core skill.","expected_output":"<animation code produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-gsap-scrolltrigger', 'GSAP ScrollTrigger', 'skill', '@open-design', true,
     'Build scroll-driven animations with GSAP ScrollTrigger: pinning, scrubbing, batch, and snap.', 'Build scroll-driven animations with GSAP ScrollTrigger: pinning, scrubbing, batch reveals, snap points, and section transitions. Useful for storytelling pages and immersive scroll experiences.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the gsap-scrolltrigger skill, ported from open-design (nexu-io). Build scroll-driven animations using ScrollTrigger: pinning, scrubbing, batch reveals, snap points, and chained section transitions. Always include cleanup, refresh hooks, and prefers-reduced-motion fallback.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Forget ScrollTrigger.refresh() after layout-affecting changes."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the gsap-scrolltrigger skill.","expected_output":"<scroll animation code produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-marketing-psychology', 'Marketing Psychology', 'skill', '@open-design', true,
     'Apply behavioral and persuasion principles (Cialdini, loss aversion, anchoring) to marketing copy and UI.', 'Apply behavioral and persuasion principles (Cialdini, loss aversion, anchoring, social proof, scarcity, reciprocity) to marketing copy and UI decisions.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the marketing-psychology skill, ported from open-design (nexu-io). Apply Cialdini principles (reciprocity, commitment, social proof, authority, liking, scarcity, unity), loss aversion, anchoring, and framing to marketing copy and UI flows. Output: principle-by-principle annotation of the asset + before/after rewrite.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Recommend dark patterns that mislead users."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the marketing-psychology skill.","expected_output":"<annotated rewrite produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

end $$;