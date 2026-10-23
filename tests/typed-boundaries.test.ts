import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseEnvelope } from "../packages/sdk-ts/src/protocol.ts";
import { errorField } from "../src/lib/errors.ts";
import { toJson, recordOf } from "../src/lib/json.ts";
import { JsonSchema } from "../src/lib/json-schema.ts";
import { QueuedEmailSchema } from "../src/lib/email-templates/queue-payload.ts";
import { decodeAgentBuild, encodeAgentBuildPatch } from "../src/lib/agents/build-data.ts";
import { verifyWebhook } from "../src/lib/stripe.server.ts";
import { ExecutionEventSchema, ingestExecution } from "../src/lib/trust/telemetry.ts";
import { telemetrySink } from "../src/lib/trust/telemetry-sink.server.ts";
import type { AppDatabaseClient, Row } from "../src/integrations/supabase/database.ts";

test("RPC envelopes tolerate invalid JSON and ignore malformed content entries", () => {
  assert.equal(parseEnvelope("invalid"), null);
  assert.equal(parseEnvelope("null"), null);
  const result = parseEnvelope(
    JSON.stringify({
      result: {
        content: [null, 3, { type: "text", text: "ok" }, { type: 4 }, { type: "image", text: 5 }],
        isError: false,
      },
    }),
  );
  assert.deepEqual(result?.result?.content, [
    { type: "text", text: "ok" },
    { type: "image", text: undefined },
  ]);
  assert.equal(result?.result?.isError, false);
  assert.deepEqual(
    parseEnvelope('{"error":{"message":"Denied","code":401,"data":{"tokens_url":"x"}}}')?.error,
    { message: "Denied", code: 401, data: { tokens_url: "x" } },
  );
});
test("unknown errors and JSON retain values without granting arbitrary property access", () => {
  assert.equal(errorField(new Error("bad")), "bad");
  assert.equal(errorField({ message: 12 }), undefined);
  assert.deepEqual(recordOf(null), {});
  assert.deepEqual(recordOf([]), {});
  assert.deepEqual(toJson({ date: new Date("2026-01-01T00:00:00Z"), missing: undefined }), {
    date: "2026-01-01T00:00:00.000Z",
  });
  assert.throws(() => toJson(undefined));
  assert.equal(JsonSchema.safeParse({ n: Infinity }).success, false);
});
test("queue payload rejects malformed recipients and accepts existing valid messages", () => {
  const message = {
    to: "user@example.test",
    from: "App <notify@example.test>",
    subject: "Subject",
    html: "<p>ok</p>",
    text: "ok",
    queued_at: "2026-01-01T00:00:00Z",
  };
  assert.deepEqual(QueuedEmailSchema.parse(message), message);
  assert.equal(QueuedEmailSchema.safeParse({ ...message, to: 42 }).success, false);
});
test("agent build JSON is validated and encoded without dropping typed content", () => {
  const row = {
    brief: { role: "Analyst", company: "Example" },
    skills: [],
    playbooks: [],
    guardrails: [],
    research_sources: [],
    report: { principles: ["Verify"], first_pass: null },
  } as unknown as Row<"agent_builds">;
  const decoded = decodeAgentBuild(row);
  assert.deepEqual(decoded.report.principles, ["Verify"]);
  assert.equal(decoded.report.first_pass, null);
  assert.deepEqual(encodeAgentBuildPatch({ report: decoded.report, skills: decoded.skills }), {
    report: row.report,
    skills: [],
  });
  assert.throws(() => decodeAgentBuild({ ...row, skills: [{ body: "Missing required fields" }] }));
});
test("telemetry writes exactly once to the authoritative RPC with typed outcome fields", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: "execution-id", error: null };
    },
  } as unknown as AppDatabaseClient;
  const event = ExecutionEventSchema.parse({
    package_slug: "test-skill",
    workspace_id: "private-workspace",
    success: false,
    error_class: "timeout",
    arm: "treatment",
    task_completed: false,
    user_rating: 0,
  });
  const row = await ingestExecution(event, telemetrySink(client, "model-fixture"));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "report_skill_execution");
  assert.equal(calls[0].args._error_kind, "timeout");
  assert.equal(calls[0].args._model, "model-fixture");
  assert.equal(calls[0].args._task_completed, false);
  assert.equal(calls[0].args._user_rating, 0);
  assert.equal(calls[0].args._workspace_hash, row.workspace_hash);
  assert.notEqual(row.workspace_hash, "private-workspace");
  assert.equal("package_version" in calls[0].args, false);
});
test("Stripe verification preserves signed event and rejects invalid signature/timestamp", async () => {
  const secret = "fixture-secret";
  const old = process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
  process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = secret;
  try {
    const payload = JSON.stringify({
      id: "evt_fixture",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_fixture", object: "subscription" } },
    });
    const request = (timestamp: string, body = payload, signature?: string) =>
      new Request("https://example.test/webhook", {
        method: "POST",
        body,
        headers: {
          "stripe-signature": `t=${timestamp},v1=${signature ?? createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`,
        },
      });
    const timestamp = String(Math.floor(Date.now() / 1000));
    assert.equal((await verifyWebhook(request(timestamp), "sandbox")).id, "evt_fixture");
    await assert.rejects(() => verifyWebhook(request(timestamp, payload, "invalid"), "sandbox"));
    await assert.rejects(() => verifyWebhook(request("NaN"), "sandbox"));
    await assert.rejects(() => verifyWebhook(request("1"), "sandbox"));
    await assert.rejects(() =>
      verifyWebhook(request(timestamp, '{"type":"event","data":null}'), "sandbox"),
    );
  } finally {
    if (old === undefined) delete process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
    else process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = old;
  }
});

