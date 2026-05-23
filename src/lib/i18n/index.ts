/**
 * Tiny locale shim — picks pt-BR vs en based on the browser's
 * navigator.language, falls back to en. No i18next, no provider, no
 * bundle bloat — just a `t(key, lang)` function we call from a few
 * priority pages that every new user hits.
 *
 * Why so minimal: the rest of the site is engineering-targeted English
 * and adding a heavy i18n framework for a handful of strings is
 * premature. If/when we localise the full app we can swap this for
 * i18next and the dictionaries already live in `dictionaries.ts`.
 */
import { dictionaries, type Lang, type TKey } from "./dictionaries";

export type { Lang, TKey } from "./dictionaries";

const SUPPORTED: Lang[] = ["en", "pt-BR"];

export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const navList: string[] =
    (navigator.languages && Array.from(navigator.languages)) ||
    (navigator.language ? [navigator.language] : []);
  for (const raw of navList) {
    if (!raw) continue;
    if (raw.startsWith("pt")) return "pt-BR";
    if (SUPPORTED.includes(raw as Lang)) return raw as Lang;
  }
  return "en";
}

export function t<K extends TKey>(key: K, lang: Lang = "en"): string {
  const dict = dictionaries[lang] ?? dictionaries.en;
  return dict[key] ?? dictionaries.en[key] ?? key;
}

/** Format a string template with `{name}` placeholders. */
export function tf<K extends TKey>(
  key: K,
  lang: Lang,
  vars: Record<string, string | number>,
): string {
  const tpl = t(key, lang);
  return tpl.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}
