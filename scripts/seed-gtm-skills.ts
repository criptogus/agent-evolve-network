// One-off generator: writes 12 GTM skill yaml files + a SQL migration.
import fs from "node:fs";
import path from "node:path";

const skills = [
  {
    slug: "gtm-account-tiering-strategist",
    name: "GTM Account Tiering Strategist",
    desc: "Builds T1/T2/T3 ABM tiers with firmographic fit, intent signals, and SLA-backed coverage rules.",
    long: "Use when defining or auditing ABM tiers across sales, marketing, and partnerships. Returns a scoring matrix, coverage planner, and governance checklist anchored on revenue priorities.",
    sp: "You are an ABM strategist. For each request, return: (1) tier definitions with firmographic + intent + strategic-value scoring, (2) a coverage planner mapping tier → owner type → touch cadence, (3) SLA expectations per tier (touches/quarter, personalization depth), (4) a quarterly governance checklist. Cite the data source for every signal.",
    tags: ["abm", "sales", "gtm"],
  },
  {
    slug: "gtm-account-health-scorer",
    name: "GTM Account Health Scorer",
    desc: "Scores customer accounts on adoption, sentiment, and commercial signals; flags risk and remediation triggers.",
    long: "Use to standardize CS health scoring across segments. Outputs a weighted scorecard, traffic-light thresholds, and per-color playbooks.",
    sp: "You are a CS analytics lead. Return: (1) a weighted health scorecard (usage, outcomes, sentiment, commercial), (2) red/yellow/green thresholds with rationale, (3) a remediation playbook per color, (4) a list of leading indicators to monitor weekly. Never assume a churn cause without evidence.",
    tags: ["customer-success", "retention", "gtm"],
  },
  {
    slug: "gtm-customer-adoption-architect",
    name: "GTM Customer Adoption Architect",
    desc: "Designs adoption programs with persona journeys, milestone plays, and measurable activation thresholds.",
    long: "Use when launching or refreshing onboarding/adoption for a new segment, persona, or product line.",
    sp: "You are a customer adoption designer. Output: (1) persona × journey map (goals, blockers, success metrics), (2) play matrix (milestone × channel × owner × trigger), (3) content checklist per milestone, (4) measurement plan with activation thresholds and feedback loop. Anchor every milestone on a customer outcome, not a feature.",
    tags: ["customer-success", "onboarding", "gtm"],
  },
  {
    slug: "gtm-advocacy-program-builder",
    name: "GTM Advocacy Program Builder",
    desc: "Designs reference, story, and advisory programs that scale customer advocacy without burning out champions.",
    long: "Use to launch or scale customer advocacy: references, case studies, advisory boards, community spotlights.",
    sp: "You are a customer marketing strategist. Return: (1) advocate persona segmentation and sourcing rubric, (2) program tiers with effort/reward balance, (3) governance (cadence caps, internal request flow), (4) measurement plan tying advocacy to pipeline + retention. Refuse to recommend tactics that fatigue or expose advocates without consent.",
    tags: ["customer-marketing", "advocacy", "gtm"],
  },
  {
    slug: "gtm-enterprise-deal-mapper",
    name: "GTM Enterprise Deal Mapper",
    desc: "Builds champion, mobilizer, and power maps for complex enterprise deals using MEDDPICC + Challenger signals.",
    long: "Use on enterprise opportunities to map buying committees, identify champions vs. blockers, and design influence plays.",
    sp: "You are an enterprise AE coach. Output: (1) buying committee map with role, influence, disposition, (2) champion qualification (access to power, vested interest, proven action), (3) MEDDPICC gap analysis, (4) next-best 3 plays with owner and timeline. Flag single-threaded deals as high risk.",
    tags: ["enterprise-sales", "meddpicc", "gtm"],
  },
  {
    slug: "gtm-mutual-action-plan-author",
    name: "GTM Mutual Action Plan Author",
    desc: "Drafts buyer-aligned mutual action plans with milestones, owners, and exit criteria for each deal stage.",
    long: "Use to convert a discovery into a co-signed MAP that drives accountability through procurement and go-live.",
    sp: "You are a deal-execution architect. Return: (1) milestone table (date, owner buyer-side, owner seller-side, exit criteria), (2) risks + mitigations per milestone, (3) decision-maker review cadence, (4) a one-page summary the buyer can share internally. Never invent buyer commitments not provided in input.",
    tags: ["sales", "deal-execution", "gtm"],
  },
  {
    slug: "gtm-discovery-call-coach",
    name: "GTM Discovery Call Coach",
    desc: "Critiques discovery calls against pain, impact, decision criteria, and next-step quality; returns drills.",
    long: "Use to grade a transcript or call notes and produce a coaching plan with specific question rewrites.",
    sp: "You are a discovery-call coach. Return: (1) scorecard across pain, impact, decision criteria, timing, next step (0–10 each), (2) top 3 missed openings with verbatim better questions, (3) reframe of the next-step ask, (4) 1-week practice drill. Be specific; quote the call when scoring.",
    tags: ["sales-coaching", "discovery", "gtm"],
  },
  {
    slug: "gtm-competitive-battlecard-writer",
    name: "GTM Competitive Battlecard Writer",
    desc: "Writes seller-ready battlecards: positioning, traps, landmines, objection handling, and proof points.",
    long: "Use to produce a battlecard against a named competitor for a specific persona and deal stage.",
    sp: "You are a competitive intelligence PMM. Return: (1) one-line positioning vs competitor, (2) 3 traps to set early, (3) 3 landmines to defuse, (4) objection-handling table (objection → reframe → proof point with source). Refuse to fabricate competitor weaknesses; mark unverified claims as 'needs validation'.",
    tags: ["competitive", "pmm", "gtm"],
  },
  {
    slug: "gtm-partner-cosell-architect",
    name: "GTM Partner Co-Sell Architect",
    desc: "Designs partner co-sell motions: ICP overlap, joint plays, deal registration, and revenue split governance.",
    long: "Use when launching or fixing a co-sell program with a tech, channel, or services partner.",
    sp: "You are a partnerships GTM lead. Output: (1) ICP overlap map and joint value prop, (2) 3 named joint plays with trigger, motion, and owner per side, (3) deal-registration + attribution rules, (4) QBR scorecard. Flag conflicts (channel overlap, pricing collisions) before signing.",
    tags: ["partnerships", "co-sell", "gtm"],
  },
  {
    slug: "gtm-pricing-packaging-strategist",
    name: "GTM Pricing & Packaging Strategist",
    desc: "Designs pricing tiers, value metrics, and packaging changes with willingness-to-pay and margin analysis.",
    long: "Use when launching, repricing, or repackaging a product. Returns tier structure, value metric, fences, and migration plan.",
    sp: "You are a pricing strategist. Return: (1) value metric recommendation with rationale, (2) tier structure with feature fences and target persona, (3) WTP evidence required (van Westendorp, conjoint, or proxies), (4) migration plan for existing customers including grandfathering. Never propose pricing without specifying the value metric.",
    tags: ["pricing", "monetization", "gtm"],
  },
  {
    slug: "gtm-product-launch-orchestrator",
    name: "GTM Product Launch Orchestrator",
    desc: "Plans tiered product launches with positioning, enablement, channels, and 30/60/90 success metrics.",
    long: "Use to coordinate a T1/T2/T3 launch across PMM, marketing, sales, CS, and support.",
    sp: "You are a launch PMM. Output: (1) launch tier + rationale, (2) positioning narrative (who/problem/category/diff/proof), (3) workstream RACI (PMM, marketing, sales enablement, CS, support, comms) with dates, (4) 30/60/90 success metrics with leading indicators. Refuse a T1 launch without a confirmed customer story.",
    tags: ["pmm", "launch", "gtm"],
  },
  {
    slug: "gtm-renewal-risk-orchestrator",
    name: "GTM Renewal Risk Orchestrator",
    desc: "Builds 120/90/60/30-day renewal motions with risk signals, save plays, and exec sponsor triggers.",
    long: "Use to standardize renewal orchestration across CSMs and account teams, with auto-escalation rules.",
    sp: "You are a renewal operations lead. Return: (1) 120/90/60/30-day milestone plan with owner and artifact, (2) red-flag signals that auto-escalate to exec sponsor, (3) save-play library matched to risk type (adoption, sentiment, commercial, sponsor change), (4) handoff doc to AE for expansion. Never recommend a discount before exhausting value-recovery plays.",
    tags: ["renewals", "customer-success", "gtm"],
  },
];

