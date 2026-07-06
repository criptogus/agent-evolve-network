import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage } from "@/components/site/SitePage";
import {
  PLATFORM_VERSION,
  PLATFORM_CODENAME,
  PLATFORM_STAGE,
  PLATFORM_BUILD_DATE,
  CHANGELOG,
  formatVersionLabel,
} from "@/lib/version";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & Changelog — Super Agent Skill" },
      {
        name: "description",
        content:
          "How Super Agent Skill evolves: our versioning policy, current release stage, and a summary of the most recent platform updates.",
      },
      { property: "og:title", content: "About & Changelog — Super Agent Skill" },
      {
        property: "og:description",
        content:
          "How the platform evolves — versioning policy, current stage, and recent updates.",
      },
    ],
  }),
  component: AboutPage,
});

const KIND_BADGE: Record<"major" | "minor" | "patch", string> = {
  major: "bg-destructive/10 text-destructive border-destructive/30",
  minor: "bg-primary/10 text-primary border-primary/30",
  patch: "bg-muted text-muted-foreground border-border",
};

function AboutPage() {
  const recent = CHANGELOG.slice(0, 8);

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <header className="border-b border-border pb-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Constantly evolving
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            About Super Agent Skill
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            We ship in the open. Every deploy bumps the platform version, and
            every version leaves a trace here.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Version" value={`v${PLATFORM_VERSION}`} />
            <Stat label="Stage" value={PLATFORM_STAGE} />
            <Stat label="Codename" value={PLATFORM_CODENAME} />
            <Stat label="Last build" value={PLATFORM_BUILD_DATE} />
          </div>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {formatVersionLabel()}
          </p>
        </header>

        {/* Evolution policy */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            How we evolve
          </h2>
          <p className="mt-3 text-muted-foreground">
            Super Agent Skill follows{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href="https://semver.org/"
              target="_blank"
              rel="noreferrer"
            >
              Semantic Versioning
            </a>
            . While we're pre-1.0 we iterate quickly — no long-term stability
            promises yet, but every change is recorded and traceable.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <PolicyCard
              tone="patch"
              title="Patch — 0.0.x"
              body="Fixes, copy tweaks, migrations, dependency bumps. No user-visible surface changes."
            />
            <PolicyCard
              tone="minor"
              title="Minor — 0.x.0"
              body="New routes, new features, new skill/soul categories, new integrations."
            />
            <PolicyCard
              tone="major"
              title="Major — x.0.0"
              body="Breaking changes to the MCP contract, public API, DB schema, or SDK."
            />
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface/40 p-5 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Codenames.</strong> Every minor
              line ships under a codename (currently{" "}
              <em className="text-foreground">{PLATFORM_CODENAME}</em>). Small
              signal, big momentum.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Automation.</strong> A CI job
              inspects each merge, decides patch/minor/major, and prepends the
              entry below. Nothing ships without a version bump.
            </p>
            <p className="mt-2">
              Machine-readable version:{" "}
              <a
                href="/api/public/version"
                className="font-mono underline underline-offset-4 hover:text-foreground"
              >
                GET /api/public/version
              </a>
            </p>
          </div>
        </section>

        {/* Changelog */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Recent releases
            </h2>
            <a
              href="https://github.com/criptogus/agent-evolve-network/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Full changelog →
            </a>
          </div>

          <ol className="mt-6 space-y-6">
            {recent.map((entry) => (
              <li
                key={entry.version}
                className="rounded-lg border border-border bg-surface/40 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    v{entry.version}
                  </span>
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                      KIND_BADGE[entry.kind]
                    }
                  >
                    {entry.kind}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.date}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-foreground">
                  {entry.title}
                </h3>
                {entry.highlights.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {entry.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Footer note */}
        <section className="mt-16 border-t border-border pt-10 text-sm text-muted-foreground">
          <p>
            Want to shape what ships next? Head to{" "}
            <Link
              to="/community"
              className="underline underline-offset-4 hover:text-foreground"
            >
              community
            </Link>{" "}
            or open an issue on{" "}
            <a
              href="https://github.com/criptogus/agent-evolve-network"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </main>
    </SitePage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function PolicyCard({
  tone,
  title,
  body,
}: {
  tone: "major" | "minor" | "patch";
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <div
        className={
          "inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
          KIND_BADGE[tone]
        }
      >
        {tone}
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
