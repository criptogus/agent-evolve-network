import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getCreditSummary } from "@/lib/credits/credits.functions";

export function CreditsPill() {
  const { user } = useAuth();
  const fetchFn = useServerFn(getCreditSummary);
  const { data } = useQuery({
    queryKey: ["credits-pill"],
    queryFn: () => fetchFn(),
    enabled: !!user,
    staleTime: 30_000,
  });
  if (!user) return null;
  const balance = data?.balance ?? 0;
  return (
    <Link
      to="/account/credits"
      className="hidden h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:inline-flex"
      title="Your credit balance"
    >
      <span aria-hidden className="text-primary">◆</span>
      <span className="tabular-nums">{balance.toLocaleString()}</span>
      <span className="hidden lg:inline text-[10px] uppercase tracking-wider opacity-70">credits</span>
    </Link>
  );
}
