// Pure language detector for the review engine. Extracted from
// mcp/tools/skills.ts so it can be unit-tested under plain node (skills.ts
// pulls in server-only imports). Behavioral contract covered by
// tests/lang-detect.test.mjs — in particular the PT-vs-FR exclusivity fix.

export type Lang = "en" | "pt" | "es" | "fr" | "de" | "it" | "other";

/**
 * Normalize "smart" typography to ASCII equivalents. Portuguese authors write
 * with em-dashes and ellipsis characters as a matter of course, and those
 * characters used to (a) perturb detection samples and (b) trip the truncation
 * heuristic in the review engine. Normalizing once, up front, kills both.
 */
export function normalizeTypography(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u2014\u2013\u2012\u2015]/g, "-") // em/en/figure/horizontal dash
    .replace(/\u2026/g, "...") // ellipsis
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/\u00A0/g, " ");
}

export function detectLanguage(text: string): { lang: Lang; confidence: number } {
  const sample = normalizeTypography(text.slice(0, 8000)).toLowerCase();

  const wordMatch = (re: RegExp) => (sample.match(re) ?? []).length;
  const diaMatch = (re: RegExp) => (sample.match(re) ?? []).length;
  const counts: Record<Exclude<Lang, "other">, number> = {
    en: wordMatch(
      /\b(the|and|when|trigger|example|input|output|scope|values|user|must|should|never)\b/g,
    ),
    pt:
      wordMatch(
        /\b(não|você|são|também|então|porque|usuário|exemplo|gatilho|fora|valores|critério|saída|entrada|para|está|isso|quando|deve|pode|será|seja|tem|têm)\b/g,
      ) +
      2 * diaMatch(/[ãõçáéíóúâêô]/g),
    es:
      wordMatch(
        /\b(no|usted|son|también|entonces|porque|usuario|ejemplo|disparador|fuera|valores|criterio|salida|entrada|para|está|esto|cuando|debe)\b/g,
      ) +
      2 * diaMatch(/[ñáéíóúü¿¡]/g),
    fr:
      wordMatch(
        /\b(le|la|les|et|ne|pas|vous|êtes|aussi|alors|parce|utilisateur|exemple|déclencheur|valeurs|critère|sortie|entrée|pour|avec|est|cela|quand|doit)\b/g,
      ) +
      2 * diaMatch(/[àâçéèêëîïôûùüÿœ]/g),
    de:
      wordMatch(
        /\b(der|die|das|und|nicht|sie|sind|auch|dann|weil|nutzer|beispiel|auslöser|werte|kriterium|ausgabe|eingabe|für|mit|ist|dies|wenn|muss)\b/g,
      ) +
      2 * diaMatch(/[äöüß]/g),
    it:
      wordMatch(
        /\b(il|la|le|non|lei|sei|sono|anche|allora|perché|utente|esempio|trigger|valori|criterio|uscita|ingresso|per|con|questo|quando|deve)\b/g,
      ) +
      2 * diaMatch(/[àèéìíîòóù]/g),
  };
  // Language-exclusive orthography. These characters essentially never appear
  // in the other candidates, so their presence is a hard tiebreaker: a PT doc
  // full of English jargon still gets classified PT instead of falling into
  // "other" (which used to skip the semantic pass and zero native pillars).
  // IMPORTANT: every pattern here must be TRULY exclusive to its language
  // among the six candidates. `ç` and `ê` were previously listed as French
  // markers, but both are everyday Portuguese orthography (coração, você,
  // três) — a dense PT doc racked up "French-exclusive" hits and the detected
  // language drifted EN→FR→EN between otherwise similar runs, scrambling
  // pillar deltas (client-reported). French now relies on sequences that
  // Portuguese/Spanish/Italian never produce (œ, elisions like qu'/d'/l',
  // où, est-ce, being/aux forms).
  const EXCLUSIVE: Array<[Exclude<Lang, "other">, RegExp]> = [
    ["pt", /(ção|ções|ãos?|õe|nh[aeiou]|ç[aou])/g],
    ["es", /(ñ|¿|¡|ción\b)/g],
    ["fr", /(œ|qu'|d'un|d'une|l'[a-z]|\boù\b|est-ce|être\b|\baux\b)/g],
    ["de", /(ß|ä|ö)/g],
    ["it", /(\bgli\b|zione\b|perché|\bdegli\b|\bnell)/g],
  ];
  const exclusive = EXCLUSIVE.map(([l, re]) => [l, (sample.match(re) ?? []).length] as const)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);

  // Stability guard: if TWO languages both clear the exclusive threshold, the
  // winner must dominate (≥2× the runner-up); otherwise fall through to the
  // function-word counts instead of flip-flopping between near-tied claims.
  if (exclusive.length >= 2 && exclusive[0][1] < exclusive[1][1] * 2) {
    exclusive.length = 0;
  }

  const entries = Object.entries(counts) as Array<[Exclude<Lang, "other">, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  const [topLang, topHits] = entries[0];
  const [secondLang, secondHits] = entries[1];

  // Confidence divisor lowered from 40 → 22: 22 function-word hits in an 8k
  // sample is already a decisive signal, and the old divisor kept legitimate
  // PT/ES docs permanently under the 0.5 "low confidence" caveat.
  const conf = (hits: number) => Math.min(1, Math.max(0.55, hits / 22));

  if (exclusive.length) {
    const [excLang, excHits] = exclusive[0];
    // Orthography wins unless the function-word count for the same language is
    // literally zero (i.e. a stray accent in an otherwise English doc).
    if (counts[excLang] >= 2 || excHits >= 8) {
      return { lang: excLang, confidence: conf(Math.max(counts[excLang], excHits)) };
    }
    // Weak but real orthographic evidence: still better than "other", which
    // strips localized feedback and the non-EN scoring path from the author
    // (client-reported: dense PT docs landed on other/conf 0.4).
    if (excHits >= 2) return { lang: excLang, confidence: 0.55 };
  }
  if (topHits < 4) return { lang: "other", confidence: 0.3 };

  // Near-tie: prefer the non-English candidate rather than bailing to "other".
  // "other" is the worst outcome for the writer (no localized feedback, weaker
  // semantic hint), so we only use it when nothing at all resembles a language.
  if (topHits < secondHits * 1.15) {
    const pick = topLang === "en" ? secondLang : topLang;
    return { lang: pick, confidence: 0.55 };
  }
  return { lang: topLang, confidence: conf(topHits) };
}
