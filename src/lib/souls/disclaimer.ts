export const SOUL_DISCLAIMER_TEXT =
  "This soul is a fictional, AI-generated persona inspired by publicly available writing, talks, and interviews of a real person. It is NOT the real individual, is not affiliated with, endorsed by, or representative of them, their companies, or any related entity. No private, confidential, or proprietary information is used. All trademarks, names, and likenesses remain the property of their respective owners and are referenced for educational, commentary, and parody purposes under fair use. Outputs may be inaccurate or out of date and must not be relied on as the real person's opinions, advice, or statements. Use at your own risk; you are responsible for how you use generated content.";

export const SOUL_DISCLAIMER_SHORT = "Fictional AI persona — not the real person.";

export const SOUL_DISCLAIMER = {
  text: SOUL_DISCLAIMER_TEXT,
  short: SOUL_DISCLAIMER_SHORT,
  title: "Fictional AI persona",
  is_real_person: false,
  endorsed_by_real_person: false,
  fair_use: "educational, commentary, and parody",
} as const;
