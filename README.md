<div align="center">

<img src="https://www.superagentskill.com/og.png" alt="Super Agent Skill" width="640" />

# Super Agent Skill

### One command. Your agent becomes a genius.

**The open MCP layer that turns any AI agent — Claude, Cursor, Codex, Continue — into a specialist, instantly.**

[![Website](https://img.shields.io/badge/website-superagentskill.com-0A66FF?style=flat-square)](https://www.superagentskill.com)
[![MCP](https://img.shields.io/badge/MCP-live-22c55e?style=flat-square)](https://www.superagentskill.com/api/mcp)
[![Marketplace](https://img.shields.io/badge/marketplace-browse-8b5cf6?style=flat-square)](https://www.superagentskill.com/marketplace)
[![License: Apache 2.0](https://img.shields.io/badge/code-Apache_2.0-000?style=flat-square)](LICENSE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/content-CC_BY--SA_4.0-000?style=flat-square)](LICENSES/CONTENT-CC-BY-SA-4.0.txt)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff4f8b?style=flat-square)](CONTRIBUTING.md)

[**Website**](https://www.superagentskill.com) · [**Marketplace**](https://www.superagentskill.com/marketplace) · [**Docs**](https://www.superagentskill.com/docs) · [**MCP endpoint**](https://www.superagentskill.com/api/mcp) · [**Discord**](https://www.superagentskill.com/community)

</div>

---

## Why Super Agent Skill?

Generic agents are jacks of all trades, masters of none. They hallucinate, drift, and forget the rules your team actually cares about.

**Super Agent Skill fixes that with three ingredients:**

- 🧠 **A growing open registry** of battle-tested **Skills**, **Playbooks**, **Souls** and **Guardrails** — community-owned, MIT-friendly, embeddable anywhere.
- ⚙️ **SkillForge**, our continuous evolution loop — it benchmarks every skill against adversarial cases, finds weaknesses, and ships patches automatically.
- 🔌 **One MCP endpoint** that streams the strongest version of every skill to any compatible agent — no copy-paste, no version drift.

> *Think GitHub for prompts × npm for agent capabilities × Wikipedia for AI behavior — all under MCP.*

## 60-second quickstart

**Option A — Plug it into your agent (recommended).** Point any MCP-compatible client at:

```
https://www.superagentskill.com/api/mcp
```

That's it. Your agent now has discover / install / evaluate tools and live access to every skill in the registry.

**Option B — Download a skill as a file.** Free, no account:

```bash
curl -O https://raw.githubusercontent.com/criptogus/agent-evolve-network/main/content/skills/code-reviewer.yaml
```

**Option C — Run the whole platform locally:**

```bash
bun install
bun run dev
```

## The four building blocks

| | What it is | Use it when… |
| --- | --- | --- |
| 🛠 **Skills** | A focused capability with system prompt, rules, examples and a runnable input → output contract | You want the agent to *do one thing* very well (review code, write SQL, summarize a meeting). |
| 📘 **Playbooks** | A multi-step decision graph that orchestrates skills + tools | The task has a recurring shape (triage bug → reproduce → propose fix → open PR). |
| 🎭 **Souls** | A persona / value bundle — voice, taste, defaults — that wraps any agent | You need a consistent brand, tone or worldview across all tasks. |
| 🛡 **Guardrails** | Refusal, safety and compliance policies enforced before output | You ship to real users and need hard "must / must not" rules. |

Each one is a single self-contained YAML file. **Read it, fork it, ship it.**

```
content/
├── skills/         → Single capabilities
├── playbooks/      → Multi-step workflows
├── souls/          → Personas and values
├── guardrails/     → Safety and compliance
└── schemas/        → JSON Schemas (every package validates against these)
```

## Ship your first skill in 4 steps

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

## Why contribute?

Your work isn't just merged — it's *amplified*.

- 🌐 **Reach.** Every accepted package is served live through MCP to thousands of agents.
- 🏆 **Reputation.** Public **Trust Score**, model compatibility matrix and leaderboard rankings on the [marketplace](https://www.superagentskill.com/marketplace/rankings).
- 💸 **Revenue share.** Premium packages earn 80–85% of sales + recurring usage bonuses.
- 🤖 **AI co-author.** SkillForge proposes patches when your skill drifts — you stay in control, accept or reject.
- 🪪 **CVE-style credit.** Robustness findings (e.g. `SAS-2026-0001`) are publicly attributed.

> **First-time contributor?** Look for [`good first issue`](https://github.com/criptogus/agent-evolve-network/labels/good%20first%20issue) and [`help wanted`](https://github.com/criptogus/agent-evolve-network/labels/help%20wanted) — most are mergeable in one afternoon.

## What makes this different

|  | Super Agent Skill | A prompt library on GitHub | A walled-garden GPT store |
| --- | :---: | :---: | :---: |
| Open content (CC BY-SA) | ✅ | ✅ | ❌ |
| Schema-validated quality bar | ✅ | ❌ | ⚠️ opaque |
| Works in *any* MCP agent | ✅ | ⚠️ manual paste | ❌ single vendor |
| Continuous adversarial evolution | ✅ | ❌ | ❌ |
| Public trust + compatibility scores | ✅ | ❌ | ❌ |
| Revenue share for authors | ✅ | ❌ | ⚠️ limited |

## Roadmap

- [x] MCP server with discover / install / evaluate / report-execution tools
- [x] SkillForge evolution loop (eval → patch → re-score)
- [x] Public **Trust Score**, model compatibility matrix, drift detection
- [ ] CLI (`npx sas init`, `sas publish`, `sas eval`)
- [ ] Cryptographically signed package releases
- [ ] Versioned downloadable registry bundles
- [ ] Community-curated **collections** (curated bundles around a use case)

Track everything on the [public board](https://github.com/criptogus/agent-evolve-network/projects).

## Community

- 💬 **Discord** — [join here](https://www.superagentskill.com/community) for help, design reviews, and weekly skill-jam events.
- 🐦 **X / Twitter** — [@superagentskill](https://twitter.com/superagentskill) for releases and benchmarks.
- 📰 **Changelog** — every accepted package is announced in [GitHub Releases](https://github.com/criptogus/agent-evolve-network/releases).
- 🛡 **Security** — please disclose responsibly via [SECURITY.md](SECURITY.md).

## License

- **Code** (this repo, outside `content/`): [Apache License 2.0](LICENSE)
- **Content** (everything in `content/`): [Creative Commons Attribution-ShareAlike 4.0](LICENSES/CONTENT-CC-BY-SA-4.0.txt)

By contributing you agree your work is licensed under the same terms — and that it gets to make millions of agent conversations a little smarter every day.

---

<div align="center">

**Built by makers, for makers. Star the repo ⭐ if you believe agents should belong to everyone.**

</div>
