import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SitePage } from "@/components/site/SitePage";
import {
  listMyAuthoredPackages,
  setMyPackagePublished,
} from "@/lib/account/packages.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account/packages")({
  head: () => ({
    meta: [
      { title: "My packages — Super Agent Skill" },
      {
        name: "description",
        content:
          "Manage your private skill drafts. Publish to the marketplace only with explicit confirmation.",
      },
    ],
  }),
  component: AccountPackagesPage,
});

type Pkg = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  latest_version: string;
  is_published: boolean;
  review_status: string;
  price_credits: number;
  install_count: number;
  created_at: string;
};

function AccountPackagesPage() {
  const list = useServerFn(listMyAuthoredPackages);
  const setPub = useServerFn(setMyPackagePublished);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["account", "my-packages"], queryFn: () => list() });

  const [target, setTarget] = useState<Pkg | null>(null);
  const [phrase, setPhrase] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [acknowledged, setAcknowledged] = useState(false);

  const closeDialog = () => {
    setTarget(null);
    setPhrase("");
    setPrice("0");
    setAcknowledged(false);
  };

  const pubMut = useMutation({
    mutationFn: (input: {
      id: string;
      publish: boolean;
      confirm_phrase?: string;
      price_credits?: number;
    }) => setPub({ data: input }),
    onSuccess: (r) => {
      toast.success(r.is_published ? "Listed on the marketplace." : "Reverted to private draft.");
      qc.invalidateQueries({ queryKey: ["account", "my-packages"] });
      closeDialog();
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  const expectedPhrase = target ? `PUBLISH ${target.name}` : "";
  const phraseMatches = phrase.trim() === expectedPhrase;
  const priceNum = Number(price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 0 && priceNum <= 100000;
  const canConfirmPublish = phraseMatches && acknowledged && priceValid;

  return (
    <SitePage>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Account</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">My packages</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Everything you upload — via the site, the CLI, or an MCP agent — lands here as a{" "}
          <strong>private draft</strong>. Drafts are invisible to other users. To list a skill on
          the public marketplace you must publish it explicitly from this page.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-surface">
          <div className="border-b border-border/60 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Your skills
          </div>
          {q.isLoading && <div className="p-5 text-sm text-muted-foreground">Loading…</div>}
          {q.isError && (
            <div className="p-5 text-sm">
              <span className="text-destructive">Sign in to manage your packages.</span>{" "}
              <Link to="/login" className="text-primary">Sign in →</Link>
            </div>
          )}
          {q.data && q.data.packages.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">
              No packages yet. Upload via{" "}
              <Link to="/upload" className="text-primary hover:underline">/upload</Link> or your MCP
              agent.
            </div>
          )}
          {q.data && q.data.packages.length > 0 && (
            <ul className="divide-y divide-border/60">
              {(q.data.packages as Pkg[]).map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge variant="secondary">{p.type}</Badge>
                      {p.is_published ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400">
                          Public · marketplace
                        </Badge>
                      ) : (
                        <Badge variant="outline">Private draft</Badge>
                      )}
                      {p.is_published && p.price_credits > 0 && (
                        <Badge variant="outline">{p.price_credits} credits</Badge>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {p.slug} · v{p.latest_version}
                    </div>
                    {p.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {p.is_published ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pubMut.isPending}
                        onClick={() =>
                          pubMut.mutate({ id: p.id, publish: false })
                        }
                      >
                        Unpublish
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setTarget(p);
                          setPrice(String(p.price_credits ?? 0));
                        }}
                      >
                        Publish to marketplace…
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Tip: publishing requires typing a confirmation phrase. Agents (Claude, Cursor, Codex…)
          cannot list a skill publicly through MCP — only you, from this page, can.
        </p>
      </main>

      <Dialog open={!!target} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish to the marketplace?</DialogTitle>
            <DialogDescription>
              This will make <strong>{target?.name}</strong> visible to every user on the public
              marketplace, search, leaderboards, and trust feeds. You can unpublish at any time,
              but downloads and execution reports collected while public are kept.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price in credits (0 = free)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                max={100000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1"
              />
              <span className="text-muted-foreground">
                I understand this skill will be public on the marketplace and accept the{" "}
                <Link to="/terms" className="text-primary hover:underline">terms</Link>.
              </span>
            </label>

            <div className="space-y-2">
              <Label htmlFor="phrase">
                Type{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  {expectedPhrase}
                </code>{" "}
                to confirm
              </Label>
              <Input
                id="phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={expectedPhrase}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={pubMut.isPending}>
              Cancel
            </Button>
            <Button
              disabled={!canConfirmPublish || pubMut.isPending || !target}
              onClick={() => {
                if (!target) return;
                pubMut.mutate({
                  id: target.id,
                  publish: true,
                  confirm_phrase: phrase.trim(),
                  price_credits: priceNum,
                });
              }}
            >
              {pubMut.isPending ? "Publishing…" : "Publish to marketplace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SitePage>
  );
}
