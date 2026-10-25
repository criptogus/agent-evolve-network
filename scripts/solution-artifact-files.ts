/** Exact, self-contained workflow source bundles. No recursive uploads or approval claims. */
import { lstatSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { z } from "zod";
import { SOLUTIONS } from "../src/lib/solutions/catalog.ts";
import { buildSkillPluginManifest } from "../src/lib/plugins/agent-plugins.ts";
import { ArtifactFilesSchema, artifactDigest } from "../src/lib/plugins/artifacts.ts";
import { runPluginConformance } from "../src/lib/plugins/conformance.ts";

export const SOLUTION_RUNTIME_FILES = [
  "scripts/run-playbook.ts",
  "src/lib/runtime/compile.ts",
  "src/lib/runtime/run.ts",
  "src/lib/runtime/types.ts",
  "src/lib/runtime/expr.ts",
  "src/lib/runtime/gateway-messages.ts",
  "src/lib/runtime/local-model-contract.ts",
  "src/lib/runtime/finance-source-facts.ts",
  "src/lib/runtime/finance-source-facts.server.ts",
  "src/lib/adversarial/leak-scanner.ts",
  "LICENSE",
] as const;

const definition = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.literal("playbook"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  license: z.string(),
  tags: z.array(z.string()).default([]),
});
function text(path: string) {
  if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())
    throw new Error(`Only regular allowlisted files may be bundled: ${path}`);
  return readFileSync(path, "utf8");
}

export function buildSolutionPlaybookFiles(source: string) {
  const p = definition.parse(parse(source));
  if (!SOLUTIONS.some((s) => p.slug === `solution-${s.id}`))
    throw new Error("Unknown solution playbook; refusing implicit packaging");
  if (text(`content/playbooks/${p.slug}.yaml`) !== source)
    throw new Error("Stale or substituted solution source");
  const contract = JSON.parse(text("content/expansion/playbook-local-contract.json"));
  const profile = JSON.parse(text("content/expansion/playbook-model-profiles.json")).find(
    (candidate: { model: string }) => candidate.model === contract.model,
  );
  if (!profile) throw new Error("Packaged model contract has no exact candidate profile");
  const root = `skills/${p.slug}`;
  const lock = z
    .object({ packages: z.record(z.string(), z.unknown()) })
    .parse(JSON.parse(text("package-lock.json")));
  const yaml = z
    .object({ version: z.string(), resolved: z.string().url(), integrity: z.string() })
    .passthrough()
    .parse(lock.packages["node_modules/yaml"]);
  if (!yaml.resolved.startsWith("https://registry.npmjs.org/yaml/-/"))
    throw new Error("Unexpected YAML dependency registry");
  const packageMetadata = {
    name: `@super-agent-skill/${p.slug}`,
    version: p.version,
    private: true,
    type: "module",
    engines: { node: ">=22.18.0" },
    dependencies: { yaml: yaml.version },
  };
  const files: Record<string, string> = {
    "plugin.json": JSON.stringify(
      buildSkillPluginManifest({
        slug: p.slug,
        name: p.name,
        description: p.description,
        version: p.version,
        license: p.license,
        authorHandle: "super-agent-skill",
        tags: p.tags,
      }),
      null,
      2,
    ),
    [`${root}/package.json`]: JSON.stringify(packageMetadata, null, 2) + "\n",
    [`${root}/package-lock.json`]:
      JSON.stringify(
        {
          name: packageMetadata.name,
          version: p.version,
          lockfileVersion: 3,
          requires: true,
          packages: {
            "": {
              name: packageMetadata.name,
              version: p.version,
              engines: packageMetadata.engines,
              dependencies: packageMetadata.dependencies,
            },
            "node_modules/yaml": yaml,
          },
        },
        null,
        2,
      ) + "\n",
    [`${root}/content/playbooks/${p.slug}.yaml`]: source,
    [`${root}/references/runtime-profile.json`]:
      JSON.stringify({ ...profile, ...contract }, null, 2) + "\n",
    [`${root}/references/candidate-models.json`]: text(
      "content/expansion/playbook-model-profiles.json",
    ),
    [`${root}/SKILL.md`]: `---\nname: ${p.slug}\ndescription: ${JSON.stringify(p.description)}\nlicense: ${p.license}\n---\n\n# ${p.name}\n\nRun the source workflow in order. Preserve source references, exceptions and human approval gates. Publication alone never proves model/runtime qualification. Check the registry report for this exact version and supported runtime before use; candidate model fingerprints in references/candidate-models.json are not approvals.\n\nFrom this skill directory, run npm ci --ignore-scripts, then:\n\n\`\`\`sh\nnode --experimental-strip-types scripts/run-playbook.ts --playbook ${p.slug} --inputs-file /absolute/authorized-inputs.json --gateway\n\`\`\`\n\nConfigure AI_GATEWAY_BASE_URL (http://127.0.0.1:PORT only), AI_GATEWAY_API_KEY, AI_GATEWAY_MODEL (absolute pinned snapshot path), and LOCAL_MODEL_PYTHON (absolute Python path) privately. The included runtime-profile.json restricts actual local file and SDK fingerprints, server health and response model; it is candidate configuration, not approval. Use the pinned MLX server offline with thinking disabled and max-tokens 768. The loopback health check is not cryptographic attestation of another process. Finance additionally requires --semantic-source-facts --allow-typesafe-source-upload and private TYPESAFE_API_KEY; original source fields are sent to TypeSafe, never to Lovable. No tools are executed by this instruction adapter. Without --gateway the CLI uses explicit mock responses, which are never model evaluation or approval evidence. The machine-readable workflow is content/playbooks/${p.slug}.yaml; the included CLI and runtime implement the actual graph. A completed sequence is not evidence of external posting, payment, sending, testing or sign-off.\n`,
  };
  for (const path of SOLUTION_RUNTIME_FILES)
    files[`${root}/${path === "LICENSE" ? "LICENSE.txt" : path}`] = text(path);
  ArtifactFilesSchema.parse(files);
  const conformance = runPluginConformance(new Map(Object.entries(files)));
  if (!conformance.conformant)
    throw new Error(
      `Nonconformant solution archive: ${p.slug}: ${JSON.stringify(conformance.checks.filter((c) => c.status === "fail"))}`,
    );
  return { slug: p.slug, version: p.version, files, sha256: artifactDigest(files) };
}

/** The verifier reads only known archive members, never paths supplied by evidence. */
export function verifySolutionPlaybookSnapshot(
  source: string,
  binding: { sha256: string; fileHashes: Record<string, string> },
  root: string,
) {
  const artifact = buildSolutionPlaybookFiles(source);
  const hashes = Object.fromEntries(
    Object.entries(artifact.files).map(([path, body]) => [
      path,
      createHash("sha256").update(body).digest("hex"),
    ]),
  );
  if (
    artifact.sha256 !== binding?.sha256 ||
    JSON.stringify(hashes) !== JSON.stringify(binding.fileHashes)
  )
    throw new Error("Changed package artifact binding");
  for (const [path, expected] of Object.entries(hashes))
    if (
      createHash("sha256")
        .update(text(join(root, path)))
        .digest("hex") !== expected
    )
      throw new Error(`Changed packaged runtime snapshot: ${path}`);
  return artifact;
}
