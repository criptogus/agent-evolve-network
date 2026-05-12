// Browser-only helpers for capturing & retrieving the referral code.
const COOKIE = "sas_ref";
const STORAGE = "sas_ref";
const TTL_DAYS = 90;

function setCookie(value: string) {
  const d = new Date();
  d.setTime(d.getTime() + TTL_DAYS * 86400 * 1000);
  // SameSite=Lax so it survives top-level navigations from external links
  document.cookie = `${COOKIE}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

function getCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function captureRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(window.location.href);
    const code = u.searchParams.get("ref");
    if (code && /^[A-Z0-9]{4,16}$/i.test(code)) {
      const norm = code.toUpperCase();
      // don't overwrite an existing capture (first-touch attribution)
      if (!getStoredRef()) {
        setCookie(norm);
        try { localStorage.setItem(STORAGE, norm); } catch {}
      }
      return norm;
    }
  } catch {}
  return null;
}

export function getStoredRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = localStorage.getItem(STORAGE);
    if (ls) return ls;
  } catch {}
  return getCookie();
}

export function clearStoredRef() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(STORAGE); } catch {}
  document.cookie = `${COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/** Append ?ref=CODE to a URL (absolute or relative). */
export function withRef(url: string, code: string | null | undefined): string {
  if (!code) return url;
  try {
    const isAbs = /^https?:\/\//i.test(url);
    const u = new URL(url, isAbs ? undefined : "https://x.local");
    u.searchParams.set("ref", code);
    if (isAbs) return u.toString();
    return u.pathname + u.search + u.hash;
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}ref=${encodeURIComponent(code)}`;
  }
}
