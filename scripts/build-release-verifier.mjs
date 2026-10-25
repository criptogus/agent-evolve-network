import { build } from "esbuild";
await build({
  entryPoints: ["scripts/verify-release-bundle.ts"],
  outfile: "dist/release/verify-release-bundle.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  minify: true,
  banner: {
    js: 'import { createRequire as __sakCreateRequire } from "node:module"; const require = __sakCreateRequire(import.meta.url);',
  },
});
