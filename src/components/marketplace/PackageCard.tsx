import { Link } from "@tanstack/react-router";
import { BookOpen, Bot, ShieldCheck, Sparkles, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MarketplaceItem } from "@/lib/marketplace/list.functions";
import { trustTier, TRUST_TIER_LABELS, type TrustTier } from "@/lib/marketplace/trust-tiers";
import { BuyButton, PriceBadge } from "@/components/marketplace/BuyButton";
import { ShareOnXButton } from "@/components/share/ShareOnXButton";
import { SoulDisclaimerBadge } from "@/components/souls/SoulDisclaimer";
import { AuthorLink } from "@/components/marketplace/AuthorLink";
import { Stars } from "@/components/reviews/Stars";

const TYPE_ICON: Record<MarketplaceItem["type"], LucideIcon> = {
  skill: Sparkles,
  playbook: BookOpen,
  soul: User,
  guardrail: ShieldCheck,
};

const TYPE_TONE: Record<MarketplaceItem["type"], string> = {
  skill: "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  playbook: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  soul: "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  guardrail: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const TIER_TONE: Record<TrustTier, string> = {
  verified: "text-emerald-600 dark:text-emerald-400",
  high: "text-sky-600 dark:text-sky-400",
  baseline: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
  unscored: "text-muted-foreground",
};

/** A stat row with a dotted leader line between label and value (directory style). */
function StatRow({
  icon: Icon,
  label,
  children,
  title,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs" title={title}>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <span aria-hidden className="mt-1 flex-1 border-b border-dashed border-border" />
      <span className="shrink-0 font-mono text-[11px] text-foreground">{children}</span>
    </div>
  );
}

export function PackageCard({ p }: { p: MarketplaceItem }) {
  const tier = trustTier(p.trust_score, p.trust_verified);
  const Icon = TYPE_ICON[p.type];
  const linkProps =
    p.type === "soul"
      ? ({ to: "/souls/$slug", params: { slug: p.slug } } as const)
      : ({ to: "/marketplace/$packageId", params: { packageId: p.slug } } as const);

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-colors focus-within:border-primary/40 hover:border-primary/40 hover:shadow-elevated">
      {/* Title row: icon tile + name + type */}
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${TYPE_TONE[p.type]}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-tight tracking-tight">
            {/* Stretched link covers the card; interactive siblings sit above via z-10 */}
            <Link {...linkProps} className="after:absolute after:inset-0 after:content-['']">
              {p.name}
            </Link>
          </h3>
          <div className="relative z-10 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-mono uppercase tracking-wider">{p.type}</span>
            <span aria-hidden>·</span>
            <AuthorLink handle={p.author_handle} verified={p.author_verified} />
          </div>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1.5">
          {p.type !== "soul" && <PriceBadge priceCredits={p.price_credits} />}
          <ShareOnXButton
            slug={p.slug}
            type={p.type}
            name={p.name}
            description={p.description}
            url={p.type === "soul" ? `/souls/${p.slug}` : `/marketplace/${p.slug}`}
            variant="icon"
          />
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>

      {p.type === "soul" && (
        <div className="relative z-10 mt-2">
          <SoulDisclaimerBadge name={p.name} />
        </div>
      )}

      {/* Stat block with leader lines */}
      <div className="mt-4 space-y-1.5 border-t border-border pt-4">
        <StatRow
          icon={ShieldCheck}
          label="Trust"
          title={
            p.trust_score != null
              ? `Trust score ${(p.trust_score * 100).toFixed(0)}/100`
              : "No trust score yet — not adversarially tested"
          }
        >
          <span className={TIER_TONE[tier]}>
            {p.trust_score != null
              ? `${(p.trust_score * 100).toFixed(0)}/100 · ${TRUST_TIER_LABELS[tier]}`
              : TRUST_TIER_LABELS[tier]}
          </span>
        </StatRow>
        <StatRow icon={Bot} label="Installs">
          {p.install_count.toLocaleString("en-US")}
        </StatRow>
        <StatRow icon={Sparkles} label="Rating">
          {p.rating_count > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Stars value={p.rating_avg} size={11} />
              {p.rating_avg.toFixed(1)} ({p.rating_count})
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </StatRow>
        <StatRow icon={BookOpen} label="Version">
          v{p.latest_version}
        </StatRow>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <div
          aria-hidden
          className="pointer-events-none inline-flex h-9 flex-1 items-center justify-center rounded-md border border-border bg-surface text-sm font-medium transition-colors group-hover:border-primary/40 group-hover:text-primary"
        >
          {p.type === "soul" ? "View soul" : "View package"}
        </div>
        {p.type !== "soul" && p.price_credits > 0 && (
          <div className="relative z-10">
            <BuyButton packageId={p.id} priceCredits={p.price_credits} />
          </div>
        )}
      </div>

      {p.vertical && (
        <span className="pointer-events-none absolute right-4 top-16 hidden text-[10px] uppercase tracking-wider text-muted-foreground/70 xl:block">
          {p.vertical}
        </span>
      )}
    </div>
  );
}
