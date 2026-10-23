import { test } from "node:test";
import assert from "node:assert/strict";

const { repairMinimalDraft, draftFromDocument, slugify } = await import(
  "../src/lib/skills/draft-repair.ts"
);
const { normalizeTypography, detectLanguage } = await import("../src/lib/mcp/lang-detect.ts");

const DOC = `# Framework de Avaliação de Startups

Este documento descreve o processo de avaliação — com critérios reais, exemplos
de decisão e a justificativa de cada função no processo. Você deve considerar o
input do founder e o output esperado do deal memo…

## Execução
Para cada decisão, registre o critério, a entrada e a saída.
`.repeat(4);

test("repairs a model response that violates every strict constraint", () => {
  const d = repairMinimalDraft(
    {
      slug: "Deal Memo: Investimento!!",
      name: "Deal Memo",
      type: "SKILL",
      description: "curto",
      long_description: "x",
      system_prompt: "tiny",
      examples: [],
    },
    { type: "skill", filename: "deal-memo.md", content: DOC },
  );
  assert.match(d.slug, /^[a-z0-9-]+$/);
  assert.ok(d.description.length >= 20 && d.description.length <= 280);
  assert.ok(d.long_description.length >= 40);
  assert.ok(d.system_prompt.length >= 60);
  assert.equal(d.type, "skill");
  assert.ok(d.examples.length >= 1);
});

test("clamps over-long values instead of discarding the response", () => {
  const d = repairMinimalDraft(
    {
      slug: "ok-slug",
      name: "N".repeat(400),
      type: "skill",
      description: "D".repeat(900),
      long_description: "L".repeat(9000),
      system_prompt: "S".repeat(500),
      examples: Array.from({ length: 20 }, (_, i) => ({
        title: `t${i}`,
        input: "in",
        expected_output: "out",
      })),
    },
    { type: "skill" },
  );
  assert.ok(d.name.length <= 120);
  assert.ok(d.description.length <= 280);
  assert.ok(d.long_description.length <= 4000);
  assert.ok(d.examples.length <= 6);
});

test("deterministic fallback builds a valid draft from the document alone", () => {
  const d = draftFromDocument("framework-investimento.md", DOC, "skill");
  assert.ok(d.slug.length >= 2);
  assert.ok(d.system_prompt.includes("processo de avaliação"));
  assert.equal(d.type, "skill");
});

test("garbage model output never throws", () => {
  const d = repairMinimalDraft(null, { type: "playbook", filename: "x.md", content: DOC });
  assert.equal(d.type, "playbook");
  assert.ok(d.description.length >= 20);
});

test("slugify strips accents and punctuation", () => {
  assert.equal(slugify("Avaliação de Ações — v2"), "avaliacao-de-acoes-v2");
});

test("typography normalization neutralizes em-dash and ellipsis", () => {
  const out = normalizeTypography("valor — alto… “ok”");
  assert.ok(!out.includes("\u2014"));
  assert.ok(!out.includes("\u2026"));
  assert.ok(out.includes("..."));
});

test("PT doc with typography still detects as pt", () => {
  assert.equal(detectLanguage(DOC).lang, "pt");
});
