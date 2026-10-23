import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAccounts, setUserRole, setUserPlan } from "@/lib/admin/accounts.functions";
import { listPlansPublic } from "@/lib/admin/plans.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const list = useServerFn(listAccounts);
  const plansFn = useServerFn(listPlansPublic);
  const setRole = useServerFn(setUserRole);
  const setPlan = useServerFn(setUserPlan);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const accounts = useQuery({
    queryKey: ["admin", "accounts", search],
    queryFn: () => list({ data: { search: search || undefined } }),
  });
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => plansFn() });

  const roleM = useMutation({
    mutationFn: (input: { userId: string; role: "admin" | "publisher" | "user"; grant: boolean }) =>
      setRole({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "accounts"] }),
  });
  const planM = useMutation({
    mutationFn: (input: { userId: string; planId: string }) => setPlan({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "accounts"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">Promote, demote, and assign plans.</p>
        </div>
        <Input
          placeholder="Search by handle or display name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Users ({accounts.data?.accounts.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Roles</th>
                <th className="px-4 py-2 text-left">Plan</th>
                <th className="px-4 py-2 text-left">Runs</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(accounts.data?.accounts ?? []).map((a: any) => {
                const isAdmin = a.roles.includes("admin");
                return (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.display_name || a.handle || a.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{a.handle}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">user</span>
                        ) : (
                          a.roles.map((r: string) => (
                            <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={a.plan?.id ?? ""}
                        onValueChange={(planId) => planM.mutate({ userId: a.id, planId })}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue placeholder="Set plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {(plans.data?.plans ?? []).map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.runCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={isAdmin ? "secondary" : "default"}
                        onClick={() =>
                          roleM.mutate({ userId: a.id, role: "admin", grant: !isAdmin })
                        }
                        disabled={roleM.isPending}
                      >
                        {isAdmin ? "Revoke admin" : "Make admin"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {accounts.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!accounts.isLoading && (accounts.data?.accounts.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
