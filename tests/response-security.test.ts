import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { responseSecurity } from "../src/lib/response-security.server.ts";
import { withCspNonce, requestCspNonce } from "../src/lib/csp-context.server.ts";

const html = () =>
  new Response("<html></html>", {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "5" },
  });

test("HTML gets nonce CSP, denies framing, and cannot be cached", async () => {
  const response = responseSecurity(html(), "test-nonce", "https://superagentskill.com/");
  const csp = response.headers.get("Content-Security-Policy")!;
  assert.match(csp, /script-src 'self' 'nonce-test-nonce'/);
  assert.match(csp, /script-src-attr 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /https:\/\/js.stripe.com/);
  assert.match(csp, /wss:\/\/ynxuotbjfxkcrfvkrltr.supabase.co/);
  assert.doesNotMatch(
    csp.split(";").find((d) => d.trim().startsWith("script-src "))!,
    /unsafe-inline|unsafe-eval/,
  );
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Retry-After"), "5");
  assert.equal(await response.text(), "<html></html>");
});

test("only actual Lovable previews allow the editor's framing origins", () => {
  for (const host of [
    "preview.lovable.app",
    "superagentskill.com",
    "preview.lovable.app.evil.test",
  ]) {
    const response = responseSecurity(html(), "nonce", `https://${host}/`);
    const preview = host === "preview.lovable.app";
    assert.equal(response.headers.get("X-Frame-Options"), preview ? "SAMEORIGIN" : "DENY");
    assert.equal(
      response.headers.get("Content-Security-Policy")!.includes("https://*.lovable.dev"),
      preview,
    );
  }
});

test("JSON, redirects, and empty responses retain their semantics", async () => {
  for (const response of [
    Response.json({ ok: true }),
    Response.redirect("https://superagentskill.com"),
    new Response(null, { status: 204 }),
  ]) {
    const expectedBody = await response.clone().text();
    const secured = responseSecurity(response, "nonce", "https://superagentskill.com/");
    assert.equal(secured.headers.get("Content-Security-Policy"), null);
    assert.equal(secured.status, response.status);
    assert.equal(secured.headers.get("X-Frame-Options"), "DENY");
    assert.equal(await secured.text(), expectedBody);
  }
});

test("concurrent async request contexts keep their nonce isolated", async () => {
  assert.equal(requestCspNonce(), undefined);
  await Promise.all(
    ["first", "second"].map((nonce) =>
      withCspNonce(nonce, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        assert.equal(requestCspNonce(), nonce);
      }),
    ),
  );
  assert.equal(requestCspNonce(), undefined);
});

test("disclosure document has the published contact and a bounded expiry", async () => {
  const body = await readFile(
    new URL("../public/.well-known/security.txt", import.meta.url),
    "utf8",
  );
  assert.match(body, /^Contact: mailto:contact@zeroagency.ai$/m);
  assert.match(body, /^Canonical: https:\/\/superagentskill.com\/\.well-known\/security.txt$/m);
  assert.match(body, /^Preferred-Languages: en, pt-BR$/m);
  const expires = Date.parse(body.match(/^Expires: (.+)$/m)![1]);
  assert.ok(expires > Date.now());
  assert.ok(expires < Date.now() + 365 * 24 * 60 * 60 * 1000);
});
