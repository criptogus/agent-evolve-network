<div align="center">

<img src="https://www.superagentskill.com/og.png" alt="Super Agent Skill" width="640" />

# Super Agent Skill

### **The open network where AI agents learn new skills.**

> **We don't build AI agents. We evolve them.**
> Models are commodities. Infrastructure is a commodity. **Skills are the new moat.**

**500+ free skills, playbooks, souls and guardrails — one MCP endpoint away from any AI agent.**

Turn Claude, Cursor, Codex, Continue or any MCP-compatible agent into a domain specialist in **60 seconds**. No fine-tuning. No copy-pasting prompts. No vendor lock-in.

[![Website](https://img.shields.io/badge/🌐_superagentskill.com-Visit-0A66FF?style=for-the-badge)](https://www.superagentskill.com)
[![Marketplace](https://img.shields.io/badge/🛒_Browse_500+_packages-Free-8b5cf6?style=for-the-badge)](https://www.superagentskill.com/marketplace)
[![MCP](https://img.shields.io/badge/🔌_MCP_endpoint-Live-22c55e?style=for-the-badge)](https://www.superagentskill.com/api/mcp)

[![License: Apache 2.0](https://img.shields.io/badge/code-Apache_2.0-000?style=flat-square)](LICENSE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/content-CC_BY--SA_4.0-000?style=flat-square)](LICENSES/CONTENT-CC-BY-SA-4.0.txt)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff4f8b?style=flat-square)](CONTRIBUTING.md)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?style=flat-square)](https://www.superagentskill.com/community)

[**🌐 Website**](https://www.superagentskill.com) · [**🛒 Marketplace**](https://www.superagentskill.com/marketplace) · [**📚 Docs**](https://www.superagentskill.com/docs) · [**🔌 MCP**](https://www.superagentskill.com/api/mcp) · [**💬 Discord**](https://www.superagentskill.com/community)

</div>

---

## 📦 What's inside (today)

> **The registry is live and growing every week. All packages are free to download, fork and run.**

| Type | Count | Examples |
|---|---|---|
| 🛠 **Skills** | **370+** | code review, OWASP audit, SQL translator, OSINT, ECG triage, MEDDPICC discovery |
| 📘 **Playbooks** | **30+** | bug triage → fix → PR, content pipeline, incident response |
| 🎭 **Souls** | **50+** | pragmatic SRE, empathetic support, senior product designer |
| 🛡 **Guardrails** | **50+** | no-PII, no-medical-advice, GDPR, brand safety |

➡️ **[Browse the full marketplace at superagentskill.com →](https://www.superagentskill.com/marketplace)**

---

## ⚡ 60-second quickstart

### Option A — Plug it into your agent (recommended)

Point any MCP-compatible client at:

```
https://www.superagentskill.com/api/mcp
```

That's it. Your agent now has `discover` / `install` / `evaluate` tools and **live access to every skill in the registry** — including patches shipped overnight by SkillForge.

### Option B — Download a skill as a file (no account, free forever)

```bash
# Grab a single skill
curl -O https://raw.githubusercontent.com/criptogus/agent-evolve-network/main/content/skills/code-reviewer.yaml

# Or clone the whole library
git clone https://github.com/criptogus/agent-evolve-network.git
```

Drop the YAML into your agent's system prompt. Done.

### Option C — Need a skill that doesn't exist yet?

Go to **[superagentskill.com](https://www.superagentskill.com)**, describe what your agent should do (e.g. *"triage cardiology patients using the GRACE score"*) and the **Forge** will research, draft, adversarially test and publish a production-grade package — usually in under 5 minutes.

### Option D — Run the whole platform locally

```bash
bun install && bun run dev
```

---

## 🧠 Why Super Agent Skill?

Generic agents are jacks of all trades, masters of none. They hallucinate, drift, and forget the rules your team actually cares about.

We fix that with three ingredients you won't find anywhere else:

- 🌍 **An open, growing registry** of 500+ battle-tested skills, playbooks, souls and guardrails — community-owned, MIT/CC-friendly, embeddable anywhere.
- ⚙️ **SkillForge** — our continuous evolution loop benchmarks every skill against adversarial cases, finds weaknesses, and ships patches automatically. Your agent gets smarter while you sleep.
- 🔌 **One MCP endpoint** that streams the strongest version of every skill to any compatible agent — no copy-paste, no version drift, no vendor lock-in.

> *Think GitHub for prompts × npm for agent capabilities × Wikipedia for AI behavior — all under MCP.*

---

## 🧱 The four building blocks

| | What it is | Use it when… |
| --- | --- | --- |
| 🛠 **Skills** | A focused capability with system prompt, rules, examples and a runnable input → output contract | You want the agent to *do one thing* very well (review code, write SQL, summarize a meeting). |
| 📘 **Playbooks** | A multi-step decision graph that orchestrates skills + tools | The task has a recurring shape (triage bug → reproduce → propose fix → open PR). |
| 🎭 **Souls** | A persona / value bundle — voice, taste, defaults — that wraps any agent | You need a consistent brand, tone or worldview across all tasks. |
| 🛡 **Guardrails** | Refusal, safety and compliance policies enforced before output | You ship to real users and need hard "must / must not" rules. |

Each one is a single self-contained YAML file. **Read it, fork it, ship it.**

```
content/
├── skills/         → Single capabilities      (370+ on superagentskill.com)
├── playbooks/      → Multi-step workflows     (30+ on superagentskill.com)
├── souls/          → Personas and values      (50+ on superagentskill.com)
├── guardrails/     → Safety and compliance    (50+ on superagentskill.com)
└── schemas/        → JSON Schemas (every package validates against these)
```

> 💡 This GitHub repo is the **open seed** — the canonical, public-domain core. The full **500+ library** lives at [superagentskill.com/marketplace](https://www.superagentskill.com/marketplace), where SkillForge keeps it sharp.

---

## 🎯 Need to enrich a specific agent?

Whatever your agent does, there's almost certainly a package for it — or you can have one in minutes:

| If your agent is a… | Start here |
|---|---|
| **Coding assistant** | [code-reviewer](content/skills/code-reviewer.yaml), [owasp-code-audit](content/skills/owasp-code-audit.yaml), [dependency-vuln-auditor](content/skills/dependency-vuln-auditor.yaml) |
| **Security / red team** | [recon-attack-surface](content/skills/recon-attack-surface.yaml), [prompt-injection-tester](content/skills/prompt-injection-tester.yaml), [disk-image-forensics](content/skills/disk-image-forensics.yaml) |
| **SRE / DevOps** | [incident-response-triage](content/skills/incident-response-triage.yaml), [cloud-misconfig-auditor](content/skills/cloud-misconfig-auditor.yaml), [pragmatic-sre](content/souls/pragmatic-sre.yaml) |
| **Researcher / writer** | [web-research](content/skills/web-research.yaml), [long-form-writer](content/skills/long-form-writer.yaml), [osint-investigator](content/skills/osint-investigator.yaml) |
| **Customer support** | [empathetic-support](content/souls/empathetic-support.yaml), [no-pii-in-output](content/guardrails/no-pii-in-output.yaml) |
| **Anything else** | 👉 **[Search the marketplace →](https://www.superagentskill.com/marketplace)** or **[ask the Forge to build it](https://www.superagentskill.com/forge)** |

---

## 🚢 Ship your first skill in 4 steps

```bash
# 1. Fork & clone
git clone git@github.com:<you>/agent-evolve-network.git
cd agent-evolve-network && bun install

# 2. Start from a template
cp content/skills/_template.yaml content/skills/my-killer-skill.yaml

# 3. Validate locally (same script CI runs)
bun run validate:content

# 4. Open a PR — a maintainer reviews within 72h
```

A merged skill is automatically imported into the hosted registry, where **SkillForge starts evolving it against adversarial benchmarks** and serving the best variant through MCP to every connected agent on day one.

➡️ Full quality bar in [**CONTRIBUTING.md**](CONTRIBUTING.md).

---

## 💎 Why contribute?

Your work isn't just merged — it's *amplified*.

- 🌐 **Reach.** Every accepted package is served live through MCP to thousands of agents.
- 🏆 **Reputation.** Public **Trust Score**, model compatibility matrix and leaderboard rankings on the [marketplace](https://www.superagentskill.com/marketplace/rankings).
- 💸 **Revenue share.** Premium packages earn 80–85% of sales + recurring usage bonuses.
- 🤖 **AI co-author.** SkillForge proposes patches when your skill drifts — you stay in control, accept or reject.
- 🪪 **CVE-style credit.** Robustness findings (e.g. `SAS-2026-0001`) are publicly attributed.

> **First-time contributor?** Look for [`good first issue`](https://github.com/criptogus/agent-evolve-network/labels/good%20first%20issue) and [`help wanted`](https://github.com/criptogus/agent-evolve-network/labels/help%20wanted) — most are mergeable in one afternoon.

---

## 🆚 What makes this different

|  | Super Agent Skill | A prompt library on GitHub | A walled-garden GPT store |
| --- | :---: | :---: | :---: |
| Open content (CC BY-SA) | ✅ | ✅ | ❌ |
| Schema-validated quality bar | ✅ | ❌ | ⚠️ opaque |
| Works in *any* MCP agent | ✅ | ⚠️ manual paste | ❌ single vendor |
| Continuous adversarial evolution | ✅ | ❌ | ❌ |
| Public trust + compatibility scores | ✅ | ❌ | ❌ |
| Revenue share for authors | ✅ | ❌ | ⚠️ limited |
| One-line install via MCP | ✅ | ❌ | ❌ |

---

## 🗺 Roadmap

- [x] MCP server with discover / install / evaluate / report-execution tools
- [x] SkillForge evolution loop (eval → patch → re-score)
- [x] Public **Trust Score**, model compatibility matrix, drift detection
- [x] 500+ packages live in the hosted registry
- [ ] CLI (`npx sas init`, `sas publish`, `sas eval`)
- [ ] Cryptographically signed package releases
- [ ] Versioned downloadable registry bundles
- [ ] Community-curated **collections** (curated bundles around a use case)

Track everything on the [public board](https://github.com/criptogus/agent-evolve-network/projects).

---

## 👥 Community

- 💬 **Discord** — [join here](https://www.superagentskill.com/community) for help, design reviews, and weekly skill-jam events.
- 🐦 **X / Twitter** — [@superagentskill](https://twitter.com/superagentskill) for releases and benchmarks.
- 📰 **Changelog** — every accepted package is announced in [GitHub Releases](https://github.com/criptogus/agent-evolve-network/releases).
- 🛡 **Security** — please disclose responsibly via [SECURITY.md](SECURITY.md).

---

## 📜 License

- **Code** (this repo, outside `content/`): [Apache License 2.0](LICENSE)
- **Content** (everything in `content/`): [Creative Commons Attribution-ShareAlike 4.0](LICENSES/CONTENT-CC-BY-SA-4.0.txt)

By contributing you agree your work is licensed under the same terms — and that it gets to make millions of agent conversations a little smarter every day.

---

<div align="center">

### 🚀 Ready to make your agent a specialist?

**[→ Browse 500+ free packages at superagentskill.com](https://www.superagentskill.com/marketplace)**

**Built by makers, for makers. Star the repo ⭐ if you believe agents should belong to everyone.**

</div>
