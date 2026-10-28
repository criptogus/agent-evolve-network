/** Keep browser sources scoped to integrations used by this app (not server-side APIs). */
export function responseSecurity(response: Response, nonce: string, url: string): Response {
  const headers = new Headers(response.headers);
  const preview = new URL(url).hostname.endsWith(".lovable.app");
  headers.set("X-Frame-Options", preview ? "SAMEORIGIN" : "DENY");
  if (headers.get("content-type")?.includes("text/html")) {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        // /~flock.js and /~api/analytics are same-origin Lovable proxies.
        `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://challenges.cloudflare.com`,
        "script-src-attr 'none'",
        // React/Radix and charts use inline styles; scripts remain nonce-protected.
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://ynxuotbjfxkcrfvkrltr.supabase.co wss://ynxuotbjfxkcrfvkrltr.supabase.co https://api.stripe.com https://r.stripe.com https://m.stripe.network https://challenges.cloudflare.com https://auth.lovable.dev https://oauth.lovable.app",
        "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://challenges.cloudflare.com https://auth.lovable.dev https://oauth.lovable.app",
        preview
          ? "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev"
          : "frame-ancestors 'none'",
        "worker-src 'self' blob:",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
    // Never reuse a document's per-request nonce via a shared HTML cache.
    headers.set("Cache-Control", "no-store");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
