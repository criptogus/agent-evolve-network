import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CodeBlock } from "@/components/site/CodeBlock";
import { getPublicReleaseLog } from "@/lib/security.functions";
import { canonicalLink } from "@/lib/seo/canonical";
import {
  ShieldCheck,
  FileKey,
  Lock,
  EyeOff,
  ScrollText,
  ExternalLink,
  Server,
  Fingerprint,
} from "lucide-react";

const TITLE = "Security & IP — Verify Our Claims | Super Agent Skill";
const DESCRIPTION =
  "Public evidence for Super Agent Skill security: Ed25519-signed releases, RLS policies, audit trails, and the whitepaper you can audit offline.";

const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/31e8f1c8-d61a-43e0-a6cf-bc7dc826978f/id-preview-a810735d--b00a8021-9d8d-4f49-a581-628727b71f68.lovable.app-1778445620031.png";

export const Route = createFileRoute("/security")({
  loader: async () => {
    return await getPublicReleaseLog();
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://superagentskill.com/security" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [canonicalLink("/security")],
  }),
  component: SecurityPage,
});

const resources = [
  {
    Icon: ShieldCheck,
    label: "Security whitepaper",
    href: "/whitepaper",
    body: "Threat model, Ed25519 signing, verification workflow and shared-responsibility model.",
    external: false,
  },
  {
    Icon: Server,
    label: "MCP gateway permissions",
    href: "/docs#security-&-permissions",
    body: "Which tools are read-only, which require OAuth, and what data the gateway can and cannot see.",
    external: false,
  },
  {
    Icon: EyeOff,
    label: "Privacy policy",
    href: "/privacy",
    body: "What we collect, how long we keep it, subprocessors, and how to request deletion.",
    external: false,
  },
  {
    Icon: FileKey,
    label: "Certification API",
    href: "/certify",
    body: "Public audit badges bound to a SHA-256. Certify a skill you host yourself.",
    external: false,
  },
  {
    Icon: ScrollText,
    label: "SECURITY.md",
    href: "https://github.com/criptogus/agent-evolve-network/blob/main/SECURITY.md",
    body: "Responsible disclosure, supported versions, and how to report a vulnerability.",
    external: true,
  },
  {
    Icon: Lock,
    label: "Database migrations & RLS",
    href: "https://github.com/criptogus/agent-evolve-network/tree/main/supabase/migrations",
    body: "Inspect versioned database migrations and access policies in the public repository.",
    external: true,
  },
];

const verifySnippet = `# Verify a trust attestation with the matching package and publisher key.
# Run from a checkout of the repository with dependencies installed.
npm run trust:verify -- --attestation pkg.trust.json --pkg pkg.yaml --pubkey pub.pem`;

function SecurityPage() {
  const { releases, available } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="font-mono uppercase tracking-wider text-muted-foreground">
            Trust center
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Security you can verify yourself.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Inspect versioned access policies, available signed release records and open security
          documentation. Evidence availability is shown explicitly; a published package is not
          automatically a verified package.
        </p>

        {/* Resource links */}
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Public documentation
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <a
                key={r.label}
                href={r.href}
                target={r.external ? "_blank" : undefined}
                rel={r.external ? "noopener noreferrer" : undefined}
                className="group rounded-2xl border border-border bg-surface p-5 transition-all hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <r.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  {r.external && (
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{r.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
              </a>
            ))}
          </div>
        </section>

        {/* RLS model */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <Fingerprint className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight">RLS model</h2>
          </div>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Access policies distinguish public package metadata from private package contents and
            owner or administrator records. This page exposes only signed release metadata for
            currently published, approved packages. Inspect the versioned policies in the{" "}
            <a
              href="https://github.com/criptogus/agent-evolve-network/tree/main/supabase/migrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              migrations folder
            </a>
            .
          </p>
        </section>

        {/* Ed25519 verification example */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <FileKey className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight">Ed25519 verification</h2>
          </div>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            For a package with a signed trust attestation, use the matching package bytes,
            attestation and publisher public key with the offline verifier. A non-zero exit means
            verification failed. The release log below reports stored metadata; it does not
            independently verify a signature or establish model compatibility.
          </p>
          <div className="mt-5">
            <CodeBlock filename="verify.sh" lang="bash" code={verifySnippet} />
          </div>
        </section>

        {/* Live signed release log */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight">Live signed release log</h2>
          </div>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Up to 20 recent signed release records for currently public, approved packages. Each row
            identifies a specific version and its recorded content hash, key fingerprint and
            timestamp. Older records do not establish evidence for the current package version.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
            {!available ? (
              <div className="p-6 text-sm text-muted-foreground" role="status">
                Release evidence is temporarily unavailable. Try again later or inspect a package’s
                trust report.
              </div>
            ) : releases.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No signed releases are visible right now. Check back after the next certification
                run, or inspect the{" "}
                <Link to="/marketplace" className="text-primary hover:underline">
                  marketplace
                </Link>{" "}
                for per-package trust pages.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background/80 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Signed at</th>
                      <th className="px-4 py-3 font-medium">Package</th>
                      <th className="px-4 py-3 font-medium">Version</th>
                      <th className="px-4 py-3 font-medium">Content hash</th>
                      <th className="px-4 py-3 font-medium">Key ID</th>
                      <th className="px-4 py-3 font-medium">Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {releases.map((r) => (
                      <tr key={`${r.slug}-${r.version}`} className="bg-background/40">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                          {new Date(r.signed_at).toISOString().slice(0, 19).replace("T", " ")} UTC
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to="/marketplace/trust/$slug"
                            params={{ slug: r.slug }}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{r.version}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.content_hash.slice(0, 16)}…
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.signing_key_id.slice(0, 16)}…
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.signature_preview}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Audit trail explanation */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight">Audit trail</h2>
          </div>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Release, review and injection-audit records provide different kinds of evidence. Inspect
            the corresponding policies and package trust report for their scope and availability; a
            stored record alone does not prove a successful evaluation.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["package_releases", "Recorded signatures with content hash, key ID and timestamp."],
              ["review_audit", "Certification decisions, scores and reasoning per review."],
              ["upload_injection_audit", "Findings from the upload-time adversarial harness."],
            ].map(([table, desc]) => (
              <div key={table as string} className="rounded-xl border border-border bg-surface p-5">
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{table}</code>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
