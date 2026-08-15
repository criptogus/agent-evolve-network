import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CodeBlock } from "@/components/site/CodeBlock";
import {
  AGENT_PLUGINS_INDEX_URL,
  AGENT_PLUGINS_SITE,
  AGENT_PLUGINS_SPEC_VERSION,
  AGENT_PLUGINS_STEWARDS,
  INSTALL_ROUTES,
  OPEN_SKILLS_AGENTS,
  OPEN_SKILLS_SITE,
  agentPluginZipUrl,
  openSkillsInstallAll,
  openSkillsInstallOne,
  openSkillsUpdate,
} from "@/lib/skills/open-skills";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Super Agent Skill" },
      {
        name: "description",
        content:
          "Connect any AI agent to Super Agent Skill through MCP. Quickstart, capabilities, and SkillForge.",
      },
      { property: "og:title", content: "Docs — Super Agent Skill" },
      {
        property: "og:description",
        content: "Quickstart, MCP gateway, skills, playbooks, souls, guardrails and SkillForge.",
      },
      { property: "og:url", content: "https://superagentskill.com/docs" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://superagentskill.com/docs" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Super Agent Skill — Documentation",
          description:
            "Connect any AI agent to Super Agent Skill through MCP. Quickstart, capabilities, and SkillForge.",
          url: "https://superagentskill.com/docs",
          author: { "@type": "Organization", name: "Super Agent Skill" },
        }),
      },
    ],
  }),
  component: Docs,
});

