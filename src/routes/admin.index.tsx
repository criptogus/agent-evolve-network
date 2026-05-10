import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const counts = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: async () => {
      const [users, packages, runs, leads, plans, requests, imports] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("packages").select("id", { count: "exact", head: true }),
        supabase.from("runs").select("id", { count: "exact", head: true }),
        supabase.from("report_leads").select("id", { count: "exact", head: true }),
        supabase.from("plans").select("id", { count: "exact", head: true }),
        supabase.from("package_requests").select("id", { count: "exact", head: true }),
        supabase.from("package_imports").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count ?? 0,
        packages: packages.count ?? 0,
        runs: runs.count ?? 0,
        leads: leads.count ?? 0,
        plans: plans.count ?? 0,
        requests: requests.count ?? 0,
        imports: imports.count ?? 0,
      };
    },
  });

  const stats = counts.data ?? { users: 0, packages: 0, runs: 0, leads: 0, plans: 0, requests: 0, imports: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Control panel</h1>
        <p className="text-sm text-muted-foreground">
          Overview of accounts, packages, runs and the open primitive request queue.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={stats.users} />
        <Stat label="Packages" value={stats.packages} />
        <Stat label="Runs (lifetime)" value={stats.runs} />
        <Stat label="Plans" value={stats.plans} />
        <Stat label="Open requests" value={stats.requests} accent />
        <Stat label="Imports" value={stats.imports} />
        <Stat label="Leads" value={stats.leads} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/40" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
