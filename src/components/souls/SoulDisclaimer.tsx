import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SOUL_DISCLAIMER_TEXT, SOUL_DISCLAIMER_SHORT } from "@/lib/souls/disclaimer";

export { SOUL_DISCLAIMER_TEXT, SOUL_DISCLAIMER_SHORT };

export function SoulDisclaimerBadge({
  name,
  className = "",
  onClick,
}: {
  name?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="note"
            aria-label="Fictional AI persona disclaimer"
            onClick={(e) => {
              // Prevent parent <Link> navigation when used inside a card
              e.stopPropagation();
              onClick?.(e);
            }}
            className={`inline-flex cursor-help items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300 ${className}`}
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Fictional persona
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          <p className="font-semibold">{name ? `${name} — Fictional AI persona` : "Fictional AI persona"}</p>
          <p className="mt-1">{SOUL_DISCLAIMER_TEXT}</p>
          <p className="mt-2">
            <Link to="/legal/disclaimers" className="underline">
              Read full Legal &amp; Disclaimers →
            </Link>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const DISCLAIMER_TITLE = "Persona fictícia / Fictional persona";


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
          <p className="mt-2">
            <Link
              to="/legal/disclaimers"
              className="font-medium underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-200"
            >
              Read full Legal &amp; Disclaimers →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
