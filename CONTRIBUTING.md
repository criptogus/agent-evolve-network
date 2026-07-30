# Contributing to Super Agent Skill

> **First time here? Welcome.** This is one of the friendliest places to ship your first open-source contribution — most PRs land within 72h, and every accepted package goes live to thousands of agents through MCP.

There are four flavors of contribution we love:

1. 🛠 **New packages** — a Skill, Playbook, Soul or Guardrail in [`content/`](content/).
2. ✨ **Improvements to existing packages** — sharper prompts, tighter rules, more examples, fixed edge cases, better adversarial coverage.
3. 💻 **Code & docs** for the platform itself (in [`src/`](src/)).
4. 🐛 **Bug reports, ideas, security disclosures** — issues are contributions too.

By submitting a contribution you agree to license your work under the project's licenses (Apache 2.0 for code, CC BY-SA 4.0 for content).

---

## 🚀 Fast path: ship a Skill in 15 minutes

```bash
# 1. Fork on GitHub, then:
git clone git@github.com:<you>/agent-evolve-network.git
cd agent-evolve-network
bun install

# 2. Copy a template
cp content/skills/_template.yaml content/skills/my-skill.yaml

# 3. Fill in: name, slug, description, system prompt, rules, examples
$EDITOR content/skills/my-skill.yaml

# 4. Validate (same script CI runs)
bun run validate:content

# 5. Commit, push, open a PR using the "Package submission" template
```

That's it. A maintainer reviews for quality, safety and overlap with existing packages. Accepted packages are imported into the hosted registry on the next sync, where **SkillForge** evaluates them and serves the strongest version through MCP.

---

## 🚀 What happens after your PR merges

Your contribution doesn't stop at the merge — it enters a pipeline:

