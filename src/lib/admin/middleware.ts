import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase: _sbCtx, userId  } = context as any;
    const supabase = _sbCtx as any; userId: string };
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (error) throw new Response(`Role check failed: ${error.message}`, { status: 500 });
    if (!data) throw new Response("Forbidden: admin role required", { status: 403 });
    return next({ context: { isAdmin: true as const } });
  });
