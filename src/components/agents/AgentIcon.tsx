import {
  Bot,
  Building2,
  Compass,
  Dna,
  Gauge,
  Handshake,
  LineChart,
  Mail,
  Megaphone,
  Search,
  Share2,
  Terminal,
  Linkedin,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  ceo: Compass,
  coo: Gauge,
  cto: Terminal,
  cmo: Megaphone,
  "hr-director": Handshake,
  "agent-architect": Dna,
  "corporate-finance": LineChart,
  "board-advisor": Building2,
  "google-ads": Search,
  "meta-ads": Share2,
  "newsletter-writer": Mail,
  "linkedin-writer": Linkedin,
  "x-writer": Twitter,
};

const SIZES = {
  sm: { box: "h-9 w-9 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-11 w-11 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7" },
} as const;

/**
 * Monochrome, design-system-native icon for an agent. Replaces emoji so the
 * catalog reads as a product surface instead of a chat message.
 */
export function AgentIcon({
  slug,
  size = "md",
  className,
}: {
  slug?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = (slug && ICONS[slug]) || Bot;
  const s = SIZES[size];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center border border-border bg-primary/8 text-primary",
        s.box,
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={s.icon} strokeWidth={1.75} />
    </span>
  );
}
