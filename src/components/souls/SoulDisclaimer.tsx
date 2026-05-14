import { AlertTriangle } from "lucide-react";

const DISCLAIMER_TITLE = "Persona fictícia / Fictional persona";

export const SOUL_DISCLAIMER_TEXT =
  "This soul is a fictional, AI-generated persona inspired by publicly available writing, talks, and interviews of a real person. It is NOT the real individual, is not affiliated with, endorsed by, or representative of them, their companies, or any related entity. No private, confidential, or proprietary information is used. All trademarks, names, and likenesses remain the property of their respective owners and are referenced for educational, commentary, and parody purposes under fair use. Outputs may be inaccurate or out of date and must not be relied on as the real person's opinions, advice, or statements. Use at your own risk; you are responsible for how you use generated content.";

export function SoulDisclaimer({ name }: { name?: string }) {
  return (
    <div
      role="note"
      aria-label="Soul disclaimer"
      className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-900 dark:text-amber-200"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0">
          <div className="font-semibold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-300">
            {DISCLAIMER_TITLE}
          </div>
          <p className="mt-1">
            {name ? (
              <>
                <span className="font-medium">{name}</span> is a fictional, AI-generated persona
                inspired by publicly available writing, talks, and interviews. It is{" "}
                <strong>not</strong> the real person and is not affiliated with, endorsed by, or
                representative of them, their companies, or any related entity.
              </>
            ) : (
              <>
                This soul is a fictional, AI-generated persona inspired by publicly available
                content. It is <strong>not</strong> the real person and is not affiliated with or
                endorsed by them.
              </>
            )}{" "}
            No private or proprietary information is used. All trademarks, names, and likenesses
            remain the property of their respective owners and are referenced for educational,
            commentary, and parody purposes under fair use. Outputs may be inaccurate and must not
            be treated as the real person's opinions, advice, or statements. Use at your own risk.
          </p>
        </div>
      </div>
    </div>
  );
}
