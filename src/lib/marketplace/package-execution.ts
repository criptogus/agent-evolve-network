import type { Package } from "../../data/packages.ts";
import { agentPluginZipUrl } from "../skills/open-skills.ts";
export function packagedExecution(pkg: Pick<Package, "id" | "latest" | "compatibility">) {
  const supported = pkg.compatibility.filter((c) => c.status === "supported");
  const source = supported.find((c) =>
    /^typesafe\/[^/]+\/[^/]*-source-state-v\d+@node-/.test(c.runtime),
  );
  const local = supported.find(
    (c) =>
      c.runtime.startsWith("mlx-community/") && c.runtime.endsWith("/redact-route-generate-v1"),
  );
  const target = source ?? local;
  return target
    ? {
        kind: source ? ("source-state" as const) : ("local-model" as const),
        runtime: target.runtime,
        zipUrl: agentPluginZipUrl(pkg.id),
        version: pkg.latest,
      }
    : null;
}
export function packageInstallPreview(pkg: Package, gatewayUrl: string) {
  const execution = packagedExecution(pkg);
  if (execution)
    return [
      "# Download the complete evaluated bundle:",
      `curl -fL ${execution.zipUrl} -o ${pkg.id}.zip`,
      `# Version: ${pkg.latest}`,
      `# Evaluated runtime: ${execution.runtime}`,
      `# Unpack and follow ${pkg.id}/skills/${pkg.id}/SKILL.md.`,
      "# Keep its runtime profile and explicit source-upload consent.",
      "# Prompt copying or MCP access alone is not this evaluated execution.",
    ].join("\n");
  return [
    `$ npx super-agent install ${pkg.id}`,
    "",
    `→ resolving ${pkg.id}@${pkg.latest}`,
    `→ runtimes ......... ${
      pkg.compatibility
        .filter((c) => c.status === "supported")
        .map((c) => c.runtime)
        .join(", ") || "No supported runtime declared"
    }`,
    `→ scopes ........... ${pkg.scopes.join(", ") || "none"}`,
    `→ size ............. ${pkg.size}`,
    "",
    `✓ ${pkg.name} is available to your agent`,
    "",
    "# MCP transport endpoint:",
    `# ${gatewayUrl}`,
  ].join("\n");
}
