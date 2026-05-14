-- Import open-design skills batch
do $$
declare
  v_pkg_id uuid;
begin

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
    set name = excluded.name, description = excluded.description, long_description = excluded.long_description, review_status = 'approved', is_published = true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the color-expert skill, ported from open-design (nexu-io). Cover OKLCH/OKLAB color science, palette generation (analogous, triadic, tetradic, split-complementary, monochrome), WCAG contrast verification, color naming, pigment mixing, and historical color theory. Always cite source and produce a concrete palette with hex + OKLCH values, contrast pairs, and usage notes.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip required sections."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the color-expert skill.","expected_output":"<palette + tokens produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-copywriting', 'Copywriting', 'skill', '@open-design', true,
     'Write and rewrite marketing copy for landing pages, homepages, and ads', 'Write and rewrite marketing copy for landing pages, homepages, and ads. Useful as a copy chief partner during launches.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the copywriting skill, ported from open-design (nexu-io, curated from Corey Haines). Write and rewrite marketing copy for landing pages, homepages, and ads as a copy chief partner. Output: hero headline + subhead + CTA, 3 alternative headlines, supporting body, ad variants for paid social and search.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip required sections."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the copywriting skill.","expected_output":"<copy package produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-creative-director', 'Creative Director', 'skill', '@open-design', true,
     'AI creative director with recursive self-assessment and 20+ ideation methodologies (SIT, TRIZ, SCAMPER, Synectics).', 'AI creative director with recursive self-assessment, 20+ methodologies (SIT, TRIZ, Bisociation, SCAMPER, Synectics), 3-axis evaluation calibrated against Cannes/D&AD/HumanKind, and a 5-phase process from brief to presentation.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the creative-director skill, ported from open-design (nexu-io, curated from @smixs). Apply 20+ ideation methodologies (SIT, TRIZ, Bisociation, SCAMPER, Synectics), evaluate on 3 axes calibrated against Cannes/D&AD/HumanKind, and walk a 5-phase process from brief to presentation. Output: brief recap, 3-5 distinct concepts each with insight + idea + execution, evaluation matrix, recommended direction.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip required sections."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the creative-director skill.","expected_output":"<concepts + evaluation produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-design-brief', 'Design Brief', 'skill', '@open-design', true,
     'Parse a structured design brief into a concrete design spec across 8 dimensions (palette, accent, typography, display, layout, mood, density, constraints).', 'Parse a structured design brief written in I-Lang protocol or natural language into a concrete DESIGN.md across 8 orthogonal dimensions: palette, accent, typography, display, layout, mood, density, constraints. Eliminates ambiguity from vague requests.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the design-brief skill, ported from open-design (nexu-io). Accept I-Lang structured briefs or natural language; resolve every brief across 8 orthogonal dimensions (palette, accent, typography, display, layout, mood, density, exclude). Map symbolic values to concrete tokens (hex, font, scale). Output: a complete DESIGN.md ready for downstream skills.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Guess values outside the closed vocabulary — prompt for clarification instead."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the design-brief skill.","expected_output":"<DESIGN.md produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-design-consultation', 'Design Consultation', 'skill', '@open-design', true,
     'Build a complete design system from scratch with creative risks and realistic product mockups.', 'Build a complete design system from scratch with creative risks and realistic product mockups. Useful for kickoff workshops and brand-from-zero work.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the design-consultation skill, ported from open-design (nexu-io, curated from Garry Tan / gstack). Build a complete design system from scratch — palette, type, scale, components, motion — taking creative risks and producing realistic product mockups. Output: design system tokens, component sketches, and 2-3 mockup directions.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip required sections."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the design-consultation skill.","expected_output":"<design system + mockups>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-design-md', 'Design Md', 'skill', '@open-design', true,
     'Create and manage DESIGN.md files as a single source of truth for design tokens and visual rules.', 'Create and manage DESIGN.md files. Useful for capturing design direction, tokens, and visual rules in a single source of truth.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the design-md skill, ported from open-design (nexu-io, curated from Google Labs / Stitch). Create and maintain DESIGN.md as the single source of truth for design tokens (colors, type, spacing, radius, shadows), component rules, and motion. Output: a complete, well-structured DESIGN.md file.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip required sections."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the design-md skill.","expected_output":"<DESIGN.md produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

  insert into public.packages
    (slug, name, type, author_handle, author_verified, description, long_description, license, latest_version, scopes, is_published, source_kind, source_ref, review_status)
  values ('od-design-review', 'Design Review', 'skill', '@open-design', true,
     'Designer Who Codes: visual audit then fixes with atomic commits and before/after screenshots.', 'Designer Who Codes: visual audit then fixes with atomic commits and before/after screenshots. Useful for tightening shipped UI before launch.',
     'Apache-2.0', '0.1.0', ARRAY['agent:upgrade','registry:read'], true, 'github', 'github.com/nexu-io/open-design', 'approved')
  on conflict (slug) do update set name=excluded.name, description=excluded.description, long_description=excluded.long_description, review_status='approved', is_published=true
  returning id into v_pkg_id;
  insert into public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
  values (v_pkg_id, '0.1.0', 'stable', 'Ported from nexu-io/open-design',
   'You are a specialist agent for the design-review skill, ported from open-design (nexu-io, curated from Garry Tan / gstack). Act as a Designer Who Codes: perform a visual audit of shipped UI, identify spacing, type, contrast, alignment, and hierarchy issues, then ship fixes as atomic commits with before/after screenshots. Output: prioritized findings list + commit plan.',
   '{"must":["Follow the SKILL.md contract.","Cite open-design (nexu-io)."],"must_not":["Claim authorship.","Skip required sections."]}'::jsonb,
   '[{"title":"Trigger","input":"Apply the design-review skill.","expected_output":"<audit + fixes produced>"}]'::jsonb,
   '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"},{"runtime":"cursor","status":"supported"}]'::jsonb)
  on conflict (package_id, version) do update set system_prompt = excluded.system_prompt;

end $$;