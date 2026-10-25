/** Honest local configuration boundary; not remote attestation or model approval. */
import { createHash } from "node:crypto";
import { createReadStream, readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { spawnSync } from "node:child_process";
export type LocalModelContract = {
  model: string;
  revision: string;
  python: string;
  architecture: string;
  mlx: string;
  mlx_vlm: string;
  weights_sha256: Record<string, string>;
  model_files_sha256: Record<string, string>;
  server_sources_sha256: string;
  tool_parser_capability: string | null;
};
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function checkLocalMetadata(profile: LocalModelContract, metadata: Record<string, unknown>) {
  for (const k of ["python", "architecture", "mlx", "mlx_vlm"] as const)
    if (metadata[k] !== profile[k]) throw new Error("Packaged runtime version mismatch");
  if (digest(metadata.server_sources) !== profile.server_sources_sha256)
    throw new Error("Packaged server source mismatch");
}
export function localGatewayUrl(base: string) {
  const url = new URL(base);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !url.port ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Packaged workflow requires an explicit IPv4 loopback gateway");
  return url.origin;
}
export async function verifyLocalModel(
  profile: LocalModelContract,
  modelPath: string,
  python: string,
) {
  if (!isAbsolute(modelPath) || !isAbsolute(python) || !modelPath.endsWith(`/${profile.revision}`))
    throw new Error(
      "Packaged workflow requires exact cached model revision and absolute local Python",
    );
  const names = readdirSync(modelPath)
    .filter((p) => p.endsWith(".safetensors"))
    .sort();
  if (JSON.stringify(names) !== JSON.stringify(Object.keys(profile.weights_sha256).sort()))
    throw new Error("Packaged model weight set mismatch");
  const result = spawnSync(
    python,
    [
      "-c",
      "import json,platform,importlib.metadata as m,mlx_vlm.server,pathlib,hashlib; root=pathlib.Path(mlx_vlm.server.__file__).parent; print(json.dumps({'python':platform.python_version(),'architecture':platform.machine(),'mlx':m.version('mlx'),'mlx_vlm':m.version('mlx-vlm'),'server_sources':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*.py'))}}))",
    ],
    {
      encoding: "utf8",
      timeout: 30000,
      env: { ...process.env, HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1" },
    },
  );
  if (result.status !== 0) throw new Error("Packaged local runtime inspection failed");
  const metadata: Record<string, unknown> = JSON.parse(result.stdout);
  checkLocalMetadata(profile, metadata);
  for (const [name, expected] of Object.entries({
    ...profile.weights_sha256,
    ...profile.model_files_sha256,
  })) {
    if (!/^[\w.-]+$/.test(name)) throw new Error("Invalid model member");
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(join(modelPath, name))) hash.update(chunk);
    if (hash.digest("hex") !== expected) throw new Error("Packaged model file mismatch");
  }
  return {
    model: profile.model,
    modelPath,
    runtime: metadata,
    files: { ...profile.weights_sha256, ...profile.model_files_sha256 },
  };
}

/** Health reports a tokenizer capability; tool authorization is enforced per request/response. */
export function validateLocalGatewayHealth(
  profile: LocalModelContract,
  health: unknown,
  modelPath: string,
) {
  if (!health || typeof health !== "object" || Array.isArray(health))
    throw new Error("Invalid local gateway health");
  const h = health as Record<string, unknown>;
  if (
    !Object.hasOwn(profile, "tool_parser_capability") ||
    h.status !== "healthy" ||
    h.loaded_model !== modelPath ||
    h.loaded_adapter !== null ||
    h.loaded_tool_parser !== profile.tool_parser_capability
  )
    throw new Error("Local gateway health/model/capability mismatch");
}
/** Return the unchanged draft text only. No model-selected function can become a host action. */
export function textOnlyContent(message: unknown): string {
  if (!message || typeof message !== "object" || Array.isArray(message))
    throw new Error("Invalid generation message");
  const m = message as Record<string, unknown>,
    calls = m.tool_calls;
  if (
    (calls !== undefined && calls !== null && (!Array.isArray(calls) || calls.length !== 0)) ||
    (m.function_call !== undefined && m.function_call !== null)
  )
    throw new Error("Unexpected structured tool call in text-only generation");
  if (typeof m.content !== "string" || !m.content.trim())
    throw new Error("gateway empty generation");
  return m.content;
}
