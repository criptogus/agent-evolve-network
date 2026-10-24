import ts from "typescript";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Follow rendered local components, including wrappers such as SitePage, rather
// than merely counting Nav imports (loading/error branches are alternatives).
export function auditNavigation(sources, tree) {
  if (!Object.keys(sources).length || !tree.trim()) throw new Error("Empty navigation audit");
  const parsed = new Map();
  function info(file) {
    if (parsed.has(file)) return parsed.get(file);
    const source = sources[file];
    if (source === undefined) return null;
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const imports = new Map();
    const tags = new Set();
    function visit(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const path = node.moduleSpecifier.text;
        const bindings = node.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const item of bindings.elements) imports.set(item.name.text, path);
        }
        if (node.importClause?.name) imports.set(node.importClause.name.text, path);
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
        tags.add(node.tagName.getText(ast));
      ts.forEachChild(node, visit);
    }
    visit(ast);
    const result = { imports, tags };
    parsed.set(file, result);
    return result;
  }
  function ownsNavigation(file, visited = new Set()) {
    if (visited.has(file)) return false;
    visited.add(file);
    const data = info(file);
    if (!data) return false;
    if (file === "src/components/site/Nav.tsx") return true;
    for (const tag of data.tags) {
      const target = data.imports.get(tag);
      if (!target || (!target.startsWith("@/") && !target.startsWith("."))) continue;
      const base = target.startsWith("@/")
        ? `src/${target.slice(2)}`
        : relative(process.cwd(), resolve(dirname(file), target));
      const candidate = [`${base}.tsx`, `${base}/index.tsx`, base].find((path) => path in sources);
      if (candidate && ownsNavigation(candidate, new Set(visited))) return true;
    }
    return false;
  }
  const imports = new Map(
    [...tree.matchAll(/import \{ Route as (\w+) \} from ['"]\.\/(routes\/[^'"]+)['"]/g)].map(
      (m) => [m[1], [`src/${m[2]}.tsx`, `src/${m[2]}.ts`].find((path) => path in sources)],
    ),
  );
  const routes = new Map(
    [...tree.matchAll(/const (\w+)\s*=\s*(\w+)\.update\(\{([\s\S]*?)\}\s*as/g)].map((m) => [
      m[1],
      { file: imports.get(m[2]), parent: m[3].match(/getParentRoute:\s*\(\)\s*=>\s*(\w+)/)?.[1] },
    ]),
  );
  if (!routes.size || [...routes.values()].some((r) => !r.file || !sources[r.file]))
    throw new Error("Incomplete generated route inventory");
  if (routes.size !== imports.size - 1) throw new Error("Incomplete generated route coverage");
  routes.set("rootRouteImport", { file: imports.get("rootRouteImport"), parent: undefined });
  const violations = [];
  let nestedChecks = 0;
  for (const route of routes.values()) {
    let ancestor = routes.get(route.parent);
    const seen = new Set();
    while (ancestor && !seen.has(ancestor.file)) {
      seen.add(ancestor.file);
      // A route without an Outlet does not render its child inside its chrome.
      if (info(ancestor.file)?.tags.has("Outlet")) {
        nestedChecks++;
        if (ownsNavigation(route.file) && ownsNavigation(ancestor.file))
          violations.push({ child: route.file, layout: ancestor.file });
      }
      ancestor = routes.get(ancestor.parent);
    }
  }
  return {
    routes: routes.size,
    navigationOwners: [...routes.values()].filter((r) => ownsNavigation(r.file)).length,
    nestedChecks,
    violations,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) throw new Error("Usage: npm run check:navigation");
  const sources = {};
  function collect(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${item.name}`;
      if (item.isDirectory()) collect(path);
      else if (/\.tsx?$/.test(path)) sources[path] = readFileSync(path, "utf8");
    }
  }
  collect("src");
  const report = auditNavigation(sources, readFileSync("src/routeTree.gen.ts", "utf8"));
  mkdirSync("artifacts/validation", { recursive: true });
  writeFileSync("artifacts/validation/navigation.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  process.exitCode = report.violations.length ? 1 : 0;
}
