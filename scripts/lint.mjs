import { ESLint } from "eslint";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { relative } from "node:path";

const baseline = JSON.parse(
  readFileSync(new URL("../security/lint-legacy-any.json", import.meta.url), "utf8"),
);
const eslint = new ESLint();
const results = await eslint.lintFiles(["."]);
if (!results.length) throw new Error("No files linted; refusing empty success");
let blocking = 0;
let debt = 0;
const report = [];
for (const file of results) {
  const path = relative(process.cwd(), file.filePath);
  const legacy = file.messages.filter((m) => m.ruleId === "@typescript-eslint/no-explicit-any");
  const allowance = baseline[path] ?? 0;
  debt += legacy.length;
  const other = file.messages.filter(
    (m) => m.severity === 2 && m.ruleId !== "@typescript-eslint/no-explicit-any",
  );
  const excess = Math.max(0, legacy.length - allowance);
  blocking += other.length + excess;
  if (other.length || excess) console.error(path, other, { newExplicitAny: excess });
  if (legacy.length || other.length || excess)
    report.push({ path, legacyAny: legacy.length, allowance, blocking: other.length + excess });
}
mkdirSync("artifacts/validation", { recursive: true });
writeFileSync(
  "artifacts/validation/lint.json",
  JSON.stringify({ files: results.length, blocking, legacyAny: debt, report }, null, 2),
);
console.log(
  `Linted ${results.length} files: ${blocking} blocking errors; ${debt} pre-existing explicit-any uses remain (visible debt, not fixed).`,
);
process.exitCode = blocking ? 1 : 0;