function Docs() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Documentation
          </div>
          <nav className="mt-4 space-y-1 text-sm">
            {[
              "Quickstart",
              "MCP Gateway",
              "Open Skills CLI",
              "Agent Plugins",
              "Connect step by step",
              "Skills",
              "Playbooks",
              "Souls",
              "Guardrails",
              "SkillForge",
              "Certification API",
              "Security & permissions",
              "API Reference",
            ].map((s) => (
              <a
                key={s}
                href={`#${s.toLowerCase().replace(/\s+/g, "-")}`}
                className="block rounded px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {s}
              </a>
            ))}
          </nav>
        </aside>

        <article className="prose prose-neutral max-w-none">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Quickstart
          </span>
          <h1 id="quickstart" className="mt-3 text-4xl font-semibold tracking-tight">
            Connect your agent in 30 seconds.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Super Agent Skill speaks MCP natively. Any agent runtime that supports MCP — Claude,
            Cursor, Codex, OpenClaw, Hermes, Grok — can connect with a single capability
            declaration.
          </p>

          <h2 id="mcp-gateway" className="mt-12 text-2xl font-semibold tracking-tight">
            1. Add the MCP server
          </h2>
          <p className="mt-2 text-muted-foreground">
            Drop the Super Agent Skill gateway into your agent's MCP config.
          </p>
          <div className="mt-4">
            <CodeBlock
              filename="mcp.config.json"
              lang="json"
              code={`{
  "mcpServers": {
    "superagentskill": {
      "url": "https://superagentskill.com/api/public/mcp",
      "auth": { "type": "oauth", "scopes": ["registry:read", "agent:upgrade"] }
    }
  }
}`}
            />
          </div>

          <h2 id="open-skills-cli" className="mt-12 text-2xl font-semibold tracking-tight">
            Or install with the open Skills CLI
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every published SAK skill is mirrored as a standard{" "}
            <code className="font-mono text-foreground">SKILL.md</code> package, so the open{" "}
            <a
              href={OPEN_SKILLS_SITE}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              skills.sh
            </a>{" "}
            CLI can install them into {OPEN_SKILLS_AGENTS.length}+ agents — Claude Code, Cursor,
            Codex, Copilot, Windsurf, Gemini CLI, Cline, Zed and more. No account, no MCP.
          </p>
          <div className="mt-4">
            <CodeBlock
              lang="bash"
              code={`# the whole graded catalog
${openSkillsInstallAll}

# a single skill
${openSkillsInstallOne("<slug>")}

# refresh installed skills
${openSkillsUpdate}`}
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Install route</th>
                  <th className="px-4 py-2.5 font-medium">Account</th>
                  <th className="px-4 py-2.5 font-medium">Trust Score</th>
                  <th className="px-4 py-2.5 font-medium">Telemetry</th>
                  <th className="px-4 py-2.5 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {INSTALL_ROUTES.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.label}</div>
                      <code className="mt-1 block font-mono text-xs text-muted-foreground">
                        {r.command}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.account ? "Required" : "Not needed"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.trustScore ? "Included" : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.telemetry ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="agent-plugins" className="mt-12 text-2xl font-semibold tracking-tight">
            Or load an Agent Plugin (v{AGENT_PLUGINS_SPEC_VERSION})
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every published skill is also served as a portable{" "}
            <a
              href={AGENT_PLUGINS_SITE}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Agent Plugins
            </a>{" "}
            package — the vendor-neutral format stewarded by{" "}
            {AGENT_PLUGINS_STEWARDS.join(", ")}. One manifest, the standard{" "}
            <code className="font-mono text-foreground">SKILL.md</code> component and our MCP server
            in one directory, so a conformant client loads the graded skill with no account.
          </p>
          <div className="mt-4">
            <CodeBlock
              lang="text"
              code={`<slug>/
├── plugin.json          # Agent Plugins v${AGENT_PLUGINS_SPEC_VERSION} manifest
├── mcp.json             # our MCP server (streamable-http)
├── SIGNATURE.json       # Ed25519 signature over the package payload
└── skills/
    └── <slug>/
        ├── SKILL.md
        └── references/examples.md`}
            />
          </div>
          <div className="mt-4">
            <CodeBlock
              lang="bash"
              code={`# download one portable plugin package
curl -LO ${agentPluginZipUrl("<slug>")}

# manifest only
curl ${"https://superagentskill.com/api/public/plugins/<slug>/plugin.json"}

# discovery index of every graded plugin
curl ${AGENT_PLUGINS_INDEX_URL}`}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            This repository is itself a conformant plugin: root{" "}
            <code className="font-mono text-foreground">plugin.json</code> +{" "}
            <code className="font-mono text-foreground">mcp.json</code> +{" "}
            <code className="font-mono text-foreground">skills/</code>. Authorization stays
            client-managed — we never ship credentials in a manifest.
          </p>

          <h3 className="mt-6 text-base font-semibold">Verify the signature</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Every package download is signed with our Ed25519 release key. The archive carries an
            embedded <code className="font-mono text-foreground">SIGNATURE.json</code> (valid even
            after extracting or repacking), and a detached sidecar pins the sha256 of the exact
            bytes we served. Signature data also travels in{" "}
            <code className="font-mono text-foreground">X-SAK-*</code> response headers.
          </p>
          <div className="mt-3">
            <CodeBlock
              lang="bash"
              code={`# detached signature + our public key
curl -O https://superagentskill.com/api/public/plugins/<slug>/signature.json
curl -O https://superagentskill.com/api/public/signing-key.pem

# integrity check (hash + Ed25519 signature + key id)
node scripts/verify-package-signature.mjs <slug>-agent-plugin.zip signature.json signing-key.pem`}
            />
          </div>



          <h2 id="skills" className="mt-12 text-2xl font-semibold tracking-tight">
            2. Trigger the upgrade
          </h2>
          <p className="mt-2 text-muted-foreground">
            Once connected, give your agent the keywords. It does the rest.
          </p>
          <div className="mt-4">
            <CodeBlock
              code={`> Super Agent Skill: check for updates and improvements

→ Self-assessing context........... primary care, pediatrics
→ Identified gaps.................. 3
→ Recommended packages............. 5
→ Installing...................... ✓
→ New trust score................. 96.1 / 100`}
            />
          </div>

          <h2 id="playbooks" className="mt-12 text-2xl font-semibold tracking-tight">
            3. The four primitives
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every agent runs on the same stack:{" "}
            <span className="font-mono text-foreground">skills</span>,{" "}
            <span className="font-mono text-foreground">playbooks</span>,{" "}
            <span className="font-mono text-foreground">souls</span>, and{" "}
            <span className="font-mono text-foreground">guardrails</span>.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                t: "Skills",
                d: "Discrete capabilities — domain reasoning, tool use, structured outputs.",
              },
              {
                t: "Playbooks",
                d: "Multi-step workflows that orchestrate skills toward an outcome.",
              },
              {
                t: "Souls",
                d: "Personality, tone, and decision-making style as installable packages.",
              },
              { t: "Guardrails", d: "Safety boundaries enforced before output reaches the user." },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border border-border bg-surface p-5">
                <div className="font-mono text-xs uppercase tracking-wider text-primary">{x.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>

          <h2 id="skillforge" className="mt-12 text-2xl font-semibold tracking-tight">
            4. SkillForge: the evolution loop
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every install reports anonymized feedback. SkillForge processes the signal and ships
            improved package versions to the entire network. Your agent gets smarter while you
            sleep.
          </p>

          <h2 id="certification-api" className="mt-12 text-2xl font-semibold tracking-tight">
            5. Certification API
          </h2>
          <p className="mt-2 text-muted-foreground">
            <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/public/certify</code>{" "}
            runs any skill file — even one you host yourself — through the same review engine as the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">review_skill</code> MCP tool and
            issues a permanent audit badge bound to the file's SHA-256, with a public verification
            record. See the{" "}
            <Link to="/certify" className="text-primary hover:underline">
              certification guide
            </Link>{" "}
            for the full flow.
          </p>

          <h2 id="security-&-permissions" className="mt-12 text-2xl font-semibold tracking-tight">
            6. Security &amp; permissions
          </h2>
          <p className="mt-2 text-muted-foreground">
            The MCP gateway is deliberately narrow. Read-only tools —{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">overview</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">get_methodology</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">review_skill</code> /{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">review_skills_batch</code>, and
            registry search / list / get / trust lookups — work anonymously and only read public
            registry data. Write tools ({" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">upload_packages</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">request_primitive</code>) require
            an OAuth bearer or a personal access token. The gateway never reads your files, code or
            conversation history — it only sees the arguments your agent passes to each tool call.
          </p>
          <p className="mt-3 text-muted-foreground">
            <span className="font-medium text-foreground">Data flow:</span> your agent calls the
            gateway over HTTPS; the gateway returns signed package content from the public
            registry. Anything you upload stays scoped to your workspace unless you explicitly
            publish it.
          </p>
          <p className="mt-3 text-muted-foreground">
            <span className="font-medium text-foreground">Telemetry opt-out:</span> the CLI sends
            anonymized install telemetry only; disable it with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPER_AGENT_TELEMETRY=0</code>.
          </p>
          <p className="mt-3 text-muted-foreground">
            Verify packages yourself on each package's Trust page (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/marketplace/trust/&lt;slug&gt;</code>
            , linked from every{" "}
            <Link to="/marketplace" className="text-primary hover:underline">
              marketplace
            </Link>{" "}
            listing){" "}
            and report vulnerabilities via{" "}
            <a
              href="https://github.com/criptogus/agent-evolve-network/blob/main/SECURITY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              SECURITY.md
            </a>
            .
          </p>
        </article>
      </div>
      <Footer />
    </div>
  );
}
