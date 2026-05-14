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
     'You are a specialist agent for the "ad-creative" skill, ported from the open-design project (nexu-io/open-design). Generate and iterate ad creative including headlines, descriptions, and primary text. Useful for paid social and search ad iteration. Upstream: https://github.com/coreyhaines31/skills',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io) when surfacing this skill provenance."],"must_not":["Claim authorship of the upstream skill.","Drop required output sections from the SKILL.md spec."]}'::jsonb,
     '[{"title":"Trigger phrasing","input":"Apply this skill to my current project.","expected_output":"<produces the artifact described in the upstream SKILL.md>"},{"title":"Out-of-scope","input":"Help me file my taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-artifacts-builder', 'Artifacts Builder', 'skill', '@open-design', true,
     'Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend stacks (React, Tailwind, shadcn/ui).',
     'Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend stacks (React, Tailwind, shadcn/ui).',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name, description = excluded.description, long_description = excluded.long_description,
        review_status = 'approved', is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "artifacts-builder" skill, ported from open-design (nexu-io). Build elaborate multi-component HTML artifacts using React, Tailwind, and shadcn/ui. Upstream: https://github.com/ComposioHQ/awesome-claude-skills/tree/master/artifacts-builder',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Drop required output sections."]}'::jsonb,
     '[{"title":"Trigger","input":"Build an artifact for X.","expected_output":"<artifact per SKILL.md>"},{"title":"Out-of-scope","input":"Help me file taxes.","expected_output":"Out of scope; suggest another skill."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-brainstorming', 'Brainstorming', 'skill', '@open-design', true,
     'Transform rough ideas into fully-formed designs through structured questioning and alternative exploration.',
     'Transform rough ideas into fully-formed designs through structured questioning and alternative exploration. Useful early in concept work.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name, description = excluded.description, long_description = excluded.long_description,
        review_status = 'approved', is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "brainstorming" skill, ported from open-design (nexu-io). Transform rough ideas into fully-formed designs through structured questioning. Upstream: https://github.com/obra/superpowers',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Drop required output sections."]}'::jsonb,
     '[{"title":"Trigger","input":"Brainstorm names for my product.","expected_output":"<structured exploration per SKILL.md>"},{"title":"Out-of-scope","input":"Help me file taxes.","expected_output":"Out of scope."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-brand-guidelines', 'Brand Guidelines', 'skill', '@open-design', true,
     'Apply official brand colors and typography to artifacts for consistent visual identity.',
     'Apply official brand colors and typography to artifacts for consistent visual identity and professional design standards. A reference for shaping your own brand system.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name, description = excluded.description, long_description = excluded.long_description,
        review_status = 'approved', is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "brand-guidelines" skill, ported from open-design (nexu-io). Apply brand colors and typography for consistent identity. Upstream: https://github.com/anthropics/skills/tree/main/brand-guidelines',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Drop required output sections."]}'::jsonb,
     '[{"title":"Trigger","input":"Apply our brand to this artifact.","expected_output":"<branded output per SKILL.md>"},{"title":"Out-of-scope","input":"Help me file taxes.","expected_output":"Out of scope."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description,
     license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values
    ('od-canvas-design', 'Canvas Design', 'skill', '@open-design', true,
     'Create beautiful visual art in PNG and PDF documents using design philosophy and aesthetic principles.',
     'Create beautiful visual art in PNG and PDF documents using design philosophy and aesthetic principles for posters, illustrations, and static pieces.',
     'Apache-2.0', '0.1.0',
     ARRAY['agent:upgrade','registry:read'], true,
     'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update
    set name = excluded.name, description = excluded.description, long_description = excluded.long_description,
        review_status = 'approved', is_published = true
  returning id into v_pkg_id;

  insert into public.package_versions
    (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values
    (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
     'You are a specialist agent for the "canvas-design" skill, ported from open-design (nexu-io). Create beautiful PNG/PDF visual art using design philosophy. Upstream: https://github.com/anthropics/skills/tree/main/canvas-design',
     '{"must":["Follow the upstream SKILL.md contract precisely.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Drop required output sections."]}'::jsonb,
     '[{"title":"Trigger","input":"Design a poster for X.","expected_output":"<PNG/PDF per SKILL.md>"},{"title":"Out-of-scope","input":"Help me file taxes.","expected_output":"Out of scope."}]'::jsonb,
     '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;
end $$;