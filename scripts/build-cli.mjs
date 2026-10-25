import { build } from "esbuild";
import { format, resolveConfig } from "prettier";
import { writeFileSync, readFileSync } from "node:fs";
const result = await build({
  entryPoints: ["cli/super-agent.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  banner: {
    js: 'import { createRequire as __sakCreateRequire } from "node:module"; const require = __sakCreateRequire(import.meta.url);',
  },
});
const source = await format(
  result.outputFiles[0].text.replace(/\/\/[^\n]*eslint-(?:disable|enable)[^\n]*/g, ""),
  {
    ...(await resolveConfig("cli/super-agent.js")),
    filepath: "cli/super-agent.js",
  },
);
if (process.argv.includes("--check")) {
  if (readFileSync("cli/super-agent.js", "utf8") !== source) throw new Error("CLI bundle is stale");
} else writeFileSync("cli/super-agent.js", source);
