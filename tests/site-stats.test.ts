import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SITE_STATS, TOTAL_PACKAGES, SKILLS_LABEL, PACKAGES_LABEL } from "../src/lib/site-stats.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collectFiles(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, exts, out);
    else if (exts.some((e) => full.endsWith(e))) out.push(full);
  }
  return out;
}

test("site stats are internally consistent", () => {
  assert.ok(SITE_STATS.skills > 0);
  assert.equal(
    TOTAL_PACKAGES,
    SITE_STATS.skills + SITE_STATS.playbooks + SITE_STATS.souls + SITE_STATS.guardrails,
  );
  assert.equal(SKILLS_LABEL, `${SITE_STATS.skills}+`);
  assert.match(PACKAGES_LABEL, /^\d+\+$/);
  assert.ok(Number.parseInt(PACKAGES_LABEL, 10) <= TOTAL_PACKAGES);
});

// Marketing copy must reference counts through src/lib/site-stats.ts — never as
// literals — so the numbers can't drift between hero, pricing and welcome again.
test("no hardcoded package counts in marketing copy", () => {
  const files = [
    ...collectFiles(path.join(ROOT, "src/components/site"), [".tsx"]),
    path.join(ROOT, "src/routes/index.tsx"),
    path.join(ROOT, "src/routes/welcome.tsx"),
    path.join(ROOT, "src/routes/pricing.tsx"),
  ];
  const hardcodedCount =
    /\b\d{3,}(,\d{3})*\+?\s*(expert |community |free |signed )?(skills|packages)\b/i;
  const offenders = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const [i, line] of text.split("\n").entries()) {
      if (hardcodedCount.test(line)) offenders.push(`${path.relative(ROOT, file)}:${i + 1}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Hardcoded counts found (use src/lib/site-stats.ts): ${offenders.join(", ")}`,
  );
});

// One name per concept: the evolution loop is "SkillForge" everywhere.
test('the deprecated "Evolution Engine" name does not reappear', () => {
  const files = collectFiles(path.join(ROOT, "src"), [".ts", ".tsx"]).filter(
    (f) => !f.endsWith("routeTree.gen.ts"),
  );
  const offenders = files.filter((f) => readFileSync(f, "utf8").includes("Evolution Engine"));
  assert.deepEqual(
    offenders.map((f) => path.relative(ROOT, f)),
    [],
    "Use “SkillForge” — “Evolution Engine” was retired (docs/product-analysis-2026-06.md §2.3)",
  );
});
