import test from "node:test";
import assert from "node:assert/strict";
import { auditNavigation } from "../scripts/check-navigation.mjs";

const tree = `
import { Route as rootRouteImport } from './routes/__root'
import { Route as AdminImport } from './routes/admin'
import { Route as ChildImport } from './routes/admin.child'
const Admin = AdminImport.update({ getParentRoute: () => rootRouteImport } as never)
const Child = ChildImport.update({ getParentRoute: () => Admin } as never)
`;
const sources = {
  "src/routes/__root.tsx": `function Root() { return <Outlet />; }`,
  "src/routes/admin.tsx": `import { Nav } from '@/components/site/Nav'; function Layout() { return <><Nav /><Outlet /></>; }`,
  "src/routes/admin.child.tsx": `function Child() { return <section>Review</section>; }`,
  "src/components/site/Nav.tsx": `export function Nav() { return <nav>Global</nav>; }`,
  "src/components/site/SitePage.tsx": `import { Nav } from './Nav'; export function SitePage({children}) { return <><Nav />{children}</>; }`,
};

test("navigation audit checks nested routes and accepts content owned by the parent layout", () => {
  const report = auditNavigation(sources, tree);
  assert.equal(report.routes, 3);
  assert.equal(report.nestedChecks, 3);
  assert.deepEqual(report.violations, []);
});

test("navigation audit rejects both direct and wrapper-based duplicate menus", () => {
  for (const [name, path] of [
    ["Nav", "Nav"],
    ["SitePage", "SitePage"],
  ]) {
    const report = auditNavigation(
      {
        ...sources,
        "src/routes/admin.child.tsx": `import { ${name} as Chrome } from '@/components/site/${path}'; function Child() { return <Chrome />; }`,
      },
      tree,
    );
    assert.deepEqual(report.violations, [
      { child: "src/routes/admin.child.tsx", layout: "src/routes/admin.tsx" },
    ]);
  }
});

test("navigation audit does not treat alternative loading and ready branches as duplicate menus", () => {
  const report = auditNavigation(
    {
      ...sources,
      "src/routes/admin.tsx": `import { Nav } from '@/components/site/Nav'; function Layout() { if (loading) return <Nav />; return <><Nav /><Outlet /></>; }`,
    },
    tree,
  );
  assert.deepEqual(report.violations, []);
});

test("navigation audit rejects empty and incomplete inventories", () => {
  assert.throws(() => auditNavigation({}, tree), /Empty/);
  assert.throws(() => auditNavigation(sources, ""), /Empty/);
  assert.throws(() => auditNavigation({ "src/routes/admin.tsx": "" }, tree), /Incomplete/);
});
