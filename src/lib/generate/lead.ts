export const FREE_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "qq.com",
  "163.com",
  "126.com",
  "duck.com",
  "tutanota.com",
  "fastmail.com",
  "hey.com",
]);

export function isBusinessEmail(email: string): { ok: boolean; domain: string; reason?: string } {
  const e = email.trim().toLowerCase();
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(e);
  if (!m) return { ok: false, domain: "", reason: "Enter a valid email address." };
  const domain = m[1];
  if (FREE_PROVIDERS.has(domain))
    return {
      ok: false,
      domain,
      reason: "Please use your work email — free providers aren't accepted.",
    };
  return { ok: true, domain };
}

export interface LeadInput {
  email: string;
  domain: string;
  company: string;
  role: string;
}
