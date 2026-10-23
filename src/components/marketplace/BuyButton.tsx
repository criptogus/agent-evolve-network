import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { purchasePackage } from "@/lib/credits/credits.functions";

export function BuyButton({
  packageId,
  priceCredits,
  className = "",
  size = "md",
}: {
  packageId: string;
  priceCredits: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const buy = useServerFn(purchasePackage);
  const [loading, setLoading] = useState(false);

  if (priceCredits <= 0) return null;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate({ to: "/login", search: { next: window.location.pathname } });
      return;
    }
    if (!confirm(`Buy this package for ${priceCredits} credits?`)) return;
    setLoading(true);
    try {
      const res = await buy({ data: { package_id: packageId } });
      toast.success(`Purchased! New balance: ${res.new_balance.toLocaleString()} credits`);
      qc.invalidateQueries({ queryKey: ["credits-summary"] });
      qc.invalidateQueries({ queryKey: ["credits-pill"] });
      qc.invalidateQueries({ queryKey: ["my-purchases"] });
    } catch (err: any) {
      const msg = err?.message || (await err?.text?.()) || "Purchase failed";
      toast.error(typeof msg === "string" ? msg : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  const padding = size === "sm" ? "h-7 px-2 text-xs" : "h-9 px-3 text-sm";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-md bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60 ${padding} ${className}`}
    >
      <span aria-hidden>◆</span>
      {loading ? "Buying…" : `Buy · ${priceCredits.toLocaleString()}`}
    </button>
  );
}

export function PriceBadge({ priceCredits }: { priceCredits: number }) {
  if (priceCredits <= 0) {
    return (
      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        Free
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
      <span aria-hidden>◆</span>
      {priceCredits.toLocaleString()} cr
    </span>
  );
}
