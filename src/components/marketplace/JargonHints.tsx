import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { findGlossaryTerms } from "@/lib/marketplace/glossary";

/**
 * Small chips explaining jargon found in a package's name/description
 * (Expo, EAS, OAuth, "Auditor", ...) in one plain sentence each.
 */
export function JargonHints({ text, limit = 3 }: { text: string; limit?: number }) {
  const terms = findGlossaryTerms(text, limit);
  if (terms.length === 0) return null;

  return (
    <TooltipProvider delayDuration={120}>
      <ul className="relative z-10 flex flex-wrap items-center gap-1.5">
        {terms.map((term) => (
          <li key={term.label}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  aria-label={`What is ${term.label}? ${term.plain}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <HelpCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {term.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[16rem] text-xs leading-snug">
                {term.plain}
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}
