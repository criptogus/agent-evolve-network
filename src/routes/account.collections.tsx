import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SitePage } from "@/components/site/SitePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  listMyCollections,
  listFollowedCollections,
  manageCollection,
} from "@/lib/collections/collections.functions";
import type { CollectionActionInput } from "@/lib/collections/contract";
export const Route = createFileRoute("/account/collections")({
  head: () => ({ meta: [{ title: "My collections — Super Agent Skill" }] }),
  component: Collections,
});
const empty = {
  id: undefined as string | undefined,
  slug: "",
  title: "",
  description: "",
  is_public: false,
  packages: "",
};
function Collections() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const list = useServerFn(listMyCollections);
  const followedList = useServerFn(listFollowedCollections);
  const manage = useServerFn(manageCollection);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["my-collections", user?.id],
    queryFn: () => list(),
    enabled: !!user,
  });
  const followed = useQuery({
    queryKey: ["followed-collections", user?.id],
    queryFn: () => followedList(),
    enabled: !!user,
  });
  const mutation = useMutation({
    mutationFn: (data: CollectionActionInput) => manage({ data }),
    onSuccess: (_, variables) => {
      if (variables.action !== "follow") setForm(empty);
      setDeleting(null);
      void cache.invalidateQueries({ queryKey: ["my-collections"] });
      void cache.invalidateQueries({ queryKey: ["followed-collections"] });
    },
  });
  if (!user)
    return (
      <SitePage>
        <main className="mx-auto max-w-3xl p-6">
          <h1 className="text-3xl font-semibold">My collections</h1>
          <Link to="/login">Sign in to curate collections</Link>
        </main>
      </SitePage>
    );
  return (
    <SitePage>
      <main className="mx-auto max-w-3xl space-y-8 p-6">
        <h1 className="text-3xl font-semibold">My collections</h1>
        <p className="text-muted-foreground">
          Organize approved public packages. New collections stay private until you choose to share
          them.
        </p>
        {query.isError && <p role="alert">Could not load collections.</p>}
        {query.isLoading && <p role="status">Loading collections…</p>}
        <ul className="space-y-4">
          {query.data?.map((c) => (
            <li key={c.id} className="rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold">
                {c.title} · {c.is_public ? "Public" : "Private"}
              </h2>
              <p>
                {c.packages.length} {c.packages.length === 1 ? "package" : "packages"}
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...c,
                      description: c.description ?? "",
                      packages: c.packages.join("\n"),
                    })
                  }
                >
                  Edit
                </Button>
                {c.is_public && (
                  <Link to="/collections/$slug" params={{ slug: c.slug }}>
                    Open public page
                  </Link>
                )}
                <Button variant="outline" onClick={() => setDeleting(c.id)}>
                  Delete
                </Button>
              </div>
              {deleting === c.id && (
                <div role="alert">
                  <p>Delete this collection? Packages remain in the registry.</p>
                  <Button
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ action: "delete", id: c.id })}
                  >
                    Confirm deletion
                  </Button>
                  <Button variant="outline" onClick={() => setDeleting(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Following</h2>
          {followed.isError && <p role="alert">Could not load followed collections.</p>}
          {followed.data?.map((item) => (
            <div key={item.id} className="rounded-xl border p-4 flex justify-between gap-4">
              {item.collection ? (
                <Link to="/collections/$slug" params={{ slug: item.collection.slug }}>
                  {item.collection.title}
                </Link>
              ) : (
                <span>Collection no longer public</span>
              )}
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ action: "follow", id: item.id, follow: false })}
              >
                Unfollow
              </Button>
            </div>
          ))}
          {followed.data?.length === 0 && (
            <p className="text-muted-foreground">You are not following any collections yet.</p>
          )}
          <Link to="/collections" search={{ page: 0 }}>
            Browse community collections
          </Link>
        </section>
        <form
          className="space-y-4 rounded-xl border p-5"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({
              action: "save",
              ...form,
              packages: form.packages.split(/\s+/).filter(Boolean),
            });
          }}
        >
          <h2 className="text-xl font-semibold">
            {form.id ? "Edit collection" : "New collection"}
          </h2>
          <label className="block">
            Title
            <Input
              required
              minLength={2}
              maxLength={120}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block">
            URL slug
            <Input
              required
              pattern="[a-z0-9][a-z0-9-]{1,63}"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </label>
          <label className="block">
            Description
            <Textarea
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="block">
            Package slugs, in order
            <Textarea
              value={form.packages}
              onChange={(e) => setForm({ ...form, packages: e.target.value })}
              placeholder="code-reviewer"
            />
          </label>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
            />
            Make this collection public
          </label>
          {mutation.isError && <p role="alert">{mutation.error.message}</p>}
          <Button disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Saving…" : "Save collection"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setForm(empty)}>
            Clear
          </Button>
        </form>
      </main>
    </SitePage>
  );
}
