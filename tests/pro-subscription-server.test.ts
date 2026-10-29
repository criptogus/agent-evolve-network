import { test } from "node:test";
import assert from "node:assert/strict";
import { hasProSubscription } from "../src/lib/auth/pro-subscription.server.ts";
import type { AppDatabaseClient } from "../src/integrations/supabase/database.ts";

test("server Pro gate filters by verified user, environment and explicit Pro prices", async () => {
  const filters: Record<string, unknown> = {};
  const query = {
    select() { return query; },
    eq(key: string, value: unknown) { filters[key] = value; return query; },
    async in(key: string, values: string[]) {
      filters[key] = values;
      return { error: null, data: [{ price_id: "sak_pro_monthly", status: "active", current_period_end: null }] };
    },
  };
  const client = { from: () => query } as unknown as AppDatabaseClient;
  assert.equal(await hasProSubscription(client, "verified-user", "sandbox"), true);
  assert.equal(filters.user_id, "verified-user");
  assert.equal(filters.environment, "sandbox");
  assert.deepEqual(filters.price_id, ["sak_pro_monthly", "sak_pro_yearly", "agent_pass_pro_monthly", "agent_pass_pro_yearly"]);
});

test("server gate denies standalone Agent Pass even if returned by the database", async () => {
  const query = {
    select() { return query; },
    eq() { return query; },
    async in() { return { error: null, data: [{ price_id: "sak_agent_pass_monthly", status: "active", current_period_end: null }] }; },
  };
  const client = { from: () => query } as unknown as AppDatabaseClient;
  assert.equal(await hasProSubscription(client, "verified-user", "live"), false);
});