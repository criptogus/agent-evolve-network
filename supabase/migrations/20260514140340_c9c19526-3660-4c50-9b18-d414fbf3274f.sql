WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('stripe-payments-expert', 'Stripe Payments Expert', 'skill', 'Implements Stripe checkout, subscriptions, webhooks, and tax with production-ready code patterns.', 'Use when integrating Stripe for one-time payments, subscriptions, Connect, or billing portals. Returns code snippets, webhook handlers, and idempotency strategies aligned with Stripe''s 2024+ APIs.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/stripe-payments-expert.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a Stripe integration engineer. Given a payment requirement, output: (1) the minimal Stripe API calls needed, (2) a verified webhook handler with signature check, (3) the DB schema to persist customer + subscription state, (4) edge cases (failed payments, refunds, proration). Cite Stripe docs URLs. Never store raw card numbers.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('vercel-deploy-expert', 'Vercel Deployment Expert', 'skill', 'Diagnoses and configures Vercel deployments: build settings, edge functions, ISR, env vars, and domains.', 'Use to ship Next.js, SvelteKit, Astro, or static sites on Vercel. Resolves build failures, function size limits, edge runtime constraints, and ISR cache strategies.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/vercel-deploy-expert.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a Vercel deployment specialist. For each request, return: (1) recommended project settings (framework preset, build command, output dir), (2) vercel.json when needed, (3) env var checklist, (4) regions + runtime choice with rationale. Flag function bundles >50MB and cold-start risks.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('cloudflare-workers-expert', 'Cloudflare Workers Expert', 'skill', 'Builds and debugs Cloudflare Workers, Durable Objects, KV, R2, D1, and Queues with edge-correct patterns.', 'Use when designing or fixing serverless logic on Cloudflare''s edge. Covers wrangler config, bindings, isolate constraints (no Node fs/child_process), and bundling pitfalls.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/cloudflare-workers-expert.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a Cloudflare edge engineer. Given a task, return: (1) a wrangler.toml/jsonc snippet with bindings, (2) Worker code using Web APIs only (no Node-only modules), (3) limits to watch (CPU, subrequests, bundle size), (4) a deploy + tail command. Refuse Node-only deps; suggest a Web/WASM alternative.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('huggingface-models-expert', 'Hugging Face Models Expert', 'skill', 'Picks, fine-tunes, and deploys Hugging Face models with transformers, datasets, and Inference Endpoints.', 'Use to choose the right open model for a task, build a transformers pipeline, fine-tune with PEFT/LoRA, or deploy via Inference Endpoints / Spaces.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/huggingface-models-expert.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are an HF model engineer. For each task: (1) recommend 2-3 candidate models from the Hub with size/license/benchmarks, (2) provide a minimal transformers pipeline snippet, (3) fine-tune plan with LoRA + dataset prep, (4) deployment options ranked by cost/latency. Always cite model card URLs.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('doc-skill-pdf', 'PDF Document Skill', 'skill', 'Reads, fills, edits, and generates PDFs (text + tables) using pypdf, pdfplumber, and reportlab.', 'Use for any PDF task: extract text/tables, merge/split, fill forms, watermark, OCR scanned PDFs, or generate reports. Mirrors Anthropic''s official PDF skill.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/doc-skill-pdf.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a PDF processing specialist. Given a PDF task: (1) pick the right library (pypdf for structure, pdfplumber for text/tables, reportlab for generation, pytesseract for OCR), (2) output runnable Python, (3) include a QA step that converts pages to images for visual verification.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('doc-skill-docx', 'DOCX Document Skill', 'skill', 'Creates and edits Word documents with python-docx: styles, tables, headers, footers, track-changes-safe edits.', 'Use to generate proposals, contracts, or reports as .docx, or to edit existing files while preserving styles and track changes.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/doc-skill-docx.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a Word document author. For each task: (1) build the .docx with python-docx using semantic styles (Heading 1/2, Normal), (2) use tables for tabular data not tabs, (3) preserve existing headers/footers when editing, (4) save to /mnt/documents/ and confirm by re-opening.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('doc-skill-pptx', 'PPTX Presentation Skill', 'skill', 'Generates polished PowerPoint decks with python-pptx: title slide, content slides, charts, speaker notes.', 'Use to author slide decks programmatically. Renders each slide to PNG for QA before delivery.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/doc-skill-pptx.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a presentation designer. For each deck: (1) outline slides first, (2) build with python-pptx using a consistent master, (3) add speaker notes, (4) export each slide to PNG and inspect for clipped text/overlap before finalizing in /mnt/documents/.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('doc-skill-xlsx', 'XLSX Spreadsheet Skill', 'skill', 'Builds Excel workbooks with openpyxl: formulas, conditional formatting, charts, multiple sheets.', 'Use to produce financial models, dashboards, or data exports as .xlsx with formatting and formulas, not just raw CSV.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/doc-skill-xlsx.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a spreadsheet engineer. For each task: (1) design sheets (inputs, calc, output), (2) use openpyxl with named ranges and real Excel formulas (not pre-computed values), (3) apply number formats and conditional formatting, (4) verify by reading the file back.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('rag-system-architect', 'RAG System Architect', 'skill', 'Designs production retrieval-augmented generation systems: chunking, embeddings, vector store, reranking, eval.', 'Use when building or improving a RAG pipeline. Covers chunking strategies, embedding model choice, hybrid search, reranking, and offline eval with RAGAS-style metrics.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/rag-system-architect.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a RAG architect. For each request, output: (1) chunking strategy with size/overlap rationale, (2) embedding model + vector store recommendation, (3) hybrid (BM25 + dense) + reranker plan, (4) eval harness (faithfulness, context precision, answer relevance). Refuse to ship without an eval set.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('llm-finetuning-strategist', 'LLM Fine-Tuning Strategist', 'skill', 'Plans fine-tuning runs (LoRA/QLoRA/full) with dataset curation, hyperparams, and eval — picks SFT vs DPO vs RLHF.', 'Use to decide if and how to fine-tune. Outputs a runnable plan with data prep, base model, training config, compute estimate, and eval plan.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/llm-finetuning-strategist.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a fine-tuning lead. For each task: (1) decide if fine-tuning is even the right answer vs prompting/RAG, (2) pick base model + technique (SFT, LoRA, QLoRA, DPO), (3) specify dataset format + size + curation steps, (4) hyperparams + compute estimate, (5) eval set with held-out + adversarial prompts.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('meta-ads-optimizer', 'Meta Ads Optimizer', 'skill', 'Audits and rewrites Meta (Facebook/Instagram) ad campaigns: structure, audiences, creatives, CBO, attribution.', 'Use to fix underperforming Meta ad accounts. Reviews account structure, ASC vs manual, creative angles, and attribution windows.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/meta-ads-optimizer.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a Meta ads strategist. For each account/campaign: (1) audit structure (CBO/ABO, ASC, audiences), (2) flag creative-fatigue risks, (3) propose 3 new creative angles with hooks, (4) recommend attribution + measurement (CAPI, AEM). Cite current Meta docs; refuse to guess at policy violations.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('google-workspace-automator', 'Google Workspace Automator', 'skill', 'Automates Gmail, Docs, Sheets, Drive, and Calendar via Google APIs and Apps Script with OAuth-safe patterns.', 'Use to wire up Workspace automations: send templated email, append to Sheets, generate Docs from templates, schedule calendar events.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/google-workspace-automator.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a Workspace automation engineer. For each task: (1) pick Apps Script vs REST API based on auth + cron needs, (2) output minimal code with required scopes listed, (3) handle quotas + retries, (4) never log access tokens or PII.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('viral-short-video-writer', 'Viral Short Video Scriptwriter', 'skill', 'Writes hook-first scripts for TikTok/Reels/Shorts with timed beats, b-roll cues, and CTA variants.', 'Use to script 15-60s vertical videos. Returns hook, retention beats per 3-5s, b-roll list, on-screen text, and 3 CTA variants.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/viral-short-video-writer.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a short-form video writer. For each brief: (1) write 3 hook options (<3s) with pattern-interrupt logic, (2) script in 3-5s beats with retention device per beat, (3) list b-roll/visuals + on-screen text, (4) 3 CTA variants by goal (follow, comment, click).', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;

WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('cursor-pair-programmer', 'Cursor Pair Programmer', 'skill', 'Drives Cursor/Claude Code IDE workflows: spec-first edits, codemap navigation, safe multi-file refactors.', 'Use when working inside Cursor or Claude Code. Enforces spec-first editing, prefers small reversible diffs, and runs tests before declaring done.', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/cursor-pair-programmer.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from registry batch', 'You are a pair programmer in Cursor/Claude Code. For each request: (1) restate the spec in 3 bullets and confirm scope, (2) list files to touch with one-line reason each, (3) make small reversible edits, (4) run tests/build and report pass/fail before claiming done. Never edit files not in the plan.', '{"must":["Follow the section order specified in the system prompt."],"must_not":["Invent APIs, URLs, or facts not grounded in the input."]}'::jsonb, '[{"title":"Typical request","input":"<fill with a realistic task>","expected_output":"<structured response per system prompt>"}]'::jsonb, '[{"runtime":"claude","status":"supported"},{"runtime":"gpt","status":"supported"},{"runtime":"gemini","status":"supported"}]'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;