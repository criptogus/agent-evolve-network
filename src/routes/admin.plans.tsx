import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPlansPublic, upsertPlan, deletePlan } from "@/lib/admin/plans.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/plans")({
  component: PlansPage,
});

type PlanRow = {
  id?: string;
  slug: string;
  name: string;
  monthly_runs_limit: number;
  max_installed_packages: number;
  price_cents: number;
  features: string[];
  sort_order: number;
};

const empty: PlanRow = {
  slug: "",
  name: "",
  monthly_runs_limit: 100,
  max_installed_packages: 5,
  price_cents: 0,
  features: [],
  sort_order: 0,
};

function PlansPage() {
  const listFn = useServerFn(listPlansPublic);
  const upsertFn = useServerFn(upsertPlan);
  const deleteFn = useServerFn(deletePlan);
  const qc = useQueryClient();

  const plans = useQuery({ queryKey: ["plans"], queryFn: () => listFn() });
  const [edit, setEdit] = useState<PlanRow | null>(null);

  const save = useMutation({
    mutationFn: (p: PlanRow) => upsertFn({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setEdit(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground">Configure tier limits and pricing.</p>
        </div>
        <Button onClick={() => setEdit({ ...empty })}>New plan</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {(plans.data?.plans ?? []).map((p: any) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.slug}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>{(p.price_cents / 100).toFixed(2)} /mo</div>
              <div className="text-muted-foreground">
                {p.monthly_runs_limit.toLocaleString()} runs · {p.max_installed_packages} pkgs
              </div>
              <ul className="list-disc pl-4 text-xs text-muted-foreground">
                {(p.features ?? []).map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => setEdit({ ...p, features: p.features ?? [] })}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove.mutate(p.id)}
                  disabled={remove.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {edit && (
        <Card>
          <CardHeader>
            <CardTitle>{edit.id ? "Edit plan" : "New plan"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label="Slug">
              <Input value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
            </Field>
            <Field label="Name">
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Monthly runs limit">
              <Input
                type="number"
                value={edit.monthly_runs_limit}
                onChange={(e) => setEdit({ ...edit, monthly_runs_limit: Number(e.target.value) })}
              />
            </Field>
            <Field label="Max installed packages">
              <Input
                type="number"
                value={edit.max_installed_packages}
                onChange={(e) => setEdit({ ...edit, max_installed_packages: Number(e.target.value) })}
              />
            </Field>
            <Field label="Price (cents)">
              <Input
                type="number"
                value={edit.price_cents}
                onChange={(e) => setEdit({ ...edit, price_cents: Number(e.target.value) })}
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={edit.sort_order}
                onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })}
              />
            </Field>
            <div className="md:col-span-2">
              <Label>Features (one per line)</Label>
              <Textarea
                rows={4}
                value={edit.features.join("\n")}
                onChange={(e) =>
                  setEdit({ ...edit, features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
                }
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={() => save.mutate(edit)} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
