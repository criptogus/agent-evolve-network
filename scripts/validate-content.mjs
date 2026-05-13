#!/usr/bin/env node
// Validates every package in content/{skills,playbooks,souls,guardrails}/ against
// content/schemas/<type>.schema.json. Also enforces unique slugs and template skipping.
//
// Usage:  bun run validate:content
//         node scripts/validate-content.mjs

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import Ajv from "ajv";
import { parse as parseYaml } from "yaml";

const ROOT = new URL("..", import.meta.url).pathname;
const TYPES = ["skill", "playbook", "soul", "guardrail"];
const FOLDER = { skill: "skills", playbook: "playbooks", soul: "souls", guardrail: "guardrails" };

const ajv = new Ajv({ allErrors: true, strict: false });
const schemas = Object.fromEntries(
  TYPES.map((t) => [t, JSON.parse(readFileSync(join(ROOT, `content/schemas/${t}.schema.json`), "utf8"))]),
);
const validators = Object.fromEntries(TYPES.map((t) => [t, ajv.compile(schemas[t])]));

const adversarialSchema = JSON.parse(
  readFileSync(join(ROOT, "content/schemas/adversarial-case.schema.json"), "utf8"),
);
const validateAdversarial = ajv.compile(adversarialSchema);

let errors = 0;
const slugs = new Map(); // slug -> file
const adversarialIds = new Map(); // id -> file

for (const type of TYPES) {
  const dir = join(ROOT, "content", FOLDER[type]);
  let entries;
  try { entries = readdirSync(dir); } catch { continue; }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (!statSync(full).isFile()) continue;
    if (!/\.ya?ml$/i.test(entry)) continue;
    if (basename(entry).startsWith("_")) continue; // skip _template.yaml

    let pkg;
    try { pkg = parseYaml(readFileSync(full, "utf8")); }
    catch (e) { fail(full, `YAML parse error: ${e.message}`); continue; }

    if (!pkg || pkg.type !== type) {
      fail(full, `'type' must be "${type}" (got ${JSON.stringify(pkg?.type)})`);
      continue;
    }

    const ok = validators[type](pkg);
    if (!ok) {
      for (const err of validators[type].errors) {
        fail(full, `${err.instancePath || "/"} ${err.message}`);
      }
      continue;
    }

    if (basename(entry, entry.endsWith(".yaml") ? ".yaml" : ".yml") !== pkg.slug) {
      fail(full, `filename must match slug "${pkg.slug}.yaml"`);
    }
    if (slugs.has(pkg.slug)) {
      fail(full, `duplicate slug "${pkg.slug}" — also in ${slugs.get(pkg.slug)}`);
    } else {
      slugs.set(pkg.slug, full);
    }
  }
}

// Validate adversarial cases: content/adversarial/<vertical>/<id>.yaml
const advRoot = join(ROOT, "content/adversarial");
try {
  for (const vertical of readdirSync(advRoot)) {
    const verticalPath = join(advRoot, vertical);
    if (!statSync(verticalPath).isDirectory()) continue;
    for (const entry of readdirSync(verticalPath)) {
      const full = join(verticalPath, entry);
      if (!statSync(full).isFile()) continue;
      if (!/\.ya?ml$/i.test(entry)) continue;
      if (basename(entry).startsWith("_")) continue;

      let kase;
      try { kase = parseYaml(readFileSync(full, "utf8")); }
      catch (e) { fail(full, `YAML parse error: ${e.message}`); continue; }

      if (!kase || kase.type !== "adversarial_case") {
        fail(full, `'type' must be "adversarial_case" (got ${JSON.stringify(kase?.type)})`);
        continue;
      }
      if (!validateAdversarial(kase)) {
        for (const err of validateAdversarial.errors) {
          fail(full, `${err.instancePath || "/"} ${err.message}`);
        }
        continue;
      }
      if (kase.vertical !== vertical) {
        fail(full, `vertical "${kase.vertical}" must match folder "${vertical}"`);
      }
      const base = basename(entry, entry.endsWith(".yaml") ? ".yaml" : ".yml");
      if (base !== kase.id) {
        fail(full, `filename must match id "${kase.id}.yaml"`);
      }
      if (adversarialIds.has(kase.id)) {
        fail(full, `duplicate adversarial id "${kase.id}" — also in ${adversarialIds.get(kase.id)}`);
      } else {
        adversarialIds.set(kase.id, full);
      }
    }
  }
} catch { /* no adversarial dir yet */ }

function fail(file, msg) {
  errors++;
  console.error(`\u001b[31m✗\u001b[0m ${file.replace(ROOT, "")}: ${msg}`);
}

if (errors > 0) {
  console.error(`\n${errors} validation error(s).`);
  process.exit(1);
}
console.log(`✓ ${slugs.size} package(s) and ${adversarialIds.size} adversarial case(s) validated.`);
