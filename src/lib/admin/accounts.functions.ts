import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./middleware";

// Used by the admin layout guard.
export const getMyAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return { isAdmin: !!data, userId };
  });

// Bootstrap: if there is no admin yet, the first signed-in user can claim the role.
export const claimAdminBootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any;
    const { count, error: cErr } = await supabase
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Response(cErr.message, { status: 500 });
    if ((count ?? 0) > 0) {
      throw new Response("Admin already exists", { status: 409 });
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().max(120).optional() }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    let q = supabase
      .from("profiles")
      .select("id, display_name, handle, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) {
      q = q.or(`handle.ilike.%${data.search}%,display_name.ilike.%${data.search}%`);
    }
    const { data: profiles, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });

    const ids = (profiles ?? []).map((p: any) => p.id);
    if (ids.length === 0) return { accounts: [] };

    const [{ data: roles }, { data: aps }, { data: plans }, { data: runs }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      supabase.from("account_plans").select("user_id, plan_id, status").in("user_id", ids),
      supabase.from("plans").select("id, slug, name"),
      supabase.from("runs").select("user_id").in("user_id", ids),
    ]);

    const planById = new Map((plans ?? []).map((p: any) => [p.id, p]));
    const accounts = (profiles ?? []).map((p: any) => {
      const userRoles = (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role);
      const ap = (aps ?? []).find((a: any) => a.user_id === p.id);
      const plan = ap ? planById.get(ap.plan_id) : null;
      const runCount = (runs ?? []).filter((r: any) => r.user_id === p.id).length;
      return { ...p, roles: userRoles, plan, runCount };
    });
    return { accounts };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "publisher", "user"]),
        grant: z.boolean(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    if (data.grant) {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error && !error.message.includes("duplicate")) {
        throw new Response(error.message, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Response(error.message, { status: 500 });
    }
    return { ok: true };
  });

export const setUserPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), planId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase: _sbCtx } = context as any;
    const supabase = _sbCtx as any;
    const { error } = await supabase
      .from("account_plans")
      .upsert(
        { user_id: data.userId, plan_id: data.planId, status: "active", updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