1. **Import** — the package syncs into the hosted registry and gets its own marketplace page.
2. **Adversarial gauntlet** — it runs the full attack suite (prompt injection, jailbreaks, exfiltration, policy bypass). Pass rates are published per attack class.
3. **Trust Score** — a public, verifiable score appears on your package page; embed the live badge in your own README.
4. **Live via MCP** — every agent connected to `superagentskill.com/api/mcp` can discover and install it, from day one.
5. **SkillForge watches it** — daily re-tests against the evolving suite; when it drifts, SkillForge proposes a patch and you review it. Your skill gets *better* while you sleep.
6. **You get credited** — [`AUTHORS`](AUTHORS), [marketplace rankings](https://superagentskill.com/marketplace/rankings), and revenue share if it goes premium.

The whole point: a YAML file you write this afternoon becomes a **signed, adversarially-tested, continuously-maintained** capability running inside thousands of agents — with your name on it.

---

## 📦 Contributing a package

### Step 1 — Pick the right type

| You want to… | Use a… |
| --- | --- |
| Encapsulate a single capability with a contract (input → output) | **Skill** |
| Codify a multi-step workflow that calls skills/tools in sequence | **Playbook** |
| Define a persona, voice and value system for an agent | **Soul** |
| Add safety, compliance or policy rules | **Guardrail** |

When in doubt, **split**. Two small skills beat one bloated one.

### Step 2 — Copy the template

```bash
cp content/<type>/_template.yaml content/<type>/<your-slug>.yaml
```

Templates live next to working examples in each folder — read those first; they're the best docs we have.

### Step 3 — Hit the quality bar

A package is accepted when it:

- ✅ Has a **clear, scoped purpose** — does one thing well.
- ✅ Includes **at least 2 worked examples** with realistic input and the exact expected output.
- ✅ States **`must` and `must_not`** rules explicitly (no hand-waving).
- ✅ Uses a **unique kebab-case `slug`** not already in the registry.
- ✅ Is **original work**, public domain, or properly attributed.
- ✅ Contains **no secrets, PII, or copyrighted prompts** pulled from a paid product.
- ✅ Passes `bun run validate:content` locally.

### Step 4 — Validate

```bash
bun run validate:content
bun run audit:skills
```

The validator checks schema, slug uniqueness, file naming and example count.

`audit:skills` is the **marketplace security gate**: every package is scanned
for prompt-injection / jailbreak signals (shared with the runtime guard) and
for malicious "functions" embedded in instructions — remote code execution
(`curl … | sh`), credential/dotenv exfiltration, reverse shells, beacons to
non-allowlisted hosts, hardcoded keys, and obfuscated payloads. A package is
**rejected** when its worst finding is `high` or `critical`. A skill whose job
*is* security testing must declare a `security` / `red-team` / `adversarial`
tag so its quoted example payloads are treated as data, not as attacks. Both
scripts run in CI on every PR that touches `content/`.

#### Optional second opinion — SkillSpector

```bash
npm run scan:skillspector            # all packages
npm run scan:skillspector content/skills/your-skill.yaml   # one package
```

`scan:skillspector` layers [NVIDIA SkillSpector](https://github.com/NVIDIA/skillspector)
on top of `audit:skills` as an independent, advisory scan. It renders each YAML
package into a throwaway `SKILL.md` and runs SkillSpector's broader catalogue of
vulnerability patterns (prompt injection, data exfiltration, privilege
escalation, supply-chain, excessive agency, MCP tool poisoning, …) plus AST/YARA
behavioural detection. It is **optional**: if SkillSpector is not installed the
command skips gracefully, and in CI its findings are reported in the repo's
Security tab without blocking merges. Install it once with:

```bash
git clone https://github.com/NVIDIA/skillspector && cd skillspector
uv tool install --python 3.12 .
```

Pass `--block` to fail on any package scoring at/above the risk threshold
(default 50; override with `SKILLSPECTOR_THRESHOLD`).

### Step 5 — Open a pull request

Use the **Package submission** PR template. Include:

- Why this package exists (the problem it solves in one sentence).
- How you tested it — at minimum, paste 1 real run from a real agent.
- Any prior art / inspirations / overlap with existing packages.

A maintainer reviews within **72 hours**. Expect tiny nits — we're picky on purpose, because every package gets amplified across the network.

---

## 🛠 Improving an existing package

- For **prompt tweaks, new examples, edge-case fixes** — just open a PR. Bump the `version` field (semver).
- For **structural changes** (rename, breaking rule changes) — open an issue first so we can coordinate with downstream agents already depending on the slug.
- For **drift fixes** flagged by SkillForge — mention the drift alert ID in your PR; we'll close it automatically on merge.
- Always describe in the PR: **what got better, how you tested, what regressed (if anything)**.

---

## 💻 Code contributions

- Match existing style — Prettier + ESLint run automatically.
- Keep PRs focused: **one concern per PR**.
- For non-trivial changes (>200 LOC or new dependencies), open an issue first to align on direction.
- Add or update tests next to changed logic.
- If you touch the MCP surface, update [`docs/mcp.md`](src/routes/docs.mcp.tsx) too.

Local dev:

```bash
bun install
bun run dev          # http://localhost:5173
bun test             # unit tests
bun run validate:content
```

---

## 🐛 Reporting issues

| Type | How |
| --- | --- |
| Bug in the platform | Open an issue with the **Bug** template |
| Problem with a package | Open an issue with the **Content** template + the slug |
| Feature idea | **Feature request** template — describe the user, not the solution |
| Security vulnerability | **Please do NOT open a public issue.** See [SECURITY.md](SECURITY.md) |

---

## 🏷 Good first issues

New contributors: filter issues by [`good first issue`](https://github.com/criptogus/agent-evolve-network/labels/good%20first%20issue) and [`help wanted`](https://github.com/criptogus/agent-evolve-network/labels/help%20wanted). Most are mergeable in one focused afternoon.

If something's labeled but unclear, **comment first** and a maintainer will scope it down before you start.

---

## 🤝 Code of Conduct

All participation — issues, PRs, Discord, comments — is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Be kind. Critique ideas, not people. We enforce it.

---

## 🌟 Recognition

- Every merged contributor is listed in the [`AUTHORS`](AUTHORS) file and on the [public marketplace](https://superagentskill.com/marketplace/rankings).
- Top contributors get the **Skill Architect** role on Discord, early access to new features, and a small monthly grant from the platform revenue pool.
- **Found a robustness issue?** It's published as a public finding (e.g. `SAS-2026-0042`) with your handle credited — CVE-style.

Thanks for making agents smarter — together. ⭐
