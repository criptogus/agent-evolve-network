/** Two anonymous version reads, allowing only the explicit owned canonical redirect. */
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export function versionResults(expected, canonical, alias, observations) {
  const primary = observations[0],
    secondary = observations[1];
  const primaryPassed = primary?.status === 200 && primary.data?.version === expected;
  const direct = secondary?.status === 200 && secondary.data?.version === expected;
  let canonicalRedirect = false;
  try {
    canonicalRedirect =
      [301, 302, 303, 307, 308].includes(secondary?.status) &&
      new URL(secondary.location, alias).href === `${canonical}/api/public/version`;
  } catch {}
  return [
    { origin: canonical, ...primary, passed: primaryPassed },
    {
      origin: alias,
      status: secondary?.status ?? null,
      version: secondary?.data?.version ?? null,
      error: secondary?.error ?? null,
      canonical_redirect: canonicalRedirect,
      passed: primaryPassed && (direct || canonicalRedirect),
    },
  ];
}
async function main() {
  const [expected, canonical, alias, output] = process.argv.slice(2);
  if (
    process.argv.length !== 6 ||
    !/^\d+\.\d+\.\d+$/.test(expected ?? "") ||
    !output ||
    existsSync(output) ||
    canonical === alias
  )
    throw new Error("Supply EXPECTED_VERSION CANONICAL_HTTPS_ORIGIN ALIAS_HTTPS_ORIGIN NEW_REPORT");
  for (const value of [canonical, alias]) {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.origin !== value || u.username || u.password)
      throw new Error("Explicit credential-free HTTPS origins required");
  }
  const observations = await Promise.all(
    [canonical, alias].map(async (origin) => {
      try {
        const r = await fetch(origin + "/api/public/version", {
          redirect: "manual",
          signal: AbortSignal.timeout(15000),
        });
        return {
          status: r.status,
          ...(r.status === 200
            ? { data: await r.json() }
            : { location: r.headers.get("location") }),
        };
      } catch (error) {
        return { status: null, error: String(error) };
      }
    }),
  );
  const results = versionResults(expected, canonical, alias, observations);
  const report = {
    checked_at: new Date().toISOString(),
    expected_version: expected,
    total: 2,
    passed: results.filter((r) => r.passed).length,
    model_calls: 0,
    production_writes: 0,
    automatic_retries: 0,
    results,
  };
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ total: 2, passed: report.passed, report: output }));
  process.exitCode = report.passed === 2 ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
