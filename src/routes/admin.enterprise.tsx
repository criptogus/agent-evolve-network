import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listEnterpriseRequests } from "@/lib/enterprise/requests.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/enterprise")({
  component: AdminEnterprisePage,
});

function AdminEnterprisePage() {
  const listFn = useServerFn(listEnterpriseRequests);
  const q = useQuery({
    queryKey: ["admin", "enterprise-requests"],
    queryFn: () => listFn(),
    refetchInterval: 30000,
  });

  const rows = q.data?.requests ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enterprise requests (NDA)</h1>
        <p className="text-sm text-muted-foreground">
          Intake from /enterprise/request. Each row records NDA acceptance and the IP requirements
          the prospect asked us to commit to in writing.
        </p>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!q.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No requests yet.</p>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const checklist = (r.checklist ?? {}) as Record<string, boolean>;
          const selected = Object.entries(checklist)
            .filter(([, v]) => v)
            .map(([k]) => k);
          return (
            <Card key={r.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm">
                    {r.company} · {r.contact_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {r.work_email}
                    {r.role ? ` · ${r.role}` : ""}
                    {r.team_size ? ` · ${r.team_size}` : ""} ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={r.status === "new" ? "default" : "secondary"}>{r.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap">{r.use_case}</p>
                {r.ip_concerns && (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    <span className="font-medium text-foreground">Constraints: </span>
                    {r.ip_concerns}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((k) => (
                    <Badge key={k} variant="outline" className="font-mono text-[10px]">
                      {k}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  NDA accepted by {r.nda_signer_name ?? "—"}
                  {r.nda_accepted_at
                    ? ` at ${new Date(r.nda_accepted_at).toLocaleString()}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
