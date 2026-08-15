import { createFileRoute } from "@tanstack/react-router";
import { publicSigningKeyPem, signingKeyId } from "@/lib/plugins/signature.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

// GET /api/public/signing-key.pem — the Ed25519 public key used to sign every
// downloadable marketplace package. Publish it so verification needs no trust
// in the download path itself.
export const Route = createFileRoute("/api/public/signing-key.pem")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const pem = publicSigningKeyPem();
        if (!pem) {
          return new Response("signing keys are not configured on this deployment\n", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS },
          });
        }
        return new Response(pem.endsWith("\n") ? pem : `${pem}\n`, {
          status: 200,
          headers: {
            "Content-Type": "application/x-pem-file",
            "X-SAK-Signing-Key-Id": signingKeyId() ?? "",
            "X-SAK-Signature-Algorithm": "ed25519",
            "Cache-Control": "public, max-age=3600",
            ...CORS,
          },
        });
      },
    },
  },
});