test("Stripe gateway retains pinned API version and authentication headers without network", async () => {
  const { createStripeClient } = await import("../src/lib/stripe.server.ts");
  const previousFetch = globalThis.fetch;
  const oldConnection = process.env.STRIPE_SANDBOX_API_KEY;
  const oldLovable = process.env.LOVABLE_API_KEY;
  process.env.STRIPE_SANDBOX_API_KEY = "fixture-connection";
  process.env.LOVABLE_API_KEY = "fixture-lovable";
  const requests: Array<{ url: string; headers: Headers }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), headers: new Headers(init?.headers) });
    return Response.json({ object: "list", data: [], has_more: false, url: "/v1/prices" });
  };
  try {
    await createStripeClient("sandbox").prices.list({ limit: 1 });
    assert.equal(requests.length, 1);
    assert.ok(requests[0].url.startsWith("https://connector-gateway.lovable.dev/stripe/v1/prices"));
    assert.equal(requests[0].headers.get("stripe-version"), "2026-03-25.dahlia");
    assert.equal(requests[0].headers.get("x-connection-api-key"), "fixture-connection");
    assert.equal(requests[0].headers.get("lovable-api-key"), "fixture-lovable");
  } finally {
    globalThis.fetch = previousFetch;
    if (oldConnection === undefined) delete process.env.STRIPE_SANDBOX_API_KEY;
    else process.env.STRIPE_SANDBOX_API_KEY = oldConnection;
    if (oldLovable === undefined) delete process.env.LOVABLE_API_KEY;
    else process.env.LOVABLE_API_KEY = oldLovable;
  }
});

test("reauthentication validates its token without requiring an unused confirmation URL", async () => {
  const { AuthEmailDataSchema } = await import("../src/lib/email-templates/auth-data.ts");
  assert.equal(
    AuthEmailDataSchema.safeParse({
      action_type: "reauthentication",
      email: "user@example.test",
      token: "123456",
    }).success,
    true,
  );
  assert.equal(
    AuthEmailDataSchema.safeParse({ action_type: "reauthentication", email: "user@example.test" })
      .success,
    false,
  );
  assert.equal(
    AuthEmailDataSchema.safeParse({ action_type: "signup", email: "user@example.test" }).success,
    false,
  );
  assert.equal(
    AuthEmailDataSchema.safeParse({
      action_type: "signup",
      email: "user@example.test",
      url: "https://example.test/confirm",
    }).success,
    true,
  );
});
