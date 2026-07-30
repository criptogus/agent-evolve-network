import { test } from "node:test";
import assert from "node:assert/strict";

const { detectLanguage } = await import("../src/lib/mcp/lang-detect.ts");

// Dense Portuguese skill text saturated with English technical jargon — the
// exact profile of the client's 841-line investment skill that used to drift
// EN→FR→EN between runs because `ç`/`ê` were (wrongly) French-exclusive
// markers.
const PT_WITH_JARGON = `
# Framework de Investimento — Referência Completa

Este documento descreve o processo de avaliação de startups. Você deve
considerar o input do founder, o output esperado do deal memo e o trigger
de cada etapa. Não é um guia genérico: são critérios reais, com exemplos
de decisão e a justificativa de cada função no processo.

## Coração da tese
A avaliação começa pela tração. Você não pode ignorar a geração de caixa,
também não deve confiar apenas na apresentação. Quando a informação está
incompleta, então o investidor deve pedir os números brutos ao usuário.

## Execução
Para cada decisão, será registrado o critério, a entrada e a saída. Isso
garante que a operação não dependa de intuição. A pontuação de cada seção
usa exemplos práticos: input, output, trigger e scope aparecem em inglês
porque são termos técnicos, mas o conteúdo é português — coração, exceção,
tração, execução, três, você, não, então.
`.repeat(3);

const FRENCH_DOC = `
# Guide de l'utilisateur — Référence complète

Vous êtes l'assistant qui doit répondre aux questions de l'utilisateur.
Qu'est-ce que c'est ? C'est un document où chaque exemple montre la sortie
attendue d'une entrée donnée. Il ne faut pas être générique : les critères
sont réels, avec des exemples de décision. Est-ce que la valeur est là ?
L'analyse commence par la traction et le déclencheur de chaque étape, aux
côtés des valeurs de l'entreprise et d'un processus d'une rigueur totale.
`.repeat(3);

const ENGLISH_DOC = `
You are a code reviewer. When the user sends input, produce output with
the example format. The scope covers values, triggers and user intent.
You must never invent APIs and should always cite line numbers.
`.repeat(5);

test("PT doc with EN jargon detects as pt — never fr (client regression)", () => {
  const d = detectLanguage(PT_WITH_JARGON);
  assert.equal(d.lang, "pt");
  assert.ok(d.confidence >= 0.55);
});

test("detection is deterministic across repeated calls (no drift)", () => {
  const runs = Array.from({ length: 5 }, () => detectLanguage(PT_WITH_JARGON).lang);
  assert.ok(
    runs.every((l) => l === runs[0]),
    `drifted: ${runs}`,
  );
});

test("real French doc still detects as fr", () => {
  assert.equal(detectLanguage(FRENCH_DOC).lang, "fr");
});

test("English doc detects as en", () => {
  assert.equal(detectLanguage(ENGLISH_DOC).lang, "en");
});

test("ç/ê alone never count as French evidence", () => {
  // Portuguese words carrying ç and ê but almost no other signals: must not
  // come back as fr under any circumstance.
  const d = detectLanguage("coração função você três êxito atenção exceção construção");
  assert.notEqual(d.lang, "fr");
});
