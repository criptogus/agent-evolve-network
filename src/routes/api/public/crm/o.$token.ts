import { createFileRoute } from "@tanstack/react-router";

/** 1x1 open-tracking pixel. Token-scoped, no customer data in the URL. */
const GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

export const Route = createFileRoute("/api/public/crm/o/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = String(params.token ?? "");
        if (/^[a-f0-9]{16,128}$/.test(token)) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await (supabaseAdmin as any).rpc("crm_track_open", { _token: token });
          } catch {
            /* tracking must never break the email */
          }
        }
        return new Response(GIF, {
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, max-age=0",
            "Content-Length": String(GIF.byteLength),
          },
        });
      },
    },
  },
});
