import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";
import { toJson } from "../json";
import { z } from "zod";
import { requireSupabaseAuth } from "../../integrations/supabase/auth-middleware";
import { supabaseAdmin } from "../../integrations/supabase/client.server";
import type { AppDatabaseClient } from "../../integrations/supabase/database";
import { embedQueries, embeddingSourceInput, resolveEmbeddingConfig } from "./embedding";
async function requireAdmin(client: AppDatabaseClient, actor: string) {
  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", actor)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Response("Forbidden", { status: 403 });
}
export const semanticIndexStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ requestId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ context, data: input }) => {
    await requireAdmin(context.supabase, context.userId);
    let config;
    try {
      config = resolveEmbeddingConfig(process.env);
    } catch {
      return {
        attempt: null,
        configured: false,
        model: null,
        eligible: 0,
        indexed: 0,
        ready: false,
        inflight: false,
        environmentDisabled: process.env.SEMANTIC_SEARCH_ENABLED === "false",
      };
    }
    const { data, error } = await supabaseAdmin.rpc("search_embedding_index_status", {
      _model: config.model,
    });
    if (error || !data?.[0]) throw new Error("Semantic index migration unavailable");
    const attempt = input.requestId
      ? await supabaseAdmin.rpc("get_search_embedding_attempt", { _attempt: input.requestId })
      : null;
    if (attempt?.error) throw new Error("Index attempt status unavailable");
    return {
      attempt: attempt?.data?.[0] ?? null,
      configured: true,
      model: config.model,
      ...data[0],
      environmentDisabled: process.env.SEMANTIC_SEARCH_ENABLED === "false",
    };
  });
export const indexSemanticBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        maximumPackages: z.number().int().min(1).max(25),
        requestId: z.string().uuid(),
        expectedModel: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const config = resolveEmbeddingConfig(process.env);
    if (config.model !== data.expectedModel)
      throw new Error("Embedding model changed; refresh before requesting a batch");
    const { data: packages, error } = await supabaseAdmin
      .from("packages")
      .select("id,slug,name,description,long_description,latest_version")
      .eq("is_published", true)
      .eq("review_status", "approved")
      .order("slug")
      .limit(2001);
    if (error || !packages?.length || packages.length > 2000)
      throw new Error("Missing or oversized approved catalog; no provider request started");
    const { data: index, error: indexError } = await supabaseAdmin
      .from("package_embeddings")
      .select("package_id,version,model,source_sha256");
    if (indexError) throw new Error("Semantic index unavailable; no provider request started");
    const pending = packages
      .map((p) => {
        const input = embeddingSourceInput(p);
        return { p, input, hash: createHash("sha256").update(input).digest("hex") };
      })
      .filter(
        ({ p, hash }) =>
          !index?.some(
            (e) =>
              e.package_id === p.id &&
              e.version === p.latest_version &&
              e.model === config.model &&
              e.source_sha256 === hash,
          ),
      );
    if (!pending.length) throw new Error("No pending packages; no provider request started");
    const batch = pending.slice(0, data.maximumPackages);
    const { data: attempt, error: reserveError } = await supabaseAdmin.rpc(
      "reserve_search_embedding_batch",
      { _model: config.model, _attempt: data.requestId },
    );
    if (reserveError || !attempt)
      throw new Error("An earlier index request is unresolved; no new provider request started");
    const receipt = await embedQueries(
      batch.map((p) => p.input),
      config,
      fetch,
      15000,
    );
    const { data: inserted, error: writeError } = await supabaseAdmin.rpc(
      "complete_search_embedding_batch",
      {
        _attempt: attempt,
        _entries: toJson(
          batch.map(({ p, hash }, i) => ({
            package_id: p.id,
            version: p.latest_version,
            source_sha256: hash,
            embedding: JSON.stringify(receipt.vectors[i]),
          })),
        ),
        _receipt: toJson({
          pendingBefore: pending.length,
          model: config.model,
          reportedModel: receipt.reportedModel,
          dimensions: 1536,
          usage: receipt.usage,
          slugs: batch.map(({ p }) => p.slug),
          providerRequests: 1,
        }),
      },
    );
    if (writeError)
      throw new Error("Index write failed after a provider request; reconcile before any retry");
    return {
      requestId: data.requestId,
      indexed: inserted ?? 0,
      pendingBefore: pending.length,
      providerRequests: 1,
      model: config.model,
      reportedModel: receipt.reportedModel,
      dimensions: 1536,
      usage: receipt.usage,
      slugs: batch.map(({ p }) => p.slug),
    };
  });
