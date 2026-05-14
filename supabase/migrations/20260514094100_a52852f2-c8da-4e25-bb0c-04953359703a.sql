do $$
declare
  v_pkg_id uuid;
begin

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-paywall-upgrade-cro', 'Paywall Upgrade CRO', 'skill', '@open-design', true,
     'Optimize paywall and upgrade flows for conversion using behavioral copy, anchoring, and proof.', 'Optimize paywall, upgrade, and pricing flows for conversion using anchoring, decoy pricing, social proof, urgency, and behavioral copywriting.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the paywall-upgrade-cro skill, ported from open-design (nexu-io). Audit a paywall or upgrade flow and propose: anchoring/decoy pricing, plan ordering, social proof, urgency, copy rewrite, and friction reduction. Output: prioritized changes with hypothesis + expected lift.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Recommend dark patterns or non-disclosure of charges."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the paywall-upgrade-cro skill.","expected_output":"<audit + changes produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-pptx-generator', 'PPTX Generator', 'skill', '@open-design', true,
     'Generate polished PowerPoint (.pptx) decks from outlines with consistent layout and typography.', 'Generate polished PowerPoint (.pptx) decks from a structured outline with consistent layout, typography, color, and image placement. Useful for sales decks, internal updates, and client presentations.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the pptx-generator skill, ported from open-design (nexu-io). Take a structured outline (title, sections, bullets, image hints) and produce a polished .pptx deck with consistent master, palette, typography, and image placement. QA every slide before delivery.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip QA pass on every slide."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the pptx-generator skill.","expected_output":"<.pptx file produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-shadcn-ui', 'shadcn/ui', 'skill', '@open-design', true,
     'Use shadcn/ui correctly: install components, theme via CSS variables, and compose accessible UI.', 'Use shadcn/ui correctly: install components via the CLI, theme via CSS variables and Tailwind, compose accessible UI patterns, and follow Radix primitive contracts.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the shadcn-ui skill, ported from open-design (nexu-io). Use shadcn/ui correctly: install via the CLI, theme via CSS variables and Tailwind tokens, compose accessible UI patterns, and respect Radix primitive contracts (asChild, controlled vs uncontrolled, portal targets).',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Hand-roll components that already exist as shadcn/ui primitives."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the shadcn-ui skill.","expected_output":"<components + tokens produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-threejs', 'Three.js', 'skill', '@open-design', true,
     'Build performant Three.js scenes: scene/camera/renderer setup, materials, lights, and post-processing.', 'Build performant Three.js scenes: scene/camera/renderer setup, materials, lights, post-processing, GLTF loading, and resize/cleanup. Useful for hero 3D, product configurators, and interactive backgrounds.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the threejs skill, ported from open-design (nexu-io). Build performant Three.js scenes with correct scene/camera/renderer setup, PBR materials, lights, post-processing, GLTF loading, resize/cleanup, and prefers-reduced-motion fallback. Output: complete code module ready to mount.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Leak resources — always dispose geometries/materials/textures on unmount."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the threejs skill.","expected_output":"<scene module produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-ui-ux-pro-max', 'UI/UX Pro Max', 'skill', '@open-design', true,
     'Design end-to-end UI/UX flows with strong information architecture, hierarchy, and interaction states.', 'Design end-to-end UI/UX flows with strong information architecture, visual hierarchy, interaction states, and accessibility. Includes wireframes, prototypes, and interaction specs.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the ui-ux-pro-max skill, ported from open-design (nexu-io). Design end-to-end UI/UX flows: information architecture, wireframes, hierarchy, interaction states (default/hover/focus/active/disabled/loading/error), and accessibility. Output: flow diagram + screen specs + interaction notes.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip empty/loading/error states."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the ui-ux-pro-max skill.","expected_output":"<flows + specs produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-web-design-guidelines', 'Web Design Guidelines', 'skill', '@open-design', true,
     'Apply timeless web design guidelines: scale, contrast, spacing, alignment, and rhythm.', 'Apply timeless web design guidelines covering modular scale, color contrast (WCAG), spacing, alignment, vertical rhythm, and responsive composition.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the web-design-guidelines skill, ported from open-design (nexu-io). Apply timeless guidelines: modular type scale, WCAG contrast, 4/8px spacing system, alignment, vertical rhythm, and responsive composition. Output: review of the asset against each guideline + concrete fixes.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Suggest changes that break WCAG AA contrast."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the web-design-guidelines skill.","expected_output":"<review + fixes produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

end $$;