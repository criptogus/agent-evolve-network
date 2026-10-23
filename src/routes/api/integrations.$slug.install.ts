import { createFileRoute } from "@tanstack/react-router";
import { getIntegration } from "@/lib/integrations/registry";

// Returns the OAuth authorize URL (or env-key install instructions) for a given
// integration. The actual callback handler that exchanges the code for tokens
// lives behind /api/oauth/<provider>/callback and is provider-specific.
//
// GET /api/integrations/<slug>/install?workspace_id=...&redirect_uri=...

export const Route = createFileRoute("/api/integrations/$slug/install")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const integ = getIntegration(params.slug);
        if (!integ) return new Response("not found", { status: 404 });

        const url = new URL(request.url);
        const workspaceId = url.searchParams.get("workspace_id");
        const redirectUri = url.searchParams.get("redirect_uri");
        if (!workspaceId || !redirectUri) {
          return Response.json({ error: "workspace_id and redirect_uri required" }, { status: 400 });
        }

        if (integ.auth.kind === "oauth2" && integ.auth.oauth2) {
          const o = integ.auth.oauth2;
          const state = `${workspaceId}.${crypto.randomUUID()}`;
          const authorize = new URL(o.authorize_url);
          authorize.searchParams.set("redirect_uri", redirectUri);
          authorize.searchParams.set("response_type", "code");
          authorize.searchParams.set("scope", (o.scopes ?? []).join(" "));
          authorize.searchParams.set("state", state);
          if (o.pkce) {
            // Caller must persist verifier; we only return the challenge plumbing.
            authorize.searchParams.set("code_challenge_method", "S256");
          }
          return Response.json({
            install_kind: "oauth2",
            authorize_url: authorize.toString(),
            scopes: o.scopes,
            state,
          });
        }

        if (integ.auth.kind === "api_key") {
          return Response.json({
            install_kind: "api_key",
            header: integ.auth.api_key?.header,
            env_hint: integ.auth.api_key?.env_hint,
            instructions: `Generate an API key at ${integ.homepage ?? "the provider site"} and submit it via POST /api/integrations/${integ.slug}/credentials with { "api_key": "..." }.`,
          });
        }

        return Response.json({ install_kind: integ.auth.kind });
      },
    },
  },
});
