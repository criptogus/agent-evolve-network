import type { Package } from "@/data/packages";
import { packagedExecution } from "@/lib/marketplace/package-execution";
export function PackagedExecutionInstructions({
  pkg,
  compact = false,
}: {
  pkg: Package;
  compact?: boolean;
}) {
  const execution = packagedExecution(pkg);
  if (!execution) return null;
  return (
    <div
      className="space-y-4 rounded-xl border border-border bg-card p-5"
      data-packaged-execution={execution.kind}
    >
      <h3 className="text-sm font-semibold">Use the evaluated bundle</h3>
      <p className="text-sm text-muted-foreground">
        Version {pkg.latest} was evaluated with its packaged runner and the environment below.
        Connecting an MCP client or copying the prompt does not reproduce that execution.
      </p>
      <code className="block break-all rounded-md border border-border bg-surface p-3 text-xs">
        {execution.runtime}
      </code>
      <a
        href={execution.zipUrl}
        className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Download evaluated ZIP v{pkg.latest}
      </a>
      <p className="text-xs text-muted-foreground">
        Verify archive integrity with the{" "}
        <a
          href={`/api/public/plugins/${encodeURIComponent(pkg.id)}/signature.json`}
          className="underline underline-offset-4"
        >
          signature sidecar
        </a>{" "}
        and{" "}
        <a href="/api/public/signing-key.pem" className="underline underline-offset-4">
          public key
        </a>
        .
      </p>
      {compact ? (
        <p className="text-xs text-muted-foreground">
          <a href="#install" className="underline underline-offset-4">
            Read the setup instructions
          </a>{" "}
          before running the bundle.
        </p>
      ) : (
        <>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Unpack the ZIP and follow{" "}
              <code className="break-all">
                {pkg.id}/skills/{pkg.id}/SKILL.md
              </code>
              .
            </li>
            <li>
              Keep the included runtime profile, dependencies and exact model version. Other models
              and environments remain unqualified.
            </li>
            {execution.kind === "source-state" ? (
              <li>
                Configure <code>TYPESAFE_API_KEY</code> privately in your local environment. The
                runner sends authorized input fields to TypeSafe only with explicit source-upload
                consent. Use the bundled instructions to configure the pinned Node host and, where
                required, the XML reader.
              </li>
            ) : (
              <li>
                Use the exact cached local model and packaged runner specified in the bundle. A
                prompt pasted into another assistant has no inherited qualification.
              </li>
            )}
          </ol>
          <p className="text-xs text-muted-foreground">
            The evaluation covers source-grounded preparation. Financial actions, external sending,
            real security tests and release approval require separate authorized evidence.
          </p>
        </>
      )}
    </div>
  );
}
