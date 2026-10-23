import puppeteer from "puppeteer";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.SAS_BROWSER_BASE || "http://127.0.0.1:8080";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error("UI check requires a local server; refuses production signups");
await mkdir("artifacts/validation", { recursive: true });
const browser = await puppeteer.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    let signups = 0;
    const authRequests = [];
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (request.method() === "OPTIONS" && url.includes(".supabase.co")) {
        void request.respond({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, GET, OPTIONS",
            "access-control-allow-headers":
              request.headers()["access-control-request-headers"] || "*",
          },
        });
      } else if (url.includes(".supabase.co/auth/v1/signup")) {
        signups++;
        authRequests.push({
          ...JSON.parse(request.postData() || "{}"),
          redirect: new URL(url).searchParams.get("redirect_to"),
        });
        void request.respond({
          status: signups === 1 ? 422 : 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(
            signups === 1
              ? {
                  code: "weak_password",
                  msg: "Password is known to be weak and easy to guess",
                }
              : {
                  user: {
                    id: "00000000-0000-0000-0000-000000000001",
                    email: "local-test@example.invalid",
                    identities: [],
                  },
                  session: null,
                },
          ),
        });
      } else if (url.includes(".supabase.co")) {
        // Prevent test credentials, sessions or telemetry touching production.
        void request.respond({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: "{}",
        });
      } else void request.continue();
    });
    await page.goto(
      `${base}/signup?next=${encodeURIComponent("/oauth/authorize?state=test&client_id=example")}`,
      { waitUntil: "networkidle2", timeout: 60000 },
    );
    await page.waitForSelector("#signup-password");
    await page.type('[aria-label="Full name"]', "Local Test");
    await page.type('[aria-label="Email"]', "local-test@example.invalid");
    await page.type("#signup-password", "password123");
    await page.click('[aria-controls="signup-password"]');
    assert.equal(await page.$eval("#signup-password", (el) => el.type), "text");
    await page.click('[aria-controls="signup-password"]');
    await page.$eval("form", (form) => form.requestSubmit());
    await page.waitForSelector("#signup-error");
    assert.match(await page.$eval("#signup-error", (el) => el.textContent), /unique passphrase/);
    assert.equal(signups, 1);
    const redirect = new URL(authRequests[0].redirect);
    assert.equal(redirect.origin, base);
    assert.equal(
      redirect.searchParams.get("next"),
      "/oauth/authorize?state=test&client_id=example",
    );
    assert.equal(await page.$eval('button[type="submit"]', (el) => el.disabled), false);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.screenshot({ path: `artifacts/validation/signup-${width}.png`, fullPage: true });
    await page.$eval("#signup-password", (el) => {
      el.value = "";
    });
    await page.type("#signup-password", "A long unique local-test passphrase 5789!");
    await page.$eval("form", (form) => form.requestSubmit());
    await page.waitForFunction(() => location.pathname === "/login");
    assert.equal(
      new URL(page.url()).searchParams.get("next"),
      "/oauth/authorize?state=test&client_id=example",
    );
    assert.equal(signups, 2);
    console.log(
      `PASS signup ${width}px: password toggle, inline weak-password error, retry succeeds and preserves OAuth query, no overflow, auth mocked`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
