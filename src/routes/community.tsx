import { createFileRoute } from "@tanstack/react-router";
import { Github, BookOpen, GitPullRequest, ShieldCheck, Sparkles } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

const REPO = "https://github.com/criptogus/agent-evolve-network";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community & Open Source — Super Agent Skill" },
      {
        name: "description",
        content:
          "Super Agent Skill is open source. Download skills, playbooks, souls and guardrails from the registry, or contribute your own on GitHub.",
      },
      { property: "og:title", content: "Open source registry for AI agents — Super Agent Skill" },
      {
        property: "og:description",
        content:
          "Apache 2.0 platform, CC BY-SA 4.0 content. Fork the registry, ship a skill, evolve every agent on the network.",
      },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted-foreground">
            <Github className="h-3.5 w-3.5" />
            <span className="font-mono">open source</span>
            <span className="text-border">·</span>
            <span>Apache 2.0 + CC BY-SA 4.0</span>
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            Build the open registry for agent intelligence.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Every skill, playbook, soul and guardrail in our network starts as a YAML file in a public
            GitHub repo. Download what you need. Fork what's almost right. Ship what's missing — and
            it lands in front of every agent on the platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:opacity-95"
            >
              <Github className="h-4 w-4" />
              Star the repo
            </a>
            <a
              href={`${REPO}/tree/main/content`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Browse the registry →
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">How to contribute</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Four steps from idea to merged PR.</h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-background p-7">
                <div className="font-mono text-xs text-primary">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                {s.code ? (
                  <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-[oklch(0.14_0.01_270)] px-3 py-2 font-mono text-[12px] text-white/85">
                    <code>{s.code}</code>
                  </pre>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-5xl px-6">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Package types</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Pick what fits — split if it doesn't.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {KINDS.map((k) => (
              <a
                key={k.slug}
                href={`${REPO}/tree/main/content/${k.folder}`}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-border bg-surface/50 p-6 transition-all hover:border-primary/40 hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-primary">
                    <k.icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">{k.name}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{k.body}</p>
                <div className="mt-4 font-mono text-xs text-muted-foreground transition-colors group-hover:text-primary">
                  content/{k.folder}/ →
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Quality bar</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">A package is accepted when it…</h2>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {BAR.map((b) => (
              <li key={b} className="flex items-start gap-3 rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Validate locally with <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-foreground">bun run validate:content</code> before opening a PR. CI runs the same script.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Ready to ship something?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Open a PR or start a discussion. Maintainers review for quality, safety and overlap, then your
            package is imported into the live registry on the next sync.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={`${REPO}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:opacity-95"
            >
              <BookOpen className="h-4 w-4" />
              Read CONTRIBUTING.md
            </a>
            <a
              href={`${REPO}/issues/new/choose`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <GitPullRequest className="h-4 w-4" />
              Open an issue
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Fork & clone",
    body: "Fork on GitHub, clone locally, install deps with bun install.",
    code: "git clone git@github.com:<you>/super-agent-skill.git\nbun install",
  },
  {
    n: "02",
    title: "Copy a template",
    body: "Each folder ships a _template.yaml. Rename it to your slug and fill it in.",
    code: "cp content/skills/_template.yaml content/skills/my-skill.yaml",
  },
  {
    n: "03",
    title: "Validate locally",
    body: "The validator checks schema, slug uniqueness, file naming and minimum quality.",
    code: "bun run validate:content",
  },
  {
    n: "04",
    title: "Open a PR",
    body: "Use the Package submission template. A maintainer reviews for safety, quality and overlap.",
  },
];

const KINDS = [
  { slug: "skills", folder: "skills", name: "Skills", icon: Sparkles, body: "Single sharply-scoped capabilities with an input → output contract. The atomic unit." },
  { slug: "playbooks", folder: "playbooks", name: "Playbooks", icon: BookOpen, body: "Multi-step decision graphs that orchestrate skills and tools for a recurring scenario." },
  { slug: "souls", folder: "souls", name: "Souls", icon: Sparkles, body: "Personality and value layers that bias an agent's tone, taste and trade-offs." },
  { slug: "guardrails", folder: "guardrails", name: "Guardrails", icon: ShieldCheck, body: "Refusal, safety and compliance policies enforced before a response leaves the agent." },
];

const BAR = [
  "Has a clear, scoped purpose — does one thing well.",
  "Includes at least 2 worked examples with realistic input + exact expected output.",
  "States must and must_not rules explicitly.",
  "Uses a unique kebab-case slug not already in the registry.",
  "Is original work, public-domain, or properly attributed.",
  "Contains no secrets, PII or copyrighted prompts from a paid product.",
];
