import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  checkLocalMetadata,
  validateLocalGatewayHealth,
  textOnlyContent,
  localGatewayUrl,
  verifyLocalModel,
  type LocalModelContract,
} from "../src/lib/runtime/local-model-contract.ts";
const metadata = {
  python: "3.12.15",
  architecture: "arm64",
  mlx: "0.32.0",
  mlx_vlm: "0.6.13",
  server_sources: { "server.py": "pinned" },
};
const profile: LocalModelContract = {
  ...metadata,
  model: "candidate@revision",
  revision: "revision",
  tool_parser_capability: null,
  weights_sha256: {},
  model_files_sha256: {},
  server_sources_sha256: createHash("sha256")
    .update(JSON.stringify(metadata.server_sources))
    .digest("hex"),
};
test("packaged local contract rejects changed SDK, architecture and server source even with matching version strings", () => {
  assert.doesNotThrow(() => checkLocalMetadata(profile, metadata));
  for (const key of ["python", "architecture", "mlx", "mlx_vlm"])
    assert.throws(() => checkLocalMetadata(profile, { ...metadata, [key]: "changed" }));
  assert.throws(() =>
    checkLocalMetadata(profile, { ...metadata, server_sources: { "server.py": "modified" } }),
  );
});
test("packaged gateway accepts explicit loopback only and rejects credentials, redirects and alternate origin shapes", () => {
  assert.equal(localGatewayUrl("http://127.0.0.1:8765"), "http://127.0.0.1:8765");
  for (const url of [
    "https://example.com",
    "http://localhost:8765",
    "http://127.0.0.1",
    "http://127.0.0.1:8765/v1",
    "http://user:pass@127.0.0.1:8765",
    "http://127.0.0.1:8765?redirect=1",
    "http://127.0.0.1:8765#fragment",
  ])
    assert.throws(() => localGatewayUrl(url));
});
test("packaged model rejects relative paths or another revision before reading files or starting Python", async () => {
  await assert.rejects(verifyLocalModel(profile, "relative/revision", "/no-python"));
  await assert.rejects(verifyLocalModel(profile, "/model/another-revision", "/no-python"));
  await assert.rejects(verifyLocalModel(profile, "/model/revision", "relative-python"));
});

test("gateway capability must match the pinned model and never permits tools or adapters", () => {
  const health = {
    status: "healthy",
    loaded_model: "/cached/revision",
    loaded_adapter: null,
    loaded_tool_parser: "qwen3_coder",
  };
  const q = { ...profile, tool_parser_capability: "qwen3_coder" };
  assert.doesNotThrow(() => validateLocalGatewayHealth(q, health, "/cached/revision"));
  for (const altered of [
    { ...health, loaded_tool_parser: "unlisted" },
    { ...health, loaded_adapter: "adapter" },
    { ...health, loaded_model: "different" },
  ])
    assert.throws(() => validateLocalGatewayHealth(q, altered, "/cached/revision"));
  assert.throws(() => validateLocalGatewayHealth(profile, health, "/cached/revision"));
  for (const message of [
    { content: "draft", tool_calls: [{}] },
    { content: "draft", tool_calls: "malformed" },
    { content: "draft", function_call: {} },
    { content: "" },
  ])
    assert.throws(() => textOnlyContent(message));
  assert.equal(
    textOnlyContent({ content: "  unchanged draft  ", tool_calls: [] }),
    "  unchanged draft  ",
  );
});
