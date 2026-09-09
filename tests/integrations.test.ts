import { test } from "node:test";
import assert from "node:assert/strict";

const { loadIntegrations, getAction, executeAction, IntegrationError, buildToolInvoker } =
  await import("../src/lib/integrations/registry.ts");

test("loads seed integrations", () => {
  const m = loadIntegrations();
  for (const slug of ["github", "slack", "linear", "datadog"]) {
    assert.ok(m.has(slug), `missing ${slug}`);
  }
});

test("action paths interpolate and inputs not in path go to body", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const res = await executeAction({
    install: {
      workspace_id: "w", integration_slug: "github",
      credentials: { access_token: "tok" }, granted_scopes: ["repo", "read:user", "read:org"],
    },
    action_id: "create_comment",
    inputs: { owner: "acme", repo: "x", number: 42, body: "hi" },
    options: { fetchImpl, protectDestructive: true },
  });
  assert.equal(res.status, 200);
  assert.equal(captured.url, "https://api.github.com/repos/acme/x/issues/42/comments");
  assert.equal(captured.init.headers["authorization"], "Bearer tok");
  assert.deepEqual(JSON.parse(captured.init.body), { body: "hi" });
});

test("destructive actions are blocked by default", async () => {
  await assert.rejects(
    () => executeAction({
      install: {
        workspace_id: "w", integration_slug: "github",
        credentials: { access_token: "t" }, granted_scopes: ["repo", "read:user", "read:org"],
      },
      action_id: "delete_branch",
      inputs: { owner: "a", repo: "b", branch: "main" },
      options: { fetchImpl: async () => new Response("ok"), protectDestructive: true },
    }),
    (e) => e instanceof IntegrationError && e.code === "DESTRUCTIVE_BLOCKED",
  );
});

test("missing OAuth scope is rejected", async () => {
  await assert.rejects(
    () => executeAction({
      install: {
        workspace_id: "w", integration_slug: "github",
        credentials: { access_token: "t" }, granted_scopes: ["repo"], // missing read:user/read:org
      },
      action_id: "list_issues",
      inputs: { owner: "a", repo: "b" },
      options: { fetchImpl: async () => new Response("ok") },
    }),
    (e) => e.code === "MISSING_SCOPE",
  );
});

test("api_key integration uses the configured header", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = init; return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
  };
  await executeAction({
    install: {
      workspace_id: "w", integration_slug: "datadog",
      credentials: { api_key: "ddk" },
    },
    action_id: "list_monitors",
    inputs: {},
    options: { fetchImpl },
  });
  assert.equal(captured.headers["dd-api-key"], "ddk");
});

test("buildToolInvoker bridges runtime tool refs", async () => {
  const inv = buildToolInvoker(async () => ({
    workspace_id: "w", integration_slug: "slack",
    credentials: { access_token: "t" }, granted_scopes: ["chat:write", "channels:read", "users:read"],
  }), { fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }) });
  const res = await inv({ name: "slack.list_channels", inputs: {} });
  assert.equal(res.status, 200);
});

test("missing path param raises MISSING_PARAM", async () => {
  await assert.rejects(
    () => executeAction({
      install: {
        workspace_id: "w", integration_slug: "github",
        credentials: { access_token: "t" }, granted_scopes: ["repo", "read:user", "read:org"],
      },
      action_id: "get_pull_request",
      inputs: { owner: "a" }, // missing repo, number
      options: { fetchImpl: async () => new Response("ok") },
    }),
    (e) => e.code === "MISSING_PARAM",
  );
});
