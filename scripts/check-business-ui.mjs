import puppeteer from "puppeteer";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { SOLUTIONS } from "../src/lib/solutions/catalog.ts";
const base = process.env.SAS_BROWSER_BASE || "http://127.0.0.1:8080";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error("UI fixtures require a local server");
const definitions = JSON.parse(readFileSync("content/expansion/skills.json", "utf8"));
const browser = await puppeteer.launch({ headless: true });
const results = [];
const uid = "00000000-0000-4000-8000-000000000001",
  wid = "00000000-0000-4000-8000-000000000002";
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 1000 });
    let role = "viewer",
      evidence = [],
      mutations = 0;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const url = r.url();
      const reply = (value) =>
        r.respond({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(value),
        });
      if (url.includes("/_serverFn/")) {
        const id = new URL(url).pathname.split("/").pop();
        let name = "";
        try {
          name = JSON.parse(Buffer.from(id, "base64url").toString()).export || "";
        } catch {}
        let result = {};
        if (name.startsWith("getSolutions_"))
          result = {
            available: SOLUTIONS.flatMap((s) => s.packages)
              .filter((s) => !s.startsWith("br-"))
              .map((slug) => ({ slug, name: slug, latest_version: "0.1.0" })),
            candidates: definitions.map((s) => ({
              slug: s.slug,
              name: s.name,
              category: s.category,
              description: s.procedure,
            })),
          };
        if (name.startsWith("getTaskEvidence_")) result = { groups: evidence, days: 30 };
        if (name.startsWith("listTeams_"))
          result = {
            teams: [
              {
                id: wid,
                name: "Fixture team",
                owner_id: uid,
                created_at: new Date().toISOString(),
              },
            ],
            user_id: uid,
          };
        if (name.startsWith("getTeam_"))
          result = {
            members: [
              { workspace_id: wid, user_id: uid, role, joined_at: new Date().toISOString() },
            ],
            skills: [],
            pins: [],
            audit: [],
          };
        if (name.startsWith("manageTeam_")) {
          mutations++;
          result = { token: "a".repeat(64) };
        }
        if (name.startsWith("getCatalogCuration_"))
          result = {
            packages: 644,
            candidates: [],
            method: "Fixture screening",
            generated_at: new Date().toISOString(),
          };
        void reply({ result });
      } else if (url.includes(".supabase.co")) {
        void reply(
          url.includes("/auth/v1/user") ? { id: uid, email: "fixture@example.invalid" } : [],
        );
      } else void r.continue();
    });
    await page.goto(base + "/solutions", { waitUntil: "networkidle2" });
    await page.waitForFunction(() => document.querySelectorAll("article").length === 21);
    const disabled = () =>
      page.$$eval(
        "button",
        (buttons) => buttons.find((b) => b.textContent === "Download complete solution")?.disabled,
      );
    assert.equal(await disabled(), false);
    await page.select('select[aria-label="Context budget"]', "1");
    assert.equal(await disabled(), true);
    await page.locator("::-p-text(Reconcile Brazilian order operations)").click();
    assert.equal(await disabled(), true);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.screenshot({
      path: `artifacts/validation/business-solutions-${width}.png`,
      fullPage: false,
    });
    console.log("PASS", width, "stage", results.length + 1);
    results.push({
      width,
      flow: "solutions: 21 skills, budget gate, missing approval gate",
      passed: true,
    });
    await page.goto(base + "/evidence", { waitUntil: "networkidle2" });
    await page.type('[aria-label="Package slug"]', "fixture-skill");
    await page.locator("::-p-aria(Compare last 30 days)").click();
    await page.waitForFunction(() =>
      document.body.innerText.includes("No experiment evidence for this selection"),
    );
    console.log("PASS", width, "stage", results.length + 1);
    results.push({ width, flow: "evidence: explicit missing evidence", passed: true });
    await page.goto(base + "/account/teams?invite=" + "a".repeat(64), {
      waitUntil: "networkidle2",
    });
    const login = await page
      .locator("::-p-aria(Sign in to manage your team)")
      .map((a) => a.href)
      .wait();
    assert.equal(
      new URL(login).searchParams.get("next"),
      "/account/teams?invite=" + "a".repeat(64),
    );
    await page.evaluate(
      async ({ uid }) => {
        const { supabase } = await import("/src/integrations/supabase/client.ts");
        const exp = Math.floor(Date.now() / 1000) + 3600;
        const b64 = (x) =>
          btoa(JSON.stringify(x)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
        localStorage.setItem(
          supabase.auth.storageKey,
          JSON.stringify({
            access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: uid, exp, role: "authenticated", aud: "authenticated" })}.ZmFrZQ`,
            refresh_token: "local-fixture",
            expires_at: exp,
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: uid,
              email: "fixture@example.invalid",
              aud: "authenticated",
              role: "authenticated",
              app_metadata: {},
              user_metadata: {},
              created_at: new Date().toISOString(),
            },
          }),
        );
      },
      { uid },
    );
    await page.goto(base + "/account/teams", { waitUntil: "networkidle2" });
    await page.waitForFunction(() => document.body.innerText.includes("Members · viewer"));
    assert.equal(
      await page.$$eval("button", (buttons) =>
        buttons.some((b) => b.textContent === "Create invite link"),
      ),
      false,
    );
    console.log("PASS", width, "stage", results.length + 1);
    results.push({
      width,
      flow: "teams: viewer permissions and invite auth redirect",
      passed: true,
    });
    role = "admin";
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForFunction(() => document.body.innerText.includes("Members · admin"));
    await page.screenshot({
      path: `artifacts/validation/business-teams-${width}.png`,
      fullPage: false,
    });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    console.log("PASS", width, "stage", results.length + 1);
    results.push({
      width,
      flow: "teams: administrator controls, no horizontal overflow",
      passed: true,
    });
    assert.deepEqual(errors, []);
    assert.equal(mutations, 0);
    await context.close();
  }
} finally {
  await browser.close();
}
mkdirSync("artifacts/validation", { recursive: true });
writeFileSync(
  "artifacts/validation/business-ui.json",
  JSON.stringify(
    {
      results,
      passed: results.length,
      failed: 0,
      mode: "local intercepted network; no production mutations",
    },
    null,
    2,
  ),
);
console.log(`${results.length} business UI scenarios passed; no production mutations`);
