import { ESLint } from "eslint";
import { writeFileSync, mkdirSync } from "node:fs";
import { relative } from "node:path";

const eslint = new ESLint();
const results = await eslint.lintFiles(["."]);
if (!results.length) throw new Error("No files linted; refusing empty success");
let blocking = 0;
let explicitAny = 0;
const report = [];
for (const file of results) {
  const errors = file.messages.filter((m) => m.severity === 2);
  const anyCount = file.messages.filter(
    (m) => m.ruleId === "@typescript-eslint/no-explicit-any",
  ).length;
  blocking += errors.length;
  explicitAny += anyCount;
  if (errors.length) {
    const path = relative(process.cwd(), file.filePath);
    console.error(path, errors);
    report.push({ path, explicitAny: anyCount, errors });
  }
}
mkdirSync("artifacts/validation", { recursive: true });
writeFileSync(
  "artifacts/validation/lint.json",
  JSON.stringify({ files: results.length, blocking, explicitAny, report }, null, 2),
);
console.log(
  `Linted ${results.length} files: ${blocking} blocking errors; ${explicitAny} explicit-any violations.`,
);
process.exitCode = blocking ? 1 : 0;
