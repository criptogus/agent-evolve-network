/**
 * Module loader hook that teaches plain `node --experimental-strip-types` to
 * resolve the repo's `@/` path alias (src/*). Mirrors tsconfig paths:
 *   "@/*": ["./src/*"]
 * Used by tests that exercise real server modules (src/lib/mcp/*) without a
 * bundler. Extension inference: .ts, .tsx, /index.ts, /index.tsx.
 */
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function firstExisting(base) {
  for (const suffix of SUFFIXES) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return pathToFileURL(candidate).href;
  }
  return null;
}

function resolveAlias(specifier) {
  if (!specifier.startsWith("@/")) return null;
  const hit = firstExisting(path.join(ROOT, "src", specifier.slice(2)));
  if (hit) return hit;
  throw new Error(`alias-loader: cannot resolve ${specifier} under ${ROOT}/src`);
}

// Vite resolves extensionless relative imports; plain node does not. Name the
// exact sibling files (never glob) so this cannot swallow real resolution bugs.
function resolveRelative(specifier, parentURL) {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
  if (path.extname(specifier)) return null; // already has an extension
  const parent = fileURLToPath(parentURL);
  const base = path.resolve(path.dirname(parent), specifier);
  return firstExisting(base);
}

export async function resolve(specifier, context, nextResolve) {
  const mapped = resolveAlias(specifier) ?? resolveRelative(specifier, context.parentURL);
  if (mapped) return nextResolve(mapped, context);
  return nextResolve(specifier, context);
}