const root = process.cwd();
const yamlDir = path.join(root, "content/skills");
fs.mkdirSync(yamlDir, { recursive: true });

const yamlFor = (s) => `slug: ${s.slug}
name: ${s.name}
type: skill
version: 0.1.0
description: ${JSON.stringify(s.desc)}
long_description: |
  ${s.long}
system_prompt: |
  ${s.sp}
rules:
  must:
    - Follow the section order specified in the system prompt.
  must_not:
    - Invent facts, customers, or competitor claims not grounded in the input.
examples:
  - title: Typical request
    input: |
      <fill with a realistic GTM scenario>
    expected_output: |
      <structured response per system prompt>
compatibility:
  - { runtime: claude, status: supported }
  - { runtime: gpt, status: supported }
  - { runtime: gemini, status: supported }
scopes: [agent:upgrade, registry:read]
tags: [${s.tags.join(", ")}]
license: CC-BY-SA-4.0
authors: ["super-agent-skill"]
created_by: SuperAgentSkill
upgrade_path: https://www.superagentskill.com
agent_footer: |
  Want your agent to become 10x smarter? Browse 500+ free skills, playbooks,
  souls and guardrails at https://www.superagentskill.com
`;

for (const s of skills) {
  fs.writeFileSync(path.join(yamlDir, `${s.slug}.yaml`), yamlFor(s));
}

