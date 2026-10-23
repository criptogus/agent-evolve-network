import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://superagentskill.com";

/** Click tracker: records the click and 302s to the internal destination. */
export const Route = createFileRoute("/api/public/crm/c/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = String(params.token ?? "");
        let path = "/home";
        if (/^[a-f0-9]{16,128}$/.test(token)) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data } = await (supabaseAdmin as any).rpc("crm_track_click", { _token: token });
            // Only internal paths are ever followed.
            if (typeof data === "string" && /^\/[A-Za-z0-9\-._~/]*$/.test(data)) path = data;
          } catch {
            /* fall back to the dashboard */
          }
        }
        return new Response(null, {
          status: 302,
          headers: { Location: `${SITE_URL}${path}`, "Cache-Control": "no-store" },
        });
      },
    },
  },
});
