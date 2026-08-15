import { Fragment, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCrmSegmentPerformance } from "@/lib/crm/crm.functions";

const WINDOWS = [30, 90, 120] as const;

function SegmentTable({
  rows,
  dimensionLabel,
  expanded,
  onToggle,
}: {
  rows: any[];
  dimensionLabel: string;
  expanded: string | null;
  onToggle: (key: string) => void;
}) {
  if (!rows.length) {
    return (
      <p className="px-1 py-3 text-sm text-muted-foreground">
        No sends recorded for this window yet. Results appear here as soon as personalized messages go out.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{dimensionLabel}</TableHead>
          <TableHead className="text-right">Sent</TableHead>
          <TableHead className="text-right">Open</TableHead>
          <TableHead className="text-right">Click</TableHead>
          <TableHead className="text-right">Conversion</TableHead>
          <TableHead>Winning copy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((g) => (
          <Fragment key={g.key}>
            <TableRow
              className="cursor-pointer"
              onClick={() => onToggle(g.key)}
            >
              <TableCell className="font-medium">{g.label}</TableCell>
              <TableCell className="text-right">{g.sent}</TableCell>
              <TableCell className="text-right">{g.open_rate}%</TableCell>
              <TableCell className="text-right">{g.click_rate}%</TableCell>
              <TableCell className="text-right font-medium">{g.conversion_rate}%</TableCell>
              <TableCell className="space-x-2">
                {g.leader ? (
                  <Badge variant="secondary" className="text-xs">
                    {g.leader.trigger}/{g.leader.variant} · {g.leader.rate}%
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">no data</span>
                )}
                <span className="text-xs text-muted-foreground">{g.significance}</span>
              </TableCell>
            </TableRow>
            {expanded === g.key && (
              <TableRow>
                <TableCell colSpan={6} className="bg-muted/30">
                  <div className="space-y-1">
                    {g.variants.map((v: any) => (
                      <div
                        key={`${v.trigger}-${v.variant}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-mono">
                          {v.trigger}/{v.variant}
                        </span>
                        <span className="text-muted-foreground">
                          {v.trigger_label} · {v.variant_label}
                        </span>
                        <span>
                          {v.sent} sent · {v.opened} opened · {v.clicked} clicked ·{" "}
                          <strong>{v.conversion_rate}% converted</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * A/B results for the personalized upsell copy, split by the two dimensions the
 * copy is tailored on: the agent tool the customer connects with and how they
 * use the product. The bandit draws variants inside these same segments.
 */
export function SegmentPerformancePanel() {
  const fetchSegments = useServerFn(getCrmSegmentPerformance);
  const [days, setDays] = useState<number>(120);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [openPattern, setOpenPattern] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "crm", "segments", days],
    queryFn: () => fetchSegments({ data: { days } }),
    staleTime: 60_000,
  });

  const data = q.data as any;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Copy experiment by tool and usage pattern</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Every send records which agent tool and usage pattern the copy was personalized for, so each
            variant is measured inside its own audience. Segments with little volume borrow from the global
            result until they have enough sends
            {data ? ` (${data.min_samples}+ per variant)` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <Button
              key={w}
              size="sm"
              variant={days === w ? "default" : "outline"}
              onClick={() => setDays(w)}
            >
              {w}d
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading experiment results…</p>}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Sent", value: data.totals.sent },
                { label: "Opened", value: data.totals.opened },
                { label: "Clicked", value: data.totals.clicked },
                { label: "Converted", value: `${data.totals.converted} (${data.totals.conversion_rate}%)` },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border border-border/60 bg-card/40 p-3">
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-lg font-semibold">{k.value}</div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">By agent tool</h4>
              <SegmentTable
                rows={data.by_tool}
                dimensionLabel="Tool"
                expanded={openTool}
                onToggle={(k) => setOpenTool(openTool === k ? null : k)}
              />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">By usage pattern</h4>
              <SegmentTable
                rows={data.by_pattern}
                dimensionLabel="Usage pattern"
                expanded={openPattern}
                onToggle={(k) => setOpenPattern(openPattern === k ? null : k)}
              />
            </div>

            {data.matrix.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Tool × pattern cells</h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.matrix.map((c: any) => (
                    <div
                      key={`${c.tool}-${c.pattern}`}
                      className="rounded-md border border-border/60 bg-background/60 p-3 text-xs"
                    >
                      <div className="font-medium">{c.tool_label}</div>
                      <div className="text-muted-foreground">{c.pattern_label}</div>
                      <div className="mt-1">
                        {c.sent} sent · {c.converted} converted ·{" "}
                        <strong>{c.conversion_rate}%</strong>
                      </div>
                      <div className="text-muted-foreground">
                        Leading copy: {c.leader_variant ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