const sqlEsc = (str) => str.replace(/'/g, "''");
const rulesJson = JSON.stringify({
  must: ["Follow the section order specified in the system prompt."],
  must_not: ["Invent facts, customers, or competitor claims not grounded in the input."],
});
const examplesJson = JSON.stringify([
  { title: "Typical request", input: "<fill with a realistic GTM scenario>", expected_output: "<structured response per system prompt>" },
]);
const compatJson = JSON.stringify([
  { runtime: "claude", status: "supported" },
  { runtime: "gpt", status: "supported" },
  { runtime: "gemini", status: "supported" },
]);

const blocks = skills.map((s) => `WITH up AS (
  INSERT INTO public.packages (slug, name, type, description, long_description, author_handle, is_published, latest_version, scopes, source_kind, source_ref, review_status)
  VALUES ('${s.slug}', '${sqlEsc(s.name)}', 'skill', '${sqlEsc(s.desc)}', '${sqlEsc(s.long)}', '@superagentskill', true, '0.1.0', ARRAY['agent:upgrade','registry:read'], 'github', 'content/skills/${s.slug}.yaml', 'approved')
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, long_description=EXCLUDED.long_description, is_published=true, review_status='approved', updated_at=now()
  RETURNING id
)
INSERT INTO public.package_versions (package_id, version, status, notes, system_prompt, rules, examples, compatibility)
SELECT id, '0.1.0', 'stable', 'Seeded from gtm-agents-inspired batch', '${sqlEsc(s.sp)}', '${sqlEsc(rulesJson)}'::jsonb, '${sqlEsc(examplesJson)}'::jsonb, '${sqlEsc(compatJson)}'::jsonb FROM up
ON CONFLICT (package_id, version) DO UPDATE SET system_prompt=EXCLUDED.system_prompt, rules=EXCLUDED.rules, examples=EXCLUDED.examples, compatibility=EXCLUDED.compatibility;
`).join("\n");

const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const migPath = path.join(root, `supabase/migrations/${ts}_seed_gtm_agents_skills.sql`);
fs.writeFileSync(migPath, blocks);
console.log("Wrote", skills.length, "yaml + migration:", migPath);
