import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { getMyValueSummary } from "@/lib/crm/crm.functions";
import { useAuth } from "@/hooks/use-auth";

/**
 * "Your value so far" — the in-app mirror of the CRM value email, so the
 * dashboard, the emails and the MCP session all quote the same numbers.
 */
export function ValueSoFarCard() {
  const { user } = useAuth();
  const fetchSummary = useServerFn(getMyValueSummary);
  const { data } = useQuery({
    queryKey: ["my-value-summary", user?.id ?? "anon"],
    queryFn: async () => {
      try {
        return await fetchSummary();
      } catch {
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: false,
    throwOnError: false,
  });

  if (!data) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 pt-10">
      <div className="rounded-2xl border border-border bg-surface/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Your value so far
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-foreground">{data.headline}</p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {data.stage_label}
          </span>
        </div>

        {data.metrics.length > 0 && (
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-border bg-background p-4">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </dt>
                <dd className="mt-1 text-xl font-semibold text-foreground">{m.value}</dd>
                {m.note ? (
                  <dd className="mt-1 text-xs text-muted-foreground">{m.note}</dd>
                ) : null}
              </div>
            ))}
          </dl>
        )}

        {data.next.length > 0 && (
          <div className="mt-5">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Highest-value next steps
            </h3>
            <ul className="mt-3 grid gap-2 md:grid-cols-3">
              {data.next.map((o) => (
                <li key={o.id}>
                  <Link
                    to={o.href}
                    className="group flex h-full flex-col justify-between rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/50"
                  >
                    <span className="text-sm font-medium text-foreground">{o.title}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{o.why}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      {o.cta}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">{data.disclaimer}</p>
      </div>
    </section>
  );
}
