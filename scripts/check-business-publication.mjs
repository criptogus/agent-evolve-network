/** Finite anonymous metadata verification; no models, authentication, writes or retries. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { assertCompleteBusinessPlan } from "./adversarial-approval.mjs";
const [dir, base, output] = process.argv.slice(2);
if (process.argv.length !== 5 || !dir || !base || !output || existsSync(output))
  throw new Error("Supply EVIDENCE_DIR HTTPS_ORIGIN NEW_REPORT_JSON");
const origin = new URL(base);
if (origin.protocol !== "https:" || origin.origin !== base || origin.username || origin.password)
  throw new Error("An explicit HTTPS origin without credentials, query or path is required");
const plan = JSON.parse(readFileSync(`${dir}/plan.json`, "utf8"));
assertCompleteBusinessPlan(plan);
const registry = JSON.parse(readFileSync(`${dir}/registry.json`, "utf8"));
if (registry.length !== 21 || new Set(registry.map((r) => r.slug)).size !== 21)
  throw new Error("Exactly 21 unique immutable registry bindings required");
const target = `${plan.model}/${plan.prompt_protocol}`;
for (const row of registry) {
  const subject = plan.subjects.find((s) => s.slug === row.slug);
  if (
    !subject ||
    subject.version !== row.latest_version ||
    subject.prompt_sha256 !== row.prompt_sha256
  )
    throw new Error("Registry/plan source mismatch");
}
const results = new Array(registry.length);
let next = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (next < registry.length) {
      const index = next++,
        row = registry[index];
      let status = null;
      try {
        const response = await fetch(
          `${base}/api/public/packages/${encodeURIComponent(row.slug)}`,
          {
            headers: { accept: "application/json" },
            redirect: "error",
            signal: AbortSignal.timeout(15000),
          },
        );
        status = response.status;
        if (!response.ok) throw new Error(`HTTP ${status}`);
        const data = await response.json();
        const hash =
          typeof data.system_prompt === "string"
            ? createHash("sha256").update(data.system_prompt).digest("hex")
            : null;
        const supported = Array.isArray(data.compatibility)
          ? data.compatibility.filter((c) => c.status === "supported").map((c) => c.runtime)
          : [];
        const pluginResponse = await fetch(
          `${base}/api/public/plugins/${encodeURIComponent(row.slug)}/plugin.json`,
          {
            headers: { accept: "application/json" },
            redirect: "error",
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!pluginResponse.ok) throw new Error(`Plugin HTTP ${pluginResponse.status}`);
        const plugin = await pluginResponse.json();
        const passed =
          data.slug === row.slug &&
          data.version === row.latest_version &&
          data.latest_version === row.latest_version &&
          hash === row.prompt_sha256 &&
          supported.length === 1 &&
          supported[0] === target &&
          plugin.name === row.slug &&
          plugin.version === row.latest_version;
        results[index] = {
          slug: row.slug,
          http_status: status,
          version: data.version,
          prompt_sha256: hash,
          supported_runtimes: supported,
          plugin_http_status: pluginResponse.status,
          plugin_version: plugin.version,
          passed,
        };
      } catch (error) {
        results[index] = {
          slug: row.slug,
          http_status: status,
          passed: false,
          error: String(error),
        };
      }
    }
  }),
);
const report = {
  verified_at: new Date().toISOString(),
  base_url: base,
  target,
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  model_calls: 0,
  production_writes: 0,
  automatic_retries: 0,
  results,
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({ total: report.total, passed: report.passed, report: output }));
process.exitCode = report.passed === 21 ? 0 : 1;
