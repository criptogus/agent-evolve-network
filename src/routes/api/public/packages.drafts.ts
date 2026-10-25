import { readAuthoredBody } from "@/lib/authoring/body";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractBearer, verifyBearer } from "@/lib/auth/bearer.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { submitAuthoredDocument } from "@/lib/authoring/submission";
const reply = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
export const Route = createFileRoute("/api/public/packages/drafts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = extractBearer(request);
        if (!token) return reply({ error: "unauthorized" }, 401);
        const auth = await verifyBearer(token);
        if (!auth) return reply({ error: "unauthorized" }, 401);
        if (auth.source === "oauth" && !auth.scope?.split(/\s+/).includes("mcp:write"))
          return reply({ error: "insufficient_scope" }, 403);
        let bytes: string;
        try {
          bytes = await readAuthoredBody(request);
        } catch {
          return reply({ error: "body_too_large_or_invalid" }, 413);
        }
        try {
          const { source } = z
            .object({ source: z.string().min(1).max(200000) })
            .strict()
            .parse(JSON.parse(bytes));
          return reply(await submitAuthoredDocument(supabaseAdmin, auth.user_id, source), 201);
        } catch {
          return reply(
            {
              error: "invalid_or_conflicting_draft",
              hint: "Validate with super-agent eval; existing public versions cannot be replaced.",
            },
            400,
          );
        }
      },
    },
  },
});
