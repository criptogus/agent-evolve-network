import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCrmTimingPlan } from "@/lib/crm/crm.functions";

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

function ConfidenceBadge({ value }: { value: string }) {
  const variant = value === "high" ? "default" : value === "none" ? "outline" : "secondary";
  return (
    <Badge variant={variant} className="text-xs capitalize">
      {value}
    </Badge>
  );
}

/**
 * Shows the send-timing policy the engine derived on its own: which hours it
 * will use per segment, and how far it stretches the cooldown for audiences that
 * engage below average.
 */
export function TimingPanel() {
  const fetchPlan = useServerFn(getCrmTimingPlan);
  const q = useQuery({
    queryKey: ["admin", "crm", "timing"],
    queryFn: () => fetchPlan({ data: { sample: 12 } }),
    staleTime: 60_000,
  });
  const data = q.data as any;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Send timing (learned)</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Timing is derived from measured behaviour, not a fixed schedule: each customer's activity clock
          (product usage plus cloud library syncs and conflict work) picks the hours, and engagement by hour
          inside their segment refines them. Segments that engage below average get a longer cooldown, so the
          engine talks less rather than at a worse hour. Hard caps still apply: at most 2 emails per customer
          per 7 days, never closer than 48 hours.
          {data ? ` Current UTC hour: ${hh(data.now_hour)}.` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {q.isLoading && <p className="text-sm text-muted-foreground">Reading the timing model…</p>}

        {data && (
          <>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Per-segment policy</h4>
              {data.segments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sends measured yet — every hour is allowed and cooldowns stay at their base value.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tool</TableHead>
                      <TableHead>Pattern</TableHead>
                      <TableHead className="text-right">Sends</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                      <TableHead>Best hours (UTC)</TableHead>
                      <TableHead className="text-right">Cooldown</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.segments.map((s: any) => (
                      <TableRow key={s.key}>
                        <TableCell className="font-medium">{s.tool_label}</TableCell>
                        <TableCell>{s.pattern_label}</TableCell>
                        <TableCell className="text-right">{s.sends}</TableCell>
                        <TableCell className="text-right">{s.engagement_rate}%</TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.best_hours.length ? s.best_hours.map(hh).join(" · ") : "any"}
                        </TableCell>
                        <TableCell className="text-right">×{s.cooldown_multiplier}</TableCell>
                        <TableCell>
                          <ConfidenceBadge value={s.confidence} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Live customers</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Usage / sync events</TableHead>
                    <TableHead>Best hours (UTC)</TableHead>
                    <TableHead className="text-right">Cooldown</TableHead>
                    <TableHead>Window</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customers.map((c: any) => (
                    <TableRow key={c.email}>
                      <TableCell className="font-mono text-xs">{c.email}</TableCell>
                      <TableCell className="text-xs">
                        {c.tool_label} · {c.pattern_label}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {c.usage_events} / {c.sync_events}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {c.best_hours.length ? c.best_hours.map(hh).join(" · ") : "any"}
                      </TableCell>
                      <TableCell className="text-right">×{c.cooldown_multiplier}</TableCell>
                      <TableCell className="text-xs">
                        {c.open_now ? (
                          <Badge variant="default" className="text-xs">
                            open now
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">in {c.hours_until_window}h</span>
                        )}{" "}
                        <ConfidenceBadge value={c.confidence} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
