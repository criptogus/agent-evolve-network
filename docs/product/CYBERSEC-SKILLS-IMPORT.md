# Importing Cybersecurity Skills → Super Agent Skill

> Source: [`mukul975/Anthropic-Cybersecurity-Skills`](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
> 754 skills · 26 domains · mapped to MITRE ATT&CK / D3FEND / ATLAS, NIST CSF 2.0 & AI RMF · **License: Apache-2.0** · `agentskills.io` format (`SKILL.md` + YAML frontmatter).

This is a high-quality, framework-mapped corpus that fits our **verticalized security positioning** (we already ship OWASP, recon, OSINT, forensics, incident-response). It is **not** a drop-in: their `SKILL.md` is a procedural doc (frontmatter + *When to Use / Workflow / Output Format*), while ours is a typed contract (`system_prompt` + `rules.must/must_not` + ≥2 input→output `examples`, schema-validated, then adversarially tested + Trust-scored). So every import goes **through our upskilling pipeline** — it is adapted, hardened, and scored, not copy-pasted.

## 1. Licensing (must-do)
- Upstream is **Apache-2.0** → we may redistribute/adapt **with attribution** and a statement of changes.
- For each imported package set `license: Apache-2.0`, credit the upstream in `authors` / `created_by`, and add an attribution line in `agent_footer`.
- Add the upstream to a repo-level `NOTICE` (Apache-2.0 §4). Do **not** relabel as CC-BY-SA.

## 2. Don't duplicate what we have
We already ship these security skills — **skip / merge**, don't re-import:
`owasp-code-audit`, `recon-attack-surface`, `osint-investigator`, `disk-image-forensics`, `dependency-vuln-auditor`, `cloud-misconfig-auditor`, `incident-response-triage`, `prompt-injection-tester`.

## 3. Skill vs Playbook routing
Their procedural multi-step "Workflow Step 1..6" skills map better to **our Playbooks** (decision graph). The single-capability ones map to **Skills**. Rule of thumb:
- Has a strict input→output contract and one job → **Skill**.
- Orchestrates several steps/tools with branches → **Playbook**.

## 4. Curated first wave (avoid dumping 754)
Bring depth where we're thin and demand is high. Proposed **3 packs** (~8–12 packages each):

### Pack A — **Blue Team SOC & Detection** 🛡️
Detection engineering + triage. From domains: SOC Operations, Threat Hunting, Security Operations, Phishing Defense.
- `sigma-detection-engineer` (skill) ⭐ seeded
- `pcap-triage-analyst` (skill) ⭐ seeded
- `siem-alert-triage` (playbook)
- `dns-tunneling-hunter` (skill)
- `phishing-email-analyzer` (skill)
- `windows-event-log-investigator` (skill)

### Pack B — **Cloud, Container & Kubernetes Security** ☁️
From: Cloud Security (60), Container Security (30), API Security (28), Zero Trust.
- `kubernetes-security-auditor` (skill) ⭐ seeded
- `azure-activity-log-threat-hunter` (skill)
- `aws-iam-privilege-escalation-auditor` (skill)
- `container-image-cve-triage` (skill) — coordinate with existing `dependency-vuln-auditor`
- `api-authz-tester` (skill)

### Pack C — **Offensive / Red Team & AD** 🔴
From: Red Teaming, Penetration Testing, Identity & Access Management.
- `active-directory-acl-abuse-analyst` (skill)
- `kerberoasting-playbook` (playbook)
- `web-app-pentest-recon` (skill) — coordinate with existing `recon-attack-surface`
- `privilege-escalation-linux` (skill)

> A 4th pack — **DFIR (Digital Forensics & IR)** — is a natural follow-up (Digital Forensics 37 + Malware Analysis 39), coordinating with our existing `disk-image-forensics`.

## 5. The upskilling pipeline (per package)
1. **Convert** `SKILL.md` → our schema YAML in `content/skills/` (system_prompt from Workflow+Output Format; `rules.must/must_not` from the safety/constraints; author ≥2 `examples` with real input→output; carry `tags` incl. the MITRE/NIST mapping; `license: Apache-2.0` + attribution).
2. **Validate** locally: `bun run validate:content` (schema gate).
3. **Sync** to the registry: `bun run sync:content`.
4. **Upskill (SkillForge)**: research → adversarial harness (now with the LLM-judge ensemble + κ) → Trust Score v2. Only packages that clear the adversarial bar publish.
5. **Bundle** into a pack: insert `packs` + `pack_items` (DB) once member packages are published (admin UI or a seed migration keyed by slug).

## 6. What's seeded in this PR
Three converted, schema-shaped starter skills (one per pack), faithfully adapted and Apache-2.0-attributed, ready to run through steps 2–5:
- `content/skills/sigma-detection-engineer.yaml`
- `content/skills/pcap-triage-analyst.yaml`
- `content/skills/kubernetes-security-auditor.yaml`

These are the template for batch-converting the rest. **Packs are created after** their member skills publish (packs are DB rows, not files) — do that via the admin Wizard or a follow-up seed migration once `sync:content` + review have run.

## 7. Recommended sequencing
1. Land the 3 seeds → validate → sync → Forge → confirm Trust Scores.
2. Batch-convert the rest of Pack A (highest demand: SOC/detection), then B, then C.
3. Create the packs in DB; feature Pack A as a launch pack.
4. Add the MITRE/NIST framework tags as marketplace filters (small UI follow-up) — a strong differentiator for enterprise security buyers.
