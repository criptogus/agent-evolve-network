/** Real SSR of the UI; synthetic runtime declarations never qualify a model. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildSync } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Package } from "../src/data/packages.ts";
import {
  packagedExecution,
  packageInstallPreview,
} from "../src/lib/marketplace/package-execution.ts";
function pkg(
  runtime?: string,
  status: "supported" | "partial" | "unsupported" = "supported",
): Package {
  return {
    id: "fixture-source-flow",
    latest: "0.1.31",
    type: "playbook",
    name: "Fixture source flow",
    author: "fixture",
    downloads: "0",
    rating: 0,
    reviews: 0,
    description: "Synthetic UI fixture only",
    longDescription: "",
    versions: [],
    compatibility: runtime
      ? [{ runtime, status, detail: "Fixture declaration, not qualification" }]
      : [],
    dependencies: [],
    scopes: [],
    size: "—",
    license: "fixture",
    examples: [],
    metrics: [],
    systemPrompt: "Fixture instructions",
  };
}
const sourceRuntime =
  "typesafe/jev-1.14.0/fixture-source-state-v1@node-24.22.0-arm64/compiled-playbook-gateway-v29-fixture";
test("unsupported/partial runtime declarations cannot select the evaluated bundle presentation", () => {
  for (const status of ["unsupported", "partial"] as const)
    assert.equal(packagedExecution(pkg(sourceRuntime, status)), null);
  assert.equal(packagedExecution(pkg()), null);
  assert.match(
    packageInstallPreview(pkg(), "https://example.invalid/mcp"),
    /No supported runtime declared/,
  );
  assert.ok(
    !packageInstallPreview(pkg(), "https://example.invalid/mcp").includes("any MCP client"),
  );
});
test("real source-state and local-model UI render the complete bundle and correct consent boundaries", async () => {
  mkdirSync(resolve("artifacts"), { recursive: true });
  const dir = mkdtempSync(join(resolve("artifacts"), "package-ui-ssr-"));
  try {
    buildSync({
      entryPoints: {
        instructions: resolve("src/components/marketplace/PackagedExecutionInstructions.tsx"),
        gallery: resolve("src/components/marketplace/PackageGallery.tsx"),
      },
      outdir: dir,
      bundle: true,
      packages: "external",
      platform: "node",
      format: "esm",
      jsx: "automatic",
      alias: { "@": resolve("src") },
      logLevel: "silent",
    });
    const { PackagedExecutionInstructions } = await import(
      pathToFileURL(join(dir, "instructions.js")).href
    );
    const { PackageGallery } = await import(pathToFileURL(join(dir, "gallery.js")).href);
    const source = pkg(sourceRuntime),
      html = renderToStaticMarkup(createElement(PackagedExecutionInstructions, { pkg: source }));
    assert.match(html, /Download evaluated ZIP v0.1.31/);
    assert.match(html, /fixture-source-flow\.zip/);
    assert.match(html, /TYPESAFE_API_KEY/);
    assert.match(html, /explicit source-upload consent/);
    assert.match(html, /does not reproduce that execution/);
    assert.ok(!html.includes("npx skills add"));
    assert.ok(!html.includes("any assistant"));
    const local = pkg("mlx-community/fixture-model@frozen-revision/redact-route-generate-v1"),
      localHtml = renderToStaticMarkup(
        createElement(PackagedExecutionInstructions, { pkg: local }),
      );
    assert.match(localHtml, /exact cached local model/);
    assert.ok(!localHtml.includes("TYPESAFE_API_KEY"));
    const gallery = renderToStaticMarkup(
      createElement(PackageGallery, { pkg: source, gatewayUrl: "https://example.invalid/mcp" }),
    );
    assert.match(gallery, /Evaluated bundle/);
    assert.match(gallery, /Workflow source/);
    assert.match(gallery, /curl -fL/);
    assert.ok(!gallery.includes("any MCP client"));
    assert.ok(!gallery.includes("npx super-agent install"));
    const noRuntime = renderToStaticMarkup(
      createElement(PackageGallery, { pkg: pkg(), gatewayUrl: "https://example.invalid/mcp" }),
    );
    assert.match(noRuntime, /No supported runtime declared/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
