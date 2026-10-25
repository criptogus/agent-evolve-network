/** Finite anonymous check of four evaluated versions, runtime claims and exact downloadable files. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash, verify, createPublicKey } from "node:crypto";
import JSZip from "jszip";
import { artifactDigest } from "../src/lib/plugins/artifacts.ts";
const [dir, base, output] = process.argv.slice(2);
if (process.argv.length !== 5 || !dir || !base || !output || existsSync(output))
  throw new Error("Supply EVIDENCE_DIR HTTPS_ORIGIN NEW_REPORT");
const origin = new URL(base);
if (origin.protocol !== "https:" || origin.origin !== base || origin.username || origin.password)
  throw new Error("Explicit HTTPS origin without credentials/path required");
const read = (n) => JSON.parse(readFileSync(`${dir}/${n}`, "utf8")),
  sha = (v) => createHash("sha256").update(v).digest("hex");
const plan = read("plan.json"),
  { planHash, ...payload } = plan,
  report = read("report.json"),
  registry = read("registry-plan.json");
if (
  sha(JSON.stringify(payload)) !== planHash ||
  report.planHash !== planHash ||
  report.total !== 72 ||
  plan.subjects.length !== 4 ||
  report.reports.length !== 4 ||
  !registry.targets.length ||
  registry.targets.length > 4 ||
  new Set(registry.targets.map((t) => t.slug)).size !== registry.targets.length
)
  throw new Error("Incomplete/unbound cohort");
for (const t of registry.targets) {
  const s = plan.subjects.find((s) => s.slug === t.slug),
    r = report.reports.find((r) => r.slug === t.slug);
  if (
    !s ||
    !r ||
    !r.eligible ||
    s.version !== t.version ||
    r.model !== t.model ||
    s.artifact.sha256 !== t.archive_sha256 ||
    t.prompt_sha256 !== plan.sourceHashes[`content/playbooks/${t.slug}.yaml`] ||
    t.provenance.report_sha256 !== sha(readFileSync(`${dir}/report.json`))
  )
    throw new Error("Stale publication target");
}
const get = async (path) => {
  const r = await fetch(base + path, {
    headers: { accept: "*/*" },
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${path}`);
  return r;
};
const results = [];
for (const target of registry.targets) {
  try {
    const slug = encodeURIComponent(target.slug),
      s = plan.subjects.find((s) => s.slug === target.slug);
    const [metadata, plugin, zipResponse] = await Promise.all([
      get(`/api/public/packages/${slug}`).then((r) => r.json()),
      get(`/api/public/plugins/${slug}/plugin.json`).then((r) => r.json()),
      get(`/api/public/plugins/${slug}.zip`),
    ]);
    const supported = (metadata.compatibility ?? [])
      .filter((c) => c.status === "supported")
      .map((c) => c.runtime);
    if (
      metadata.slug !== target.slug ||
      metadata.version !== target.version ||
      metadata.latest_version !== target.version ||
      sha(metadata.system_prompt ?? "") !== target.prompt_sha256 ||
      supported.length !== 1 ||
      supported[0] !== target.compatibility_key ||
      plugin.name !== target.slug ||
      plugin.version !== target.version
    )
      throw new Error("Public version/source/runtime claim mismatch");
    const bytes = Buffer.from(await zipResponse.arrayBuffer());
    if (bytes.length > 4000000 || sha(bytes) !== zipResponse.headers.get("x-sak-content-sha256"))
      throw new Error("ZIP transport digest mismatch");
    const zip = await JSZip.loadAsync(bytes),
      files = {};
    for (const [path, entry] of Object.entries(zip.files)) {
      if (
        entry.dir ||
        !path.startsWith(`${target.slug}/`) ||
        (entry.unsafeOriginalName && entry.unsafeOriginalName !== path)
      )
        throw new Error("Unexpected ZIP member");
      const relative = path.slice(target.slug.length + 1);
      if (relative === "SIGNATURE.json") continue;
      if (!Object.hasOwn(s.artifact.fileHashes, relative))
        throw new Error("Unlisted archive member");
      files[relative] = await entry.async("string");
      if (sha(files[relative]) !== s.artifact.fileHashes[relative])
        throw new Error(`Changed archive file ${relative}`);
    }
    if (
      Object.keys(files).length !== Object.keys(s.artifact.fileHashes).length ||
      artifactDigest(files) !== target.archive_sha256
    )
      throw new Error("Missing or substituted archive payload");
    const signature = zipResponse.headers.get("x-sak-signature");
    let signatureVerified = false;
    if (signature) {
      const publicKey = await (await get("/api/public/signing-key.pem")).text();
      signatureVerified = verify(
        null,
        Buffer.from(sha(bytes)),
        createPublicKey(publicKey),
        Buffer.from(signature, "base64"),
      );
      if (!signatureVerified) throw new Error("Invalid configured archive signature");
    }
    results.push({
      slug: target.slug,
      version: target.version,
      supported_runtimes: supported,
      archive_sha256: artifactDigest(files),
      verified_files: Object.keys(files).length,
      signature_verified: signatureVerified,
      unsigned_reason: signature ? null : zipResponse.headers.get("x-sak-unsigned-reason"),
      passed: true,
    });
  } catch (error) {
    results.push({ slug: target.slug, passed: false, error: String(error) });
  }
}
const result = {
  verified_at: new Date().toISOString(),
  base_url: base,
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  model_calls: 0,
  production_writes: 0,
  automatic_retries: 0,
  results,
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({ total: result.total, passed: result.passed, report: output }));
process.exitCode = result.total > 0 && result.passed === result.total ? 0 : 1;
