import { createFileRoute } from "@tanstack/react-router";
import ring from "../../../../security/signing-keys.json" with { type: "json" };
import { parseKeyring } from "@/lib/trust/keyring";
export const Route = createFileRoute("/api/public/signing-keys.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(parseKeyring(ring)), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
