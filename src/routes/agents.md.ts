import { createFileRoute } from "@tanstack/react-router";

/**
 * Legacy path. This file used to be named `agents.md.ts`, which TanStack maps to
 * `/agents/md` — that is exactly why `/agents.md` used to 404 while llms.txt
 * promised it. The real manual now lives in `agents[.]md.ts`; this permanently
 * redirects anything that already followed the old URL.
 */
export const Route = createFileRoute("/agents/md")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 301,
          headers: { Location: "/agents.md", "Cache-Control": "public, max-age=3600" },
        }),
      HEAD: async () =>
        new Response(null, { status: 301, headers: { Location: "/agents.md" } }),
    },
  },
});
