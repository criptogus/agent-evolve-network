import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllPackages, setPackagePublished, deletePackage } from "@/lib/admin/packages.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/packages")({
  component: PackagesPage,
});

function PackagesPage() {
  const listFn = useServerFn(listAllPackages);
  const setPub = useServerFn(setPackagePublished);
  const del = useServerFn(deletePackage);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<string>("");

  const pkgs = useQuery({
    queryKey: ["admin", "packages", search, kind],
    queryFn: () => listFn({ data: { search: search || undefined, kind: kind || undefined } }),
  });

  const pubM = useMutation({
    mutationFn: (input: { id: string; published: boolean }) => setPub({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "packages"] }),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "packages"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
          <p className="text-sm text-muted-foreground">All registry items across authors.</p>
        </div>
        <div className="flex items-end gap-2">
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={kind || "all"} onValueChange={(v) => setKind(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="skill">Skill</SelectItem>
              <SelectItem value="playbook">Playbook</SelectItem>
              <SelectItem value="soul">Soul</SelectItem>
              <SelectItem value="guardrail">Guardrail</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Registry ({pkgs.data?.packages.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-left">Installs</th>
                <th className="px-4 py-2 text-left">Published</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(pkgs.data?.packages ?? []).map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.slug} · v{p.latest_version}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{p.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.source_kind ?? "native"}
                    {p.source_ref ? ` · ${p.source_ref.slice(0, 40)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.install_count}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={p.is_published}
                      onCheckedChange={(checked) => pubM.mutate({ id: p.id, published: checked })}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete ${p.name}?`)) delM.mutate(p.id);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {pkgs.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Loading…
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
