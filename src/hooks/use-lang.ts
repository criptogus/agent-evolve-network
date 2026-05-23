import { useCallback, useEffect, useState } from "react";
import { detectLang, t, tf, type Lang, type TKey } from "@/lib/i18n";

const LS_KEY = "sas_lang";

// Hook that resolves the active language (localStorage override > browser
// preference > en) and gives you `t` + `tf` already bound to that language.
// Components render `en` on the server (no navigator) and re-render once
// the client hydrates and resolves the real language — no flash for
// English readers, and Portuguese readers see English for one frame
// before the swap, which is the standard trade-off for client-side i18n
// without a per-request cookie.
export function useLang(): {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey) => string;
  tf: (key: TKey, vars: Record<string, string | number>) => string;
} {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LS_KEY) as Lang | null;
      if (stored === "en" || stored === "pt-BR") {
        setLangState(stored);
        return;
      }
    } catch {
      /* localStorage may be unavailable in some browsers/modes */
    }
    setLangState(detectLang());
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LS_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const boundT = useCallback((key: TKey) => t(key, lang), [lang]);
  const boundTf = useCallback(
    (key: TKey, vars: Record<string, string | number>) => tf(key, lang, vars),
    [lang],
  );

  return { lang, setLang, t: boundT, tf: boundTf };
}
