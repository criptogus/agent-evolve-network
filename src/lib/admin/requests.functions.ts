import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./middleware";
import { generateDraft, insertDraftPackage } from "./author.server";
import { webResearch } from "./research.server";

// Authenticated users (and their agents) request a missing primitive.
export const requestMissingPrimitive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        brief: z.string().min(10).max(2000),
        kind: z.enum(["skill", "playbook", "soul", "guardrail"]),
        industry: z.string().max(120).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("package_requests")
      .insert({
        requester_id: userId,
        brief: data.brief,
        kind: data.kind,
        industry: data.industry ?? null,
        status: "new",
      })
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    return { request: row };
  });

export const listRequests = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const { data, error } = await supabase
      .from("package_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Response(error.message, { status: 500 });
    return { requests: data ?? [] };
  });

export const processRequest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: req, error: rErr } = await supabase
      .from("package_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (rErr || !req) throw new Response("Request not found", { status: 404 });

    await supabase.from("package_requests").update({ status: "researching" }).eq("id", data.id);

    try {
      const topic = `${req.brief}${req.industry ? ` (industry: ${req.industry})` : ""}`;
      const research = await webResearch(topic, req.kind);

      await supabase
        .from("package_requests")
        .update({
          status: "drafting",
          research_summary: research.summary,
          research_sources: research.sources as any,
        })
        .eq("id", data.id);

      const groundingText = [
        research.summary,
        research.best_practices?.length ? `Best practices:\n- ${research.best_practices.join("\n- ")}` : "",
        research.sources?.length
          ? `Sources:\n- ${research.sources.map((s) => `${s.title}${s.url ? ` (${s.url})` : ""}`).join("\n- ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const draft = await generateDraft(req.brief, req.kind, req.industry ?? undefined, groundingText);

      const pkg = await insertDraftPackage(supabase, userId, draft, {
        source_kind: "request",
        source_ref: req.id,
      });

      await supabase
        .from("package_requests")
        .update({ status: "draft_ready", generated_package_id: pkg.id })
        .eq("id", data.id);

      return { request_id: data.id, package: pkg, research };
    } catch (e: any) {
      await supabase
        .from("package_requests")
        .update({ status: "rejected", evaluation: { error: e?.message ?? "failed" } as any })
        .eq("id", data.id);
      throw new Response(e?.message ?? "Process failed", { status: 500 });
    }
  });

export const publishRequestPackage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: req } = await supabase
      .from("package_requests")
      .select("generated_package_id")
      .eq("id", data.id)
      .single();
    if (!req?.generated_package_id) throw new Response("No draft to publish", { status: 400 });
    await supabase.from("packages").update({ is_published: true }).eq("id", req.generated_package_id);
    await supabase.from("package_requests").update({ status: "published" }).eq("id", data.id);
    return { ok: true };
  });
