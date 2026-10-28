import { createFileRoute } from "@tanstack/react-router";
import securityTxt from "../../public/.well-known/security.txt?raw";

// Explicit route as well as the public asset: dot directories may bypass static serving.
export const Route = createFileRoute("/.well-known/security.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(securityTxt, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        }),
    },
  },
});
