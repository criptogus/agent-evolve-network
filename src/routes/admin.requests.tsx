import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listRequests, processRequest, publishRequestPackage } from "@/lib/admin/requests.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/requests")({
  component: RequestsPage,
});

function RequestsPage() {
  const listFn = useServerFn(listRequests);
  const processFn = useServerFn(processRequest);
  const publishFn = useServerFn(publishRequestPackage);
  const qc = useQueryClient();

  const requests = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => listFn(),
    refetchInterval: 5000,
  });

  const pm = useMutation({
    mutationFn: (id: string) => processFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "requests"] }),
  });
  const pubm = useMutation({
    mutationFn: (id: string) => publishFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "requests"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Primitive requests</h1>
        <p className="text-sm text-muted-foreground">
          When a client or their agent asks for a missing skill / playbook / soul / guardrail, it
          lands here. Approve to run the proprietary pipeline: web research → SkillForge author →
          evaluator → draft ready for publish.
        </p>
      </div>

      <div className="space-y-3">
        {(requests.data?.requests ?? []).map((r: any) => (
          <Card key={r.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm capitalize">
                  {r.kind} · {r.industry ?? "general"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant={r.status === "draft_ready" ? "default" : "secondary"}>
                {r.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{r.brief}</p>
              {r.research_summary && (
                <details className="rounded-md border p-2 text-xs">
                  <summary className="cursor-pointer font-medium">Research summary</summary>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {r.research_summary}
                  </p>
                </details>
              )}
              <div className="flex gap-2">
                {(r.status === "new" || r.status === "rejected") && (
                  <Button size="sm" onClick={() => pm.mutate(r.id)} disabled={pm.isPending}>
                    {pm.isPending ? "Researching & drafting…" : "Run pipeline"}
                  </Button>
                )}
                {r.status === "draft_ready" && (
                  <Button size="sm" onClick={() => pubm.mutate(r.id)} disabled={pubm.isPending}>
                    Publish to clients
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!requests.isLoading && (requests.data?.requests.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        )}
      </div>
    </div>
  );
}
